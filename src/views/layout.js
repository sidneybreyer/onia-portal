'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { html, raw } = require('../html');
const { NAME } = require('../brand');

// Versão dos arquivos estáticos: muda sozinha a cada deploy que altere CSS ou JavaScript,
// para o navegador não usar a cópia antiga. ASSET_VERSION, se definida, tem prioridade.
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const ASSET_VERSION = process.env.ASSET_VERSION || (() => {
  const h = crypto.createHash('sha1');
  for (const f of fs.readdirSync(PUBLIC_DIR).filter(f => /\.(css|js)$/.test(f)).sort()) h.update(fs.readFileSync(path.join(PUBLIC_DIR, f)));
  return h.digest('hex').slice(0, 8);
})();

const MARK = raw(`<svg class="brand-mark" viewBox="0 0 26 26" aria-hidden="true"><rect x="1" y="11" width="7" height="14" rx="1.5" fill="#2448c8" opacity=".45"/><rect x="9.5" y="4" width="7" height="21" rx="1.5" fill="#2448c8"/><rect x="18" y="15" width="7" height="10" rx="1.5" fill="#2448c8" opacity=".7"/></svg>`);

function brand(sub) {
  return html`<span class="brand">${MARK}<span>${NAME} ${sub ? html`<small>${sub}</small>` : ''}</span></span>`;
}

function page({ title, body, bodyClass = '', scripts = [] }) {
  return '<!doctype html>' + html`<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title ? `${title} | ${NAME}` : NAME}</title>
<link rel="preload" href="/static/fonts/instrument-sans-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/static/app.css?v=${ASSET_VERSION}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 26 26'%3E%3Crect x='1' y='11' width='7' height='14' rx='1.5' fill='%232448c8' opacity='.45'/%3E%3Crect x='9.5' y='4' width='7' height='21' rx='1.5' fill='%232448c8'/%3E%3Crect x='18' y='15' width='7' height='10' rx='1.5' fill='%232448c8' opacity='.7'/%3E%3C/svg%3E">
</head>
<body class="${bodyClass}">
${body}
<div class="toast" id="toast" role="status" aria-live="polite"></div>
${scripts.map(s => html`<script src="/static/${s}?v=${ASSET_VERSION}" defer></script>`)}
</body>
</html>`;
}

function participantShell(p, current, content) {
  const link = (href, label, key) => html`<a href="${href}" ${current === key ? raw('aria-current="page"') : ''}>${label}</a>`;
  return html`<header class="top">
  <a class="brand" href="/inicio">${MARK}<span>${NAME}</span></a>
  <nav aria-label="Principal">
    ${link('/inicio', 'Início', 'inicio')}
    ${link('/meus-dados', 'Meus dados', 'dados')}
    <form method="post" action="/sair"><button class="btn quiet small" type="submit">Sair</button></form>
  </nav>
</header>
<main class="narrow">${content}</main>`;
}

function adminShell(admin, current, content) {
  const link = (href, label, key) => html`<a href="${href}" ${current === key ? raw('aria-current="page"') : ''}>${label}</a>`;
  return html`<header class="top">
  <a class="brand" href="/gestao">${MARK}<span>${NAME} <small>Gestão</small></span></a>
  <nav aria-label="Gestão">
    ${link('/gestao', 'Painel', 'painel')}
    ${link('/gestao/participantes', 'Participantes', 'lista')}
    ${link('/gestao/configuracoes', 'Configurações', 'config')}
    <form method="post" action="/gestao/sair"><button class="btn quiet small" type="submit">Sair</button></form>
  </nav>
</header>
<main class="wide">${content}</main>`;
}

function notice(flash) {
  if (!flash) return '';
  return html`<div class="notice ${flash.type || ''}" role="status"><p>${flash.text}</p></div>`;
}

module.exports = { page, brand, participantShell, adminShell, notice, MARK };
