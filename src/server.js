'use strict';
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const compression = require('compression');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');

const db = require('./db');
const F = require('./form');
const U = require('./util');
const PV = require('./views/participant');
const AV = require('./views/admin');
const { importParticipants, readSheet } = require('./importer');

const PROD = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;
const SESSION_COOKIE = 'onia_sid';
const PARTICIPANT_DAYS = 30;
const ADMIN_HOURS = 12;
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10);

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(compression());

// Cabeçalhos de segurança: nada de terceiros, nada indexável, nada em iframe.
app.use((req, res, next) => {
  res.set({
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'X-Robots-Tag': 'noindex, nofollow',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  if (PROD) res.set('Strict-Transport-Security', 'max-age=31536000');
  next();
});

app.use('/static', express.static(path.join(__dirname, '..', 'public'), { maxAge: PROD ? '7d' : 0 }));
app.get('/robots.txt', (req, res) => res.type('text/plain').send('User-agent: *\nDisallow: /\n'));
app.get('/saude', (req, res) => res.send('ok'));
app.use(express.urlencoded({ extended: false, limit: '200kb' }));

// Proteção contra envio de formulário a partir de outro site.
app.use((req, res, next) => {
  if (req.method !== 'POST') return next();
  const origin = req.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== req.get('host')) return res.status(403).send('Origem não permitida.');
    } catch { return res.status(403).send('Origem não permitida.'); }
  }
  next();
});

// ---------- Sessões ----------
const hashToken = t => crypto.createHash('sha256').update(t).digest('hex');

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(c => {
    const i = c.indexOf('=');
    if (i > 0) out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim());
  });
  return out;
}

async function startSession(req, res, kind, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const ms = kind === 'admin' ? ADMIN_HOURS * 3600e3 : PARTICIPANT_DAYS * 86400e3;
  await db.q('INSERT INTO sessions (token_hash, kind, user_id, expires_at) VALUES ($1,$2,$3,$4)', [hashToken(token), kind, userId, new Date(Date.now() + ms)]);
  res.cookie(`${SESSION_COOKIE}_${kind}`, token, { httpOnly: true, sameSite: 'lax', secure: PROD || req.secure, maxAge: ms, path: '/' });
}

async function endSession(req, res, kind) {
  const token = parseCookies(req)[`${SESSION_COOKIE}_${kind}`];
  if (token) await db.q('DELETE FROM sessions WHERE token_hash=$1', [hashToken(token)]);
  res.clearCookie(`${SESSION_COOKIE}_${kind}`, { path: '/' });
}

async function sessionUser(req, kind) {
  const token = parseCookies(req)[`${SESSION_COOKIE}_${kind}`];
  if (!token) return null;
  const s = await db.one('SELECT user_id FROM sessions WHERE token_hash=$1 AND kind=$2 AND expires_at > now()', [hashToken(token), kind]);
  if (!s) return null;
  if (kind === 'admin') return db.one('SELECT id, email, name, password_hash FROM admins WHERE id=$1', [s.user_id]);
  return db.one('SELECT * FROM participants WHERE id=$1 AND active', [s.user_id]);
}

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const requireParticipant = ({ allowSetup = false } = {}) => wrap(async (req, res, next) => {
  const p = await sessionUser(req, 'participante');
  if (!p) {
    if (req.get('X-Autosave')) return res.status(401).json({ error: 'sessao' });
    return res.redirect('/entrar');
  }
  if (!p.password_hash && !allowSetup) return res.redirect('/primeiro-acesso');
  req.p = p;
  next();
});

const requireAdmin = wrap(async (req, res, next) => {
  const a = await sessionUser(req, 'admin');
  if (!a) return res.redirect('/gestao/entrar');
  req.admin = a;
  next();
});

// Limite simples por IP para tentativas de login.
const ipHits = new Map();
function ipLimited(req) {
  const now = Date.now();
  const key = req.ip;
  const list = (ipHits.get(key) || []).filter(t => now - t < 15 * 60e3);
  list.push(now);
  ipHits.set(key, list);
  return list.length > 40;
}

// ---------- Configurações ----------
const DEFAULT_TEMPLATES = [
  { key: 'convite', name: 'Convite para o portal', subject: 'Talentos ONIA: queremos conhecer você', body: 'Oi, {nome}!\n\nQueremos conhecer melhor seus interesses e sua experiência para organizar os próximos passos das oportunidades de formação e estágio após a Olimpíada Nacional de IA.\n\nPreparamos um formulário de 12 a 15 minutos no portal do programa. Não precisa ter currículo, portfólio ou experiência profissional. Trabalhos da escola e desafios da olimpíada também contam.\n\nPortal: {portal}\nLogin: este e-mail\nSenha do primeiro acesso: seu WhatsApp com DDD, só os números (ex.: 11987654321). Depois você cria uma senha só sua.\nPrazo: {prazo}\nDúvidas: {contato}\n\nSe você tem menos de 18 anos, converse com seu responsável antes de responder.\n\nSidney e equipe' },
  { key: 'lembrete', name: 'Lembrete de prazo', subject: 'Talentos ONIA: o formulário fecha em {prazo}', body: 'Oi, {nome}!\n\nO formulário do programa fica aberto até {prazo}. Suas respostas ficam salvas, então você pode continuar de onde parou: {portal}\n\nDúvidas: {contato}\n\nSidney e equipe' },
  { key: 'conversa', name: 'Agendar conversa', subject: 'Talentos ONIA: vamos conversar?', body: 'Oi, {nome}!\n\nObrigado por responder ao formulário. Queremos marcar uma conversa de 30 minutos para conhecer melhor seus interesses.\n\nAlgum destes horários funciona para você?\n- [horário 1]\n- [horário 2]\n- [horário 3]\n\nSidney e equipe' },
  { key: 'retorno', name: 'Retorno após a conversa', subject: 'Talentos ONIA: próximos passos', body: 'Oi, {nome}!\n\nObrigado pela conversa. Combinamos o seguinte:\n- [próximo passo]\n\nQualquer dúvida, fale com a gente: {contato}\n\nSidney e equipe' },
];

async function getSettings() {
  const rows = await db.many('SELECT key, value FROM settings');
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

async function getTemplates(settings) {
  const s = settings || await getSettings();
  return DEFAULT_TEMPLATES.map(t => ({
    ...t,
    subject: s[`tpl_${t.key}_assunto`] ?? t.subject,
    body: s[`tpl_${t.key}_corpo`] ?? t.body,
  }));
}

function deadlinePassed(settings) {
  return !!settings.deadline && U.todayInBrazil() > settings.deadline;
}

// ---------- Ajudantes do participante ----------
async function getResponse(pid) {
  let r = await db.one('SELECT * FROM responses WHERE participant_id=$1', [pid]);
  if (!r) {
    await db.q('INSERT INTO responses (participant_id) VALUES ($1) ON CONFLICT DO NOTHING', [pid]);
    r = await db.one('SELECT * FROM responses WHERE participant_id=$1', [pid]);
  }
  return r;
}

const isMinorP = p => { const a = U.ageOn(p.birth_date); return a === null || a < 18; };

function profileOk(p) {
  return !!(p.name && U.phoneIsValid(p.phone) && p.birth_date && p.city && p.uf && p.school);
}

function progressOf(p, data) {
  const minor = isMinorP(p);
  const pOk = profileOk(p);
  const sections = F.SECTIONS.map(s => ({ n: s.n, title: s.title, ...F.sectionProgress(s, data, minor, pOk) }));
  const total = sections.reduce((a, s) => a + s.total, 0);
  const done = sections.reduce((a, s) => a + s.done, 0);
  return { sections, pct: total ? Math.round(done / total * 100) : 0 };
}

async function logEvent(pid, kind, actor, detail = {}) {
  await db.q('INSERT INTO events (participant_id, kind, actor, detail) VALUES ($1,$2,$3,$4)', [pid, kind, actor, detail]);
}

// Valida e grava os campos de cadastro da seção 1. Devolve erros por campo.
async function saveProfile(p, body) {
  const errors = {};
  const upd = {};
  for (const f of F.PROFILE_FIELDS) {
    const raw = body['pf_' + f.key];
    if (raw === undefined) continue;
    let v = String(raw).trim().replace(/\s+/g, ' ');
    if (f.key === 'phone') {
      v = U.normalizePhone(v);
      if (!U.phoneIsValid(v)) { errors.phone = 'Informe DDD + número, ex.: (11) 98765-4321.'; continue; }
    } else if (f.key === 'birth_date') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || v < '1985-01-01' || v > '2016-12-31') { errors.birth_date = 'Informe uma data válida.'; continue; }
    } else if (f.key === 'uf') {
      if (!U.UFS.includes(v)) { errors.uf = 'Escolha o estado.'; continue; }
    } else {
      v = v.slice(0, f.max);
      if (f.required && !v) { errors[f.key] = 'Preencha este campo.'; continue; }
    }
    upd[f.key] = f.key === 'preferred_name' ? (v || null) : v;
  }
  const keys = Object.keys(upd);
  if (keys.length) {
    const sets = keys.map((k, i) => `${k}=$${i + 2}`).join(', ');
    await db.q(`UPDATE participants SET ${sets} WHERE id=$1`, [p.id, ...keys.map(k => upd[k])]);
    Object.assign(p, upd);
  }
  return errors;
}

// ---------- Rotas do participante ----------
app.get('/', (req, res) => res.redirect('/inicio'));

app.get('/entrar', wrap(async (req, res) => {
  const p = await sessionUser(req, 'participante');
  if (p) return res.redirect('/inicio');
  res.send(PV.loginPage({ settings: await getSettings() }));
}));

app.post('/entrar', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const senha = String(req.body.senha || '');
  const settings = await getSettings();
  const fail = msg => res.status(401).send(PV.loginPage({ error: msg || 'E-mail ou senha não conferem. No primeiro acesso, a senha é o seu WhatsApp com DDD, só números.', email, settings }));
  if (ipLimited(req)) return fail('Muitas tentativas. Aguarde alguns minutos.');
  if (!email || !senha) return fail('Preencha e-mail e senha.');
  const p = await db.one('SELECT * FROM participants WHERE email=$1', [email]);
  if (!p || !p.active) { await bcrypt.compare(senha, DUMMY_HASH); return fail(); }
  if (p.locked_until && new Date(p.locked_until) > new Date()) return fail('Acesso bloqueado por alguns minutos depois de várias tentativas. Tente de novo em 15 minutos.');
  let ok;
  if (p.password_hash) ok = await bcrypt.compare(senha, p.password_hash);
  else ok = U.phoneIsValid(p.phone) && U.normalizePhone(senha) === p.phone;
  if (!ok) {
    const fails = p.failed_attempts + 1;
    await db.q('UPDATE participants SET failed_attempts=$2, locked_until=$3 WHERE id=$1', [p.id, fails >= MAX_FAILS ? 0 : fails, fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MINUTES * 60e3) : null]);
    return fail();
  }
  const first = !p.first_login_at;
  await db.q(`UPDATE participants SET failed_attempts=0, locked_until=NULL, last_login_at=now(), first_login_at=COALESCE(first_login_at, now()), stage=GREATEST(stage, 2) WHERE id=$1`, [p.id]);
  if (first) await logEvent(p.id, 'primeiro_acesso', 'participante');
  await startSession(req, res, 'participante', p.id);
  res.redirect(p.password_hash ? '/inicio' : '/primeiro-acesso');
}));

app.get('/esqueci', wrap(async (req, res) => res.send(PV.forgotPage({ settings: await getSettings() }))));

app.get('/primeiro-acesso', requireParticipant({ allowSetup: true }), wrap(async (req, res) => {
  if (req.p.password_hash) return res.redirect('/inicio');
  res.send(PV.firstAccessPage({ p: req.p, settings: await getSettings(), isMinor: isMinorP(req.p) }));
}));

app.post('/primeiro-acesso', requireParticipant({ allowSetup: true }), wrap(async (req, res) => {
  const p = req.p;
  if (p.password_hash) return res.redirect('/inicio');
  const nova = String(req.body.nova || '');
  const settings = await getSettings();
  const err = e => res.status(400).send(PV.firstAccessPage({ p, error: e, settings, isMinor: isMinorP(p) }));
  if (nova.length < 8) return err('A senha precisa ter pelo menos 8 caracteres.');
  if (nova !== String(req.body.confirma || '')) return err('As duas senhas não são iguais.');
  if (U.normalizePhone(nova) === p.phone) return err('Escolha uma senha diferente do seu telefone.');
  if (req.body.ciente !== '1') return err('Confirme que leu o aviso de privacidade.');
  await db.q('UPDATE participants SET password_hash=$2, privacy_ack_at=now() WHERE id=$1', [p.id, await bcrypt.hash(nova, 10)]);
  await logEvent(p.id, 'senha_criada', 'participante');
  res.redirect('/inicio?msg=bemvindo');
}));

app.post('/sair', wrap(async (req, res) => { await endSession(req, res, 'participante'); res.redirect('/entrar'); }));

app.get('/inicio', requireParticipant(), wrap(async (req, res) => {
  const resp = await getResponse(req.p.id);
  res.send(PV.homePage({ p: req.p, resp, progress: progressOf(req.p, resp.data), settings: await getSettings(), msg: req.query.msg, isMinor: isMinorP(req.p) }));
}));

app.get('/formulario/revisao', requireParticipant(), wrap(async (req, res) => {
  const p = req.p;
  const resp = await getResponse(p.id);
  const settings = await getSettings();
  const minor = isMinorP(p);
  res.send(PV.reviewPage({ p, data: resp.data, isMinor: minor, missing: F.missingRequired(resp.data, minor, profileOk(p)), resp, locked: resp.status === 'enviado' && deadlinePassed(settings), profileOk: profileOk(p) }));
}));

app.post('/formulario/enviar', requireParticipant(), wrap(async (req, res) => {
  const p = req.p;
  const resp = await getResponse(p.id);
  if (resp.status === 'enviado') return res.redirect('/inicio');
  const missing = F.missingRequired(resp.data, isMinorP(p), profileOk(p));
  if (missing.length) return res.redirect('/formulario/revisao');
  await db.q(`UPDATE responses SET status='enviado', submitted_at=now(), updated_at=now() WHERE participant_id=$1`, [p.id]);
  await db.q('UPDATE participants SET stage=GREATEST(stage, 3) WHERE id=$1', [p.id]);
  await logEvent(p.id, 'formulario_enviado', 'participante');
  res.redirect('/inicio?msg=enviado');
}));

app.get('/formulario/:n', requireParticipant(), wrap(async (req, res) => {
  const section = F.SECTIONS.find(s => s.n === Number(req.params.n));
  if (!section) return res.redirect('/inicio');
  const resp = await getResponse(req.p.id);
  const settings = await getSettings();
  res.send(PV.sectionPage({ p: req.p, section, data: resp.data, isMinor: isMinorP(req.p), progress: progressOf(req.p, resp.data), locked: resp.status === 'enviado' && deadlinePassed(settings) }));
}));

app.post('/formulario/:n', requireParticipant(), wrap(async (req, res) => {
  const p = req.p;
  const section = F.SECTIONS.find(s => s.n === Number(req.params.n));
  if (!section) return res.redirect('/inicio');
  const autosave = !!req.get('X-Autosave');
  const resp = await getResponse(p.id);
  const settings = await getSettings();
  if (resp.status === 'enviado' && deadlinePassed(settings)) {
    return autosave ? res.status(409).json({ error: 'prazo' }) : res.redirect('/inicio?msg=prazo');
  }
  let errors = {};
  if (section.profile) errors = await saveProfile(p, req.body);
  const clean = F.sanitizeSection(section, req.body, isMinorP(p));
  const data = { ...resp.data, ...clean };
  const starting = resp.status === 'nao_iniciado';
  await db.q(`UPDATE responses SET data=$2, updated_at=now(),
      status=CASE WHEN status='nao_iniciado' THEN 'em_andamento' ELSE status END,
      started_at=COALESCE(started_at, now()) WHERE participant_id=$1`, [p.id, data]);
  if (starting) await logEvent(p.id, 'inicio_formulario', 'participante');
  if (resp.status === 'enviado') {
    const recent = await db.one(`SELECT 1 FROM events WHERE participant_id=$1 AND kind='edicao_apos_envio' AND created_at > now() - interval '6 hours'`, [p.id]);
    if (!recent) await logEvent(p.id, 'edicao_apos_envio', 'participante');
  }
  if (autosave) return res.json({ ok: true, errors });
  if (Object.keys(errors).length) {
    return res.status(400).send(PV.sectionPage({ p, section, data, errors, isMinor: isMinorP(p), progress: progressOf(p, data), locked: false }));
  }
  const n = section.n;
  if (req.body.ir === 'voltar') return res.redirect(n > 1 ? `/formulario/${n - 1}` : '/inicio');
  res.redirect(n < F.SECTIONS.length ? `/formulario/${n + 1}` : '/formulario/revisao');
}));

app.get('/meus-dados', requireParticipant(), (req, res) => res.send(PV.myDataPage({ p: req.p, msg: req.query.msg })));

app.post('/meus-dados/senha', requireParticipant(), wrap(async (req, res) => {
  const p = req.p;
  const err = e => res.status(400).send(PV.myDataPage({ p, error: e }));
  if (!(await bcrypt.compare(String(req.body.atual || ''), p.password_hash))) return err('A senha atual não confere.');
  const nova = String(req.body.nova || '');
  if (nova.length < 8) return err('A nova senha precisa ter pelo menos 8 caracteres.');
  if (nova !== String(req.body.confirma || '')) return err('As duas senhas novas não são iguais.');
  await db.q('UPDATE participants SET password_hash=$2 WHERE id=$1', [p.id, await bcrypt.hash(nova, 10)]);
  res.redirect('/meus-dados?msg=senha');
}));

// ---------- Gestão ----------

// ---------- Configuração inicial do gestor ----------
// A chave da planilha criptografada também serve de código único para criar o primeiro gestor.
// Só o hash dela fica no código; a chave chega pelo link enviado ao responsável pelo programa.
const ENC_SEED = path.join(__dirname, '..', 'seed', 'participantes.xlsx.enc');
const SETUP_KEY_SHA256 = '0d035d11c7d0b689776398e0bb5ebfec3da9acd9795a4892058164d85a651796';

function setupKeyOk(key) {
  const k = String(key || '').trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(k)) return false;
  const h = crypto.createHash('sha256').update(k).digest();
  return crypto.timingSafeEqual(h, Buffer.from(SETUP_KEY_SHA256, 'hex'));
}

async function importEncryptedSeed(keyHex) {
  const blob = fs.readFileSync(ENC_SEED);
  const d = crypto.createDecipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), blob.subarray(0, 12));
  d.setAuthTag(blob.subarray(12, 28));
  const buf = Buffer.concat([d.update(blob.subarray(28)), d.final()]);
  const r = await importParticipants(db, buf, 'planilha de inscrição');
  console.log(`Planilha importada: ${r.created} participantes.`);
  r.issues.forEach(i => console.log('  ' + i));
  return r;
}

app.get('/gestao/configurar', wrap(async (req, res) => {
  const { n } = await db.one('SELECT count(*)::int AS n FROM admins');
  if (n > 0) return res.redirect('/gestao/entrar');
  res.send(AV.adminSetupPage({ email: process.env.ADMIN_EMAIL || '', name: process.env.ADMIN_NAME || '' }));
}));

app.post('/gestao/configurar', wrap(async (req, res) => {
  const { n } = await db.one('SELECT count(*)::int AS n FROM admins');
  if (n > 0) return res.redirect('/gestao/entrar');
  const v = { email: String(req.body.email || '').trim().toLowerCase(), name: String(req.body.name || '').trim() };
  const err = e => res.status(400).send(AV.adminSetupPage({ ...v, error: e }));
  if (ipLimited(req)) return err('Muitas tentativas. Aguarde alguns minutos.');
  if (!setupKeyOk(req.body.chave)) return err('Este link de configuração não é válido. Abra de novo o link completo que você recebeu.');
  if (!v.name || !U.EMAIL_RE.test(v.email)) return err('Preencha nome e e-mail.');
  const senha = String(req.body.nova || '');
  if (senha.length < 12) return err('A senha precisa ter pelo menos 12 caracteres.');
  if (senha !== String(req.body.confirma || '')) return err('As duas senhas não são iguais.');
  const a = await db.one('INSERT INTO admins (email, name, password_hash) VALUES ($1,$2,$3) RETURNING id', [v.email, v.name, await bcrypt.hash(senha, 10)]);
  const { c } = await db.one('SELECT count(*)::int AS c FROM participants');
  if (c === 0 && fs.existsSync(ENC_SEED)) await importEncryptedSeed(String(req.body.chave).trim().toLowerCase());
  await startSession(req, res, 'admin', a.id);
  res.redirect('/gestao');
}));

app.get('/gestao/entrar', wrap(async (req, res) => {
  const { n } = await db.one('SELECT count(*)::int AS n FROM admins');
  if (n === 0) return res.redirect('/gestao/configurar');
  res.send(AV.adminLoginPage({}));
}));

app.post('/gestao/entrar', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const senha = String(req.body.senha || '');
  const fail = msg => res.status(401).send(AV.adminLoginPage({ error: msg || 'E-mail ou senha não conferem.', email }));
  if (ipLimited(req)) return fail('Muitas tentativas. Aguarde alguns minutos.');
  const a = await db.one('SELECT * FROM admins WHERE email=$1', [email]);
  if (!a) { await bcrypt.compare(senha, DUMMY_HASH); return fail(); }
  if (a.locked_until && new Date(a.locked_until) > new Date()) return fail('Acesso bloqueado por 15 minutos depois de várias tentativas.');
  if (!(await bcrypt.compare(senha, a.password_hash))) {
    const fails = a.failed_attempts + 1;
    await db.q('UPDATE admins SET failed_attempts=$2, locked_until=$3 WHERE id=$1', [a.id, fails >= MAX_FAILS ? 0 : fails, fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MINUTES * 60e3) : null]);
    return fail();
  }
  await db.q('UPDATE admins SET failed_attempts=0, locked_until=NULL WHERE id=$1', [a.id]);
  await startSession(req, res, 'admin', a.id);
  res.redirect('/gestao');
}));

app.post('/gestao/sair', wrap(async (req, res) => { await endSession(req, res, 'admin'); res.redirect('/gestao/entrar'); }));

const MEDAL_RANK = { 'Ouro': 1, 'Prata': 2, 'Bronze': 3, 'Menção honrosa': 4, '4ª fase': 5 };
const STATUS_RANK = { nao_acessou: 0, nao_iniciado: 1, em_andamento: 2, enviado: 3 };

async function listRows() {
  const rows = await db.many(`SELECT p.*, r.data, r.status AS rstatus, r.submitted_at FROM participants p LEFT JOIN responses r ON r.participant_id=p.id ORDER BY p.name`);
  return rows.map(p => {
    const data = p.data || {};
    const status = !p.first_login_at ? 'nao_acessou' : (p.rstatus || 'nao_iniciado');
    const medal = AV.medalShort(p.prize);
    const o = p.original || {};
    const corrected = !!o.email && ((o.phone && o.phone !== p.phone) || (o.city && o.city !== p.city) || (o.uf && o.uf !== p.uf) || (o.school && o.school !== p.school) || (o.birth_date && o.birth_date !== U.isoDate(p.birth_date)));
    const apoio = Array.isArray(data.apoio) ? data.apoio : [];
    return {
      id: p.id, name: p.name, pref: p.preferred_name || '', email: p.email, phone: p.phone, phoneFmt: U.formatPhone(p.phone),
      phoneOk: U.phoneIsValid(p.phone), age: U.ageOn(p.birth_date), uf: p.uf, city: p.city, school: p.school,
      medal, medalClass: AV.medalClass(p.prize), medalRank: MEDAL_RANK[medal] || 9,
      stage: p.stage, referral: p.referral || '', tags: p.tags || [], active: p.active,
      status, statusRank: STATUS_RANK[status], pct: status === 'nao_acessou' ? 0 : progressOf(p, data).pct,
      caminho: F.SHORT.caminho[data.caminho] || '', programacao: F.SHORT.programacao[data.programacao] || '',
      horas: F.SHORT.horas[data.horas] || '', computador: F.SHORT.computador[data.computador] || '',
      flags: {
        computador: data.computador === 'Precisaria de um computador para participar' || apoio.includes('Empréstimo de equipamento'),
        conversa: data.computador === 'Prefiro conversar com a equipe sobre isso' || apoio.includes('Gostaria de conversar em particular sobre uma adaptação ou apoio'),
      },
      corrected,
    };
  });
}

app.get('/gestao', requireAdmin, wrap(async (req, res) => {
  res.send(AV.dashboardPage({ admin: req.admin, rows: await listRows(), settings: await getSettings() }));
}));

app.get('/gestao/participantes', requireAdmin, wrap(async (req, res) => {
  res.send(AV.listPage({ admin: req.admin, rows: await listRows() }));
}));

app.get('/gestao/participantes/novo', requireAdmin, (req, res) => res.send(AV.newParticipantPage({ admin: req.admin })));

app.post('/gestao/participantes/novo', requireAdmin, wrap(async (req, res) => {
  const v = Object.fromEntries(['name', 'email', 'phone', 'birth_date', 'city', 'uf', 'school', 'prize'].map(k => [k, String(req.body[k] || '').trim()]));
  const err = e => res.status(400).send(AV.newParticipantPage({ admin: req.admin, error: e, v }));
  v.email = v.email.toLowerCase();
  if (!v.name || !U.EMAIL_RE.test(v.email)) return err('Preencha nome e um e-mail válido.');
  const phone = U.normalizePhone(v.phone);
  if (!U.phoneIsValid(phone)) return err('Telefone inválido. Use DDD + número.');
  if (await db.one('SELECT 1 FROM participants WHERE email=$1', [v.email])) return err('Já existe um participante com esse e-mail.');
  const r = await db.one(`INSERT INTO participants (email, name, prize, school, phone, birth_date, city, uf) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [v.email, v.name, v.prize, v.school, phone, v.birth_date || null, v.city, v.uf]);
  await db.q('INSERT INTO responses (participant_id) VALUES ($1)', [r.id]);
  await logEvent(r.id, 'criado', req.admin.name);
  res.redirect(`/gestao/p/${r.id}`);
}));

async function loadParticipant(req, res) {
  const id = Number(req.params.id);
  const p = Number.isInteger(id) ? await db.one('SELECT * FROM participants WHERE id=$1', [id]) : null;
  if (!p) { res.status(404).send('Participante não encontrado.'); return null; }
  return p;
}

app.get('/gestao/p/:id', requireAdmin, wrap(async (req, res) => {
  const p = await loadParticipant(req, res); if (!p) return;
  const [resp, notes, events, settings] = await Promise.all([
    getResponse(p.id),
    db.many('SELECT * FROM notes WHERE participant_id=$1 ORDER BY created_at DESC', [p.id]),
    db.many('SELECT * FROM events WHERE participant_id=$1 ORDER BY created_at DESC LIMIT 200', [p.id]),
    getSettings(),
  ]);
  await db.q('INSERT INTO audit (admin_email, action, participant_id) VALUES ($1,$2,$3)', [req.admin.email, 'ficha_aberta', p.id]);
  const fill = s => s.replace(/\{nome\}/g, U.firstName(p)).replace(/\{portal\}/g, settings.portal_url || '[endereço do portal]')
    .replace(/\{prazo\}/g, settings.deadline ? U.brDate(settings.deadline) : '[prazo]').replace(/\{contato\}/g, settings.program_contact || '[contato do programa]');
  const templates = (await getTemplates(settings)).map(t => ({ ...t, subject: fill(t.subject), body: fill(t.body) }));
  res.send(AV.fichaPage({ admin: req.admin, p, resp, notes, events, isMinor: isMinorP(p), templates, msg: req.query.msg }));
}));

app.post('/gestao/p/:id/acompanhamento', requireAdmin, wrap(async (req, res) => {
  const p = await loadParticipant(req, res); if (!p) return;
  const stage = Math.min(6, Math.max(1, Number(req.body.stage) || p.stage));
  const referral = AV.REFERRALS.includes(req.body.referral) ? req.body.referral : null;
  const tags = [...new Set(String(req.body.tags || '').split(',').map(t => t.trim()).filter(Boolean))].slice(0, 20);
  await db.q('UPDATE participants SET stage=$2, referral=$3, tags=$4 WHERE id=$1', [p.id, stage, referral, tags]);
  if (stage !== p.stage) await logEvent(p.id, 'etapa', req.admin.name, { texto: `${stage}. ${AV.STAGES[stage - 1]}${referral && stage === 6 ? ` (${referral})` : ''}` });
  res.redirect(`/gestao/p/${p.id}?msg=salvo`);
}));

app.post('/gestao/p/:id/nota', requireAdmin, wrap(async (req, res) => {
  const p = await loadParticipant(req, res); if (!p) return;
  const body = String(req.body.body || '').trim().slice(0, 4000);
  if (body) await db.q('INSERT INTO notes (participant_id, author, body) VALUES ($1,$2,$3)', [p.id, req.admin.name, body]);
  res.redirect(`/gestao/p/${p.id}?msg=nota`);
}));

app.post('/gestao/p/:id/redefinir', requireAdmin, wrap(async (req, res) => {
  const p = await loadParticipant(req, res); if (!p) return;
  await db.q('UPDATE participants SET password_hash=NULL, failed_attempts=0, locked_until=NULL WHERE id=$1', [p.id]);
  await db.q(`DELETE FROM sessions WHERE kind='participante' AND user_id=$1`, [p.id]);
  await logEvent(p.id, 'acesso_redefinido', req.admin.name);
  res.redirect(`/gestao/p/${p.id}?msg=acesso`);
}));

app.post('/gestao/p/:id/ativo', requireAdmin, wrap(async (req, res) => {
  const p = await loadParticipant(req, res); if (!p) return;
  await db.q('UPDATE participants SET active=NOT active WHERE id=$1', [p.id]);
  if (p.active) await db.q(`DELETE FROM sessions WHERE kind='participante' AND user_id=$1`, [p.id]);
  await logEvent(p.id, p.active ? 'desativado' : 'reativado', req.admin.name);
  res.redirect(`/gestao/p/${p.id}?msg=salvo`);
}));

app.post('/gestao/p/:id/cadastro', requireAdmin, wrap(async (req, res) => {
  const p = await loadParticipant(req, res); if (!p) return;
  const phone = U.normalizePhone(req.body.phone);
  if (!U.phoneIsValid(phone)) return res.redirect(`/gestao/p/${p.id}?msg=erro_tel`);
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!U.EMAIL_RE.test(email) || (email !== p.email && await db.one('SELECT 1 FROM participants WHERE email=$1', [email]))) return res.redirect(`/gestao/p/${p.id}?msg=erro_email`);
  const uf = U.UFS.includes(req.body.uf) ? req.body.uf : p.uf;
  const birth = /^\d{4}-\d{2}-\d{2}$/.test(req.body.birth_date || '') ? req.body.birth_date : p.birth_date;
  const t = k => String(req.body[k] || '').trim() || p[k];
  await db.q(`UPDATE participants SET name=$2, email=$3, phone=$4, birth_date=$5, city=$6, uf=$7, school=$8, prize=$9 WHERE id=$1`,
    [p.id, t('name'), email, phone, birth, t('city'), uf, t('school'), t('prize')]);
  await logEvent(p.id, 'cadastro_editado', req.admin.name);
  res.redirect(`/gestao/p/${p.id}?msg=cadastro`);
}));

app.post('/gestao/p/:id/contato', requireAdmin, wrap(async (req, res) => {
  const p = await loadParticipant(req, res); if (!p) return;
  const kind = req.body.kind === 'contato_whatsapp' ? 'contato_whatsapp' : 'contato_email';
  const tpl = String(req.body.tpl || '').slice(0, 40);
  await logEvent(p.id, kind, req.admin.name, tpl ? { texto: tpl } : {});
  res.json({ ok: true });
}));

app.get('/gestao/exportar.xlsx', requireAdmin, wrap(async (req, res) => {
  const ids = String(req.query.ids || '').split(',').map(Number).filter(Number.isInteger);
  const params = ids.length ? [ids] : [];
  const rows = await db.many(`SELECT p.*, r.data, r.status AS rstatus, r.submitted_at FROM participants p LEFT JOIN responses r ON r.participant_id=p.id
    ${ids.length ? 'WHERE p.id = ANY($1)' : ''} ORDER BY p.name`, params);
  const notes = await db.many(`SELECT n.*, p.name FROM notes n JOIN participants p ON p.id=n.participant_id ${ids.length ? 'WHERE p.id = ANY($1)' : ''} ORDER BY p.name, n.created_at`, params);
  await db.q('INSERT INTO audit (admin_email, action) VALUES ($1,$2)', [req.admin.email, `exportou ${rows.length}`]);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Talentos ONIA';
  wb.title = 'Confidencial: dados de participantes';
  const ws = wb.addWorksheet('Participantes (confidencial)', { views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }] });
  const fields = F.ALL_FIELDS;
  ws.columns = [
    { header: 'Nome', key: 'name', width: 32 }, { header: 'Prefere ser chamado(a)', key: 'pref', width: 18 },
    { header: 'E-mail', key: 'email', width: 32 }, { header: 'WhatsApp', key: 'phone', width: 17 },
    { header: 'Nascimento', key: 'birth', width: 12 }, { header: 'Idade', key: 'age', width: 7 },
    { header: 'Cidade', key: 'city', width: 18 }, { header: 'UF', key: 'uf', width: 5 }, { header: 'Escola', key: 'school', width: 34 },
    { header: 'Premiação', key: 'prize', width: 22 }, { header: 'Formulário', key: 'status', width: 16 }, { header: 'Enviado em', key: 'sent', width: 17 },
    { header: 'Etapa', key: 'stage', width: 22 }, { header: 'Encaminhamento', key: 'referral', width: 15 }, { header: 'Tags', key: 'tags', width: 22 },
    ...fields.map(f => ({ header: f.label, key: f.key, width: f.type === 'textarea' ? 60 : 30 })),
  ];
  for (const p of rows) {
    const data = p.data || {};
    const status = !p.first_login_at ? 'nao_acessou' : (p.rstatus || 'nao_iniciado');
    ws.addRow({
      name: p.name, pref: p.preferred_name, email: p.email, phone: U.formatPhone(p.phone), birth: U.brDate(p.birth_date), age: U.ageOn(p.birth_date),
      city: p.city, uf: p.uf, school: p.school, prize: p.prize, status: AV.STATUS_LABEL[status], sent: p.submitted_at ? U.brDateTime(p.submitted_at) : '',
      stage: `${p.stage}. ${AV.STAGES[p.stage - 1]}`, referral: p.referral, tags: (p.tags || []).join(', '),
      ...Object.fromEntries(fields.map(f => [f.key, F.displayValue(f, data)])),
    });
  }
  ws.getRow(1).font = { bold: true };
  ws.eachRow((row, i) => { if (i > 1) row.alignment = { vertical: 'top', wrapText: true }; });
  const wn = wb.addWorksheet('Notas');
  wn.columns = [{ header: 'Participante', key: 'name', width: 32 }, { header: 'Autor', key: 'author', width: 20 }, { header: 'Data', key: 'at', width: 17 }, { header: 'Nota', key: 'body', width: 80 }];
  notes.forEach(n => wn.addRow({ name: n.name, author: n.author, at: U.brDateTime(n.created_at), body: n.body }));
  wn.getRow(1).font = { bold: true };

  res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.set('Content-Disposition', `attachment; filename="talentos-onia-${U.todayInBrazil()}.xlsx"`);
  res.set('Cache-Control', 'no-store');
  await wb.xlsx.write(res);
  res.end();
}));

app.get('/gestao/importar', requireAdmin, (req, res) => res.send(AV.importPage({ admin: req.admin })));

app.post('/gestao/importar', requireAdmin, express.raw({ type: 'application/octet-stream', limit: '5mb' }), wrap(async (req, res) => {
  if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'Arquivo vazio.' });
  let sheet;
  try { sheet = await readSheet(req.body); } catch (e) { return res.status(400).json({ error: 'Não consegui ler o arquivo. Envie a planilha em formato .xlsx.' }); }
  const existing = new Set((await db.many('SELECT email FROM participants')).map(r => r.email));
  const novos = sheet.participants.filter(p => !existing.has(p.email));
  if (req.query.modo !== 'importar') {
    return res.json({ total: sheet.participants.length, novos: novos.map(p => p.name), existentes: sheet.participants.length - novos.length, issues: sheet.issues });
  }
  const r = await importParticipants(db, req.body, 'planilha enviada pela gestão');
  await db.q('INSERT INTO audit (admin_email, action) VALUES ($1,$2)', [req.admin.email, `importou ${r.created}`]);
  res.json({ ok: true, created: r.created });
}));

app.get('/gestao/configuracoes', requireAdmin, wrap(async (req, res) => {
  const settings = await getSettings();
  res.send(AV.configPage({ admin: req.admin, settings, templates: await getTemplates(settings), admins: await db.many('SELECT name, email FROM admins ORDER BY name'), msg: req.query.msg }));
}));

app.post('/gestao/configuracoes', requireAdmin, wrap(async (req, res) => {
  const keys = [...AV.SETTINGS_FIELDS.map(f => f[0]), ...DEFAULT_TEMPLATES.flatMap(t => [`tpl_${t.key}_assunto`, `tpl_${t.key}_corpo`])];
  for (const k of keys) {
    if (req.body[k] === undefined) continue;
    let v = String(req.body[k]).replace(/\r\n/g, '\n').trim().slice(0, 5000);
    if ((k === 'whatsapp_link' || k === 'portal_url') && v && !/^https:\/\//i.test(v)) v = 'https://' + v.replace(/^http:\/\//i, '');
    if (k === 'deadline' && v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) v = '';
    await db.q('INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value', [k, v]);
  }
  res.redirect('/gestao/configuracoes?msg=salvo');
}));

app.post('/gestao/gestores', requireAdmin, wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const name = String(req.body.name || '').trim();
  const senha = String(req.body.senha || '');
  const settings = await getSettings();
  const err = e => res.status(400).send(AV.configPage({ admin: req.admin, settings, templates: [], admins: [], error: e }));
  if (!name || !U.EMAIL_RE.test(email)) return err('Preencha nome e e-mail válido do gestor.');
  if (senha.length < 12) return err('A senha inicial do gestor precisa ter pelo menos 12 caracteres.');
  await db.q('INSERT INTO admins (email, name, password_hash) VALUES ($1,$2,$3) ON CONFLICT (email) DO NOTHING', [email, name, await bcrypt.hash(senha, 10)]);
  res.redirect('/gestao/configuracoes?msg=gestor');
}));

app.post('/gestao/senha', requireAdmin, wrap(async (req, res) => {
  const nova = String(req.body.nova || '');
  const settings = await getSettings();
  const err = e => res.status(400).send(AV.configPage({ admin: req.admin, settings, templates: [], admins: [], error: e }));
  if (!(await bcrypt.compare(String(req.body.atual || ''), req.admin.password_hash))) return err('A senha atual não confere.');
  if (nova.length < 12) return err('A nova senha precisa ter pelo menos 12 caracteres.');
  await db.q('UPDATE admins SET password_hash=$2 WHERE id=$1', [req.admin.id, await bcrypt.hash(nova, 10)]);
  res.redirect('/gestao/configuracoes?msg=senha');
}));

app.use((req, res) => res.status(404).send('Página não encontrada.'));
app.use((err, req, res, next) => {
  console.error(err);
  if (req.get('X-Autosave')) return res.status(500).json({ error: 'erro' });
  res.status(500).send('Algo deu errado. Tente de novo em instantes.');
});

// ---------- Inicialização ----------
async function boot() {
  await db.migrate();
  await db.q('DELETE FROM sessions WHERE expires_at < now()');
  const { n } = await db.one('SELECT count(*)::int AS n FROM admins');
  if (n === 0) {
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const pw = process.env.ADMIN_PASSWORD || '';
    if (email && pw.length >= 12) {
      await db.q('INSERT INTO admins (email, name, password_hash) VALUES ($1,$2,$3)', [email, process.env.ADMIN_NAME || 'Gestor', await bcrypt.hash(pw, 10)]);
      console.log(`Gestor criado: ${email}`);
    } else {
      console.warn('Nenhum gestor ainda. Use o link de configuração em /gestao/configurar.');
    }
  }
  const seed = process.env.SEED_XLSX || path.join(__dirname, '..', 'data', 'participantes.xlsx');
  const { c } = await db.one('SELECT count(*)::int AS c FROM participants');
  if (c === 0 && process.env.SEED_KEY && fs.existsSync(ENC_SEED)) {
    await importEncryptedSeed(process.env.SEED_KEY);
  } else if (c === 0 && fs.existsSync(seed)) {
    const r = await importParticipants(db, seed);
    console.log(`Planilha importada: ${r.created} participantes.`);
    r.issues.forEach(i => console.log('  ' + i));
  }
  app.listen(PORT, () => console.log(`Portal no ar na porta ${PORT}`));
}

boot().catch(e => { console.error(e); process.exit(1); });
