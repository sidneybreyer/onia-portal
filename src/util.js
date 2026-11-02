'use strict';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

// Reduz qualquer formato de telefone brasileiro a DDD + número (10 ou 11 dígitos).
function normalizePhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  if (d.length >= 11 && d.startsWith('0')) d = d.slice(1);
  return d;
}

function phoneIsValid(d) {
  return /^[1-9][0-9]9\d{8}$/.test(d) || /^[1-9][0-9][2-5]\d{7}$/.test(d);
}

function formatPhone(d) {
  if (!d) return '';
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

const LOWER_WORDS = new Set(['de', 'da', 'das', 'do', 'dos', 'e', 'di', 'du']);
// Só reescreve nomes digitados inteiramente em maiúsculas ou minúsculas.
function tidyName(raw) {
  const s = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!s) return s;
  if (s !== s.toUpperCase() && s !== s.toLowerCase()) return s;
  return s.toLowerCase().split(' ').map((w, i) =>
    i > 0 && LOWER_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function todayInBrazil() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return parts; // AAAA-MM-DD
}

function ageOn(birth, ref = todayInBrazil()) {
  if (!birth) return null;
  const b = typeof birth === 'string' ? birth.slice(0, 10) : isoDate(birth);
  const [by, bm, bd] = b.split('-').map(Number);
  const [ry, rm, rd] = ref.split('-').map(Number);
  let a = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) a -= 1;
  return a;
}

function isoDate(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  const y = d.getUTCFullYear(), m = String(d.getUTCMonth() + 1).padStart(2, '0'), day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function brDate(d) {
  const s = isoDate(d);
  if (!s) return '';
  const [y, m, day] = s.split('-');
  return `${day}/${m}/${y}`;
}

function brDateTime(ts) {
  if (!ts) return '';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
}

function firstName(p) {
  return (p.preferred_name || p.name || '').trim().split(' ')[0];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = { UFS, normalizePhone, phoneIsValid, formatPhone, tidyName, todayInBrazil, ageOn, isoDate, brDate, brDateTime, firstName, EMAIL_RE };
