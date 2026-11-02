'use strict';
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { normalizePhone, tidyName, isoDate, EMAIL_RE } = require('./util');

function cellText(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v;
  if (typeof v === 'object') {
    if (v.text) return String(v.text);
    if (v.result !== undefined) return cellText(v.result);
    if (v.richText) return v.richText.map(r => r.text).join('');
    if (v.hyperlink) return String(v.hyperlink).replace(/^mailto:/, '');
  }
  return String(v);
}

function parseBirth(v) {
  if (v instanceof Date) return isoDate(v);
  const s = String(v || '').trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

const COLS = [
  ['submitted', /carimbo|data\/hora|timestamp/i],
  ['name', /nome completo do estudante|^nome/i],
  ['prize', /premia/i],
  ['school', /escola/i],
  ['email', /e-?mail/i],
  ['phone', /whats|telefone|celular/i],
  ['birth', /nascimento/i],
  ['city', /munic|cidade/i],
  ['uf', /estado|^uf/i],
];

// Lê a planilha da inscrição e devolve participantes limpos, sem duplicados (vale o envio mais recente).
async function readSheet(file) {
  const wb = new ExcelJS.Workbook();
  if (Buffer.isBuffer(file)) await wb.xlsx.load(file); else await wb.xlsx.readFile(file);
  const ws = wb.worksheets[0];
  const header = ws.getRow(1).values.map(v => String(cellText(v) || ''));
  const idx = {};
  for (const [key, re] of COLS) {
    const i = header.findIndex((h, j) => j > 0 && re.test(h) && !Object.values(idx).includes(j));
    if (i > 0) idx[key] = i;
  }
  const byEmail = new Map();
  const issues = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const get = k => (idx[k] ? cellText(row.getCell(idx[k]).value) : '');
    const email = String(get('email')).trim().toLowerCase();
    if (!email) return;
    const rawPhone = String(get('phone')).trim();
    const p = {
      email,
      name: tidyName(get('name')),
      prize: String(get('prize')).trim(),
      school: String(get('school')).trim(),
      phone: normalizePhone(rawPhone),
      birth_date: parseBirth(get('birth')),
      city: String(get('city')).trim().replace(/\s+/g, ' '),
      uf: String(get('uf')).trim().toUpperCase(),
      sheet_submitted_at: String(get('submitted')).trim(),
    };
    p.original = { ...p, name: String(get('name')).trim(), phone_raw: rawPhone, linha: n };
    if (byEmail.has(email)) issues.push(`Inscrição repetida de ${p.name}: vale a mais recente (linha ${n}).`);
    if (!EMAIL_RE.test(email)) issues.push(`E-mail com formato inválido: ${email} (linha ${n}).`);
    byEmail.set(email, p);
  });
  for (const p of byEmail.values()) {
    if (!/^\d{10,11}$/.test(p.phone)) issues.push(`Telefone inválido para ${p.name}: "${p.original.phone_raw}". O acesso só funciona depois da correção.`);
    if (!p.birth_date) issues.push(`Data de nascimento ausente para ${p.name}.`);
  }
  return { participants: [...byEmail.values()], issues };
}

async function importParticipants(db, file, label) {
  const { participants, issues } = await readSheet(file);
  let created = 0;
  for (const p of participants) {
    const r = await db.q(
      `INSERT INTO participants (email, name, prize, school, phone, birth_date, city, uf, sheet_submitted_at, original)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (email) DO NOTHING RETURNING id`,
      [p.email, p.name, p.prize, p.school, p.phone, p.birth_date, p.city, p.uf, p.sheet_submitted_at, p.original]);
    if (r.rows[0]) {
      created++;
      await db.q(`INSERT INTO responses (participant_id) VALUES ($1) ON CONFLICT DO NOTHING`, [r.rows[0].id]);
      await db.q(`INSERT INTO events (participant_id, kind, actor, detail) VALUES ($1,'importado','sistema',$2)`, [r.rows[0].id, { arquivo: label || (typeof file === 'string' ? path.basename(file) : 'planilha') }]);
    }
  }
  return { created, total: participants.length, issues };
}

module.exports = { readSheet, importParticipants };

if (require.main === module) {
  (async () => {
    const file = process.argv[2];
    if (!file || !fs.existsSync(file)) { console.error('Uso: npm run import -- caminho/planilha.xlsx'); process.exit(1); }
    const db = require('./db');
    await db.migrate();
    const r = await importParticipants(db, file);
    console.log(`Importados ${r.created} de ${r.total}.`);
    r.issues.forEach(i => console.log('· ' + i));
    await db.pool.end();
  })().catch(e => { console.error(e); process.exit(1); });
}
