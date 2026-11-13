'use strict';
const { html, raw } = require('../html');
const { page, adminShell, notice, MARK } = require('./layout');
const F = require('../form');
const { NAME } = require('../brand');
const { UFS, formatPhone, brDate, brDateTime, isoDate, ageOn } = require('../util');

const STAGES = ['Importado', 'Acessou o portal', 'Formulário enviado', 'Conversa agendada', 'Conversa feita', 'Encaminhado'];
const REFERRALS = ['Trilha Founder', 'Trilha Developer', 'Estágio', 'Formação', 'Pesquisa', 'Comunidade'];
const STATUS_LABEL = { nao_acessou: 'Não acessou', nao_iniciado: 'Acessou, não iniciou', em_andamento: 'Em andamento', enviado: 'Enviado' };
const STATUS_PILL = { nao_acessou: '', nao_iniciado: 'warn', em_andamento: 'prog', enviado: 'ok' };

const EVENT_LABEL = {
  importado: 'Importado da planilha',
  primeiro_acesso: 'Primeiro acesso ao portal',
  senha_criada: 'Criou a própria senha',
  inicio_formulario: 'Começou o formulário',
  formulario_enviado: 'Enviou o formulário',
  edicao_apos_envio: 'Editou respostas depois de enviar',
  etapa: 'Etapa alterada',
  contato_email: 'E-mail aberto pela gestão',
  contato_whatsapp: 'WhatsApp aberto pela gestão',
  acesso_redefinido: 'Acesso redefinido pela gestão',
  cadastro_editado: 'Cadastro editado pela gestão',
  desativado: 'Participante desativado',
  reativado: 'Participante reativado',
  criado: 'Adicionado manualmente',
};

function medalClass(prize) {
  const s = (prize || '').toLowerCase();
  if (s.includes('ouro')) return 'ouro';
  if (s.includes('prata')) return 'prata';
  if (s.includes('bronze')) return 'bronze';
  if (s.includes('menção') || s.includes('mencao')) return 'mencao';
  return 'fase';
}
function medalShort(prize) {
  return { ouro: 'Ouro', prata: 'Prata', bronze: 'Bronze', mencao: 'Menção honrosa', fase: '4ª fase' }[medalClass(prize)];
}

function adminLoginPage({ error, email }) {
  return page({
    title: 'Gestão',
    body: html`<main class="login-wrap"><div class="login-card">
  <div class="brand">${MARK}<span>${NAME} <small>Gestão</small></span></div>
  <h1>Entrar na gestão</h1>
  ${error ? html`<div class="notice error" role="alert"><p>${error}</p></div>` : ''}
  <form method="post" action="/gestao/entrar" novalidate>
    <div class="field"><label for="email">E-mail</label><input id="email" name="email" type="email" autocomplete="username" required value="${email || ''}" autofocus></div>
    <div class="field"><label for="senha">Senha</label><input id="senha" name="senha" type="password" autocomplete="current-password" required></div>
    <button class="btn block" type="submit">Entrar</button>
  </form>
</div></main>`,
  });
}

function adminSetupPage({ email, name, error }) {
  return page({
    title: 'Configurar gestão',
    scripts: ['setup.js'],
    body: html`<main class="login-wrap"><div class="login-card">
  <div class="brand">${MARK}<span>${NAME} <small>Gestão</small></span></div>
  <h1>Crie seu acesso de gestor</h1>
  <p class="muted">Este link funciona uma única vez. Depois dele, a gestão passa a abrir com o seu e-mail e a senha que você escolher aqui. Os participantes da planilha entram no portal no mesmo passo.</p>
  ${error ? html`<div class="notice error" role="alert"><p>${error}</p></div>` : ''}
  <form method="post" action="/gestao/configurar" novalidate>
    <input type="hidden" name="chave" id="chave">
    <div class="field"><label for="name">Seu nome</label><input id="name" name="name" required value="${name || ''}"></div>
    <div class="field"><label for="email">E-mail</label><input id="email" name="email" type="email" autocomplete="username" required value="${email || ''}"></div>
    <div class="field"><label for="nova">Senha</label><span class="help">Pelo menos 12 caracteres.</span><input id="nova" name="nova" type="password" autocomplete="new-password" minlength="12" required></div>
    <div class="field"><label for="confirma">Repita a senha</label><input id="confirma" name="confirma" type="password" autocomplete="new-password" required></div>
    <p class="error-text" id="nokey" hidden>Este endereço está incompleto. Abra o link completo que você recebeu.</p>
    <button class="btn block" type="submit" id="go">Criar acesso e entrar</button>
  </form>
</div></main>`,
  });
}

function barChart({ title, sub, items, total, hrefFor }) {
  const max = Math.max(1, ...items.map(i => i.n));
  return html`<div class="chart"><h2>${title}</h2>${sub ? html`<p class="sub">${sub}</p>` : html`<p class="sub">${total} participantes</p>`}
    ${items.map(i => {
      const inner = html`<span class="lbl" title="${i.label}">${i.label}</span><span class="track-bar"><span style="width:${(i.n / max * 100).toFixed(1)}%"></span></span><span class="val">${i.n}</span>`;
      const href = hrefFor && hrefFor(i);
      return href ? html`<a class="hbar" href="${href}" title="${i.label}: ${i.n}">${inner}</a>` : html`<div class="hbar" title="${i.label}: ${i.n}">${inner}</div>`;
    })}
  </div>`;
}

function dashboardPage({ admin, rows, settings }) {
  const total = rows.length;
  const count = fn => rows.filter(fn).length;
  const sent = count(r => r.status === 'enviado');
  const prog = count(r => r.status === 'em_andamento');
  const notStarted = count(r => r.status === 'nao_iniciado');
  const never = count(r => r.status === 'nao_acessou');
  const answered = rows.filter(r => r.status === 'enviado' || r.status === 'em_andamento');
  const group = (list, key, order) => {
    const m = new Map();
    for (const r of list) { const v = r[key]; if (v === '' || v === null || v === undefined) continue; m.set(v, (m.get(v) || 0) + 1); }
    let items = [...m.entries()].map(([label, n]) => ({ label: String(label), value: label, n }));
    if (order) items.sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value));
    else items.sort((a, b) => b.n - a.n);
    return items;
  };
  const L = (k, v) => `/gestao/participantes?${k}=${encodeURIComponent(v)}`;
  const ages = group(rows, 'age').sort((a, b) => a.value - b.value).map(i => ({ ...i, label: `${i.value} anos` }));
  const stages = STAGES.map((s, i) => ({ label: `${i + 1}. ${s}`, value: i + 1, n: count(r => r.stage === i + 1) }));
  const medals = ['Ouro', 'Prata', 'Bronze', 'Menção honrosa', '4ª fase'].map(m => ({ label: m, value: m, n: count(r => r.medal === m) }));
  const alerts = [
    { label: 'Menores de 16 anos (fora do estágio comum)', n: count(r => r.age !== null && r.age < 16), href: L('idade', 'menor16') },
    { label: 'Telefone inválido (não conseguem entrar)', n: count(r => !r.phoneOk), href: L('alerta', 'telefone') },
    { label: 'Sem data de nascimento (não conseguem criar a senha)', n: count(r => !r.birthOk), href: L('alerta', 'nascimento') },
    { label: 'Precisam de computador', n: count(r => r.flags.computador), href: L('alerta', 'computador') },
    { label: 'Pediram conversa particular sobre apoio', n: count(r => r.flags.conversa), href: L('alerta', 'conversa') },
    { label: 'Corrigiram dados de cadastro', n: count(r => r.corrected), href: L('alerta', 'corrigido') },
  ];
  return page({
    title: 'Painel',
    body: adminShell(admin, 'painel', html`
  <div class="page-head"><div><h1>Painel</h1><p class="muted" style="margin:0">${settings.deadline ? `Prazo do formulário: ${brDate(settings.deadline)}` : 'Prazo do formulário ainda não definido'}</p></div>
    <a class="btn secondary" href="/gestao/participantes">Ver todos os participantes</a></div>
  <div class="stats">
    <a class="stat" href="/gestao/participantes"><b>${total}</b><span>participantes</span></a>
    <a class="stat" href="${L('status', 'enviado')}"><b>${sent}</b><span>enviaram o formulário</span></a>
    <a class="stat" href="${L('status', 'em_andamento')}"><b>${prog}</b><span>em andamento</span></a>
    <a class="stat" href="${L('status', 'nao_iniciado')}"><b>${notStarted}</b><span>acessaram, não iniciaram</span></a>
    <a class="stat" href="${L('status', 'nao_acessou')}"><b>${never}</b><span>nunca acessaram</span></a>
  </div>
  <div class="charts">
    <div class="chart"><h2>Alertas</h2><p class="sub">Clique para ver quem são</p>
      <ul class="alerts">${alerts.map(a => html`<li><a href="${a.href}">${a.label}</a><b class="num">${a.n}</b></li>`)}</ul></div>
    ${barChart({ title: 'Etapa de acompanhamento', items: stages, total, hrefFor: i => L('etapa', i.value) })}
    ${barChart({ title: 'Premiação', items: medals, total, hrefFor: i => L('medalha', i.value) })}
    ${barChart({ title: 'Idade hoje', items: ages, total, hrefFor: i => L('idade', i.value) })}
    ${barChart({ title: 'Estado', items: group(rows, 'uf'), total, hrefFor: i => L('uf', i.value) })}
    ${barChart({ title: 'Sinal de trilha', sub: `${answered.filter(r => r.trilha).length} responderam. Calculado a partir das respostas; a decisão é da equipe.`, items: group(answered, 'trilha', F.TRACK_LABELS), hrefFor: i => L('trilha', i.value) })}
    ${barChart({ title: 'Caminho de interesse', sub: `${answered.filter(r => r.caminho).length} responderam`, items: group(answered, 'caminho'), hrefFor: i => L('caminho', i.value) })}
    ${barChart({ title: 'Experiência com programação', sub: `${answered.filter(r => r.programacao).length} responderam`, items: group(answered, 'programacao', Object.values(F.SHORT.programacao)), hrefFor: i => L('programacao', i.value) })}
    ${barChart({ title: 'Horas por semana nas aulas', sub: `${answered.filter(r => r.horas).length} responderam`, items: group(answered, 'horas', Object.values(F.SHORT.horas)), hrefFor: i => L('horas', i.value) })}
    ${barChart({ title: 'Horas por semana nas férias', sub: `${answered.filter(r => r.horasFerias).length} responderam`, items: group(answered, 'horasFerias', Object.values(F.SHORT.horas_ferias)), hrefFor: i => L('horasFerias', i.value) })}
    ${barChart({ title: 'Acesso a computador', sub: `${answered.filter(r => r.computador).length} responderam`, items: group(answered, 'computador', Object.values(F.SHORT.computador)), hrefFor: i => L('computador', i.value) })}
  </div>`),
  });
}

function listPage({ admin, rows }) {
  const opts = (key, order) => {
    const vals = [...new Set(rows.map(r => r[key]).filter(v => v !== '' && v !== null && v !== undefined))];
    if (order) vals.sort((a, b) => order.indexOf(a) - order.indexOf(b)); else vals.sort((a, b) => String(a).localeCompare(String(b), 'pt'));
    return vals;
  };
  const sel = (name, label, values, labels = {}) => html`<select name="${name}" aria-label="${label}"><option value="">${label}</option>${values.map(v => html`<option value="${v}">${labels[v] || v}</option>`)}</select>`;
  const tags = [...new Set(rows.flatMap(r => r.tags))].sort();
  return page({
    title: 'Participantes',
    scripts: ['admin.js'],
    body: adminShell(admin, 'lista', html`
  <div class="page-head"><h1>Participantes</h1>
    <div class="actions"><a class="btn quiet small" href="/gestao/importar">Importar planilha</a><a class="btn secondary small" href="/gestao/participantes/novo">Adicionar participante</a></div></div>
  <div id="list-app">
    <div class="toolbar">
      <input type="search" id="q" placeholder="Buscar por nome, escola, cidade ou e-mail" aria-label="Buscar">
      <button class="btn quiet small" type="button" id="clear">Limpar filtros</button>
      <button class="btn quiet small" type="button" id="save-filter">Salvar este filtro</button>
    </div>
    <div class="filters" id="filters">
      ${sel('medalha', 'Premiação', ['Ouro', 'Prata', 'Bronze', 'Menção honrosa', '4ª fase'])}
      ${sel('uf', 'Estado', opts('uf'))}
      ${sel('idade', 'Idade', ['menor16', 'menor18', 'maior18', ...opts('age').map(String)], { menor16: 'Menores de 16', menor18: 'Menores de 18', maior18: '18 ou mais' })}
      ${sel('status', 'Formulário', Object.keys(STATUS_LABEL), STATUS_LABEL)}
      ${sel('etapa', 'Etapa', STAGES.map((_, i) => String(i + 1)), Object.fromEntries(STAGES.map((s, i) => [String(i + 1), `${i + 1}. ${s}`])))}
      ${sel('trilha', 'Sinal de trilha', F.TRACK_LABELS)}
      ${sel('caminho', 'Caminho', Object.values(F.SHORT.caminho))}
      ${sel('programacao', 'Programação', Object.values(F.SHORT.programacao))}
      ${sel('horas', 'Horas nas aulas', Object.values(F.SHORT.horas))}
      ${sel('horasFerias', 'Horas nas férias', Object.values(F.SHORT.horas_ferias))}
      ${sel('computador', 'Computador', Object.values(F.SHORT.computador))}
      ${sel('tag', 'Tag', tags)}
      ${sel('alerta', 'Alerta', ['telefone', 'nascimento', 'computador', 'conversa', 'corrigido'], { telefone: 'Telefone inválido', nascimento: 'Sem data de nascimento', computador: 'Precisa de computador', conversa: 'Pediu conversa particular', corrigido: 'Corrigiu cadastro' })}
    </div>
    <div class="list-meta">
      <span class="muted" id="count" aria-live="polite"></span>
      <div class="saved" id="saved"></div>
      <div class="selbar" id="selbar">
        <span id="selcount" class="small"></span>
        <button class="btn secondary small" type="button" data-act="emails">Copiar e-mails</button>
        <button class="btn secondary small" type="button" data-act="phones">Copiar telefones</button>
        <button class="btn secondary small" type="button" data-act="export">Exportar Excel</button>
      </div>
      <a class="btn quiet small" id="export-all" href="/gestao/exportar.xlsx">Exportar lista em Excel</a>
    </div>
    <div class="table-wrap">
      <table class="data">
        <thead><tr>
          <th class="check"><input type="checkbox" id="all" aria-label="Selecionar todos"></th>
          <th data-sort="name"><button type="button">Nome</button></th>
          <th data-sort="age"><button type="button">Idade</button></th>
          <th data-sort="uf"><button type="button">Local</button></th>
          <th data-sort="medalRank"><button type="button">Premiação</button></th>
          <th data-sort="statusRank"><button type="button">Formulário</button></th>
          <th data-sort="stage"><button type="button">Etapa</button></th>
          <th data-sort="trilhaRank"><button type="button">Trilha</button></th>
          <th data-sort="caminho"><button type="button">Caminho</button></th>
          <th data-sort="programacao"><button type="button">Programação</button></th>
          <th data-sort="horas"><button type="button">Horas</button></th>
        </tr></thead>
        <tbody id="rows"></tbody>
      </table>
    </div>
  </div>
  <script type="application/json" id="data">${raw(JSON.stringify(rows).replace(/</g, '\\u003c'))}</script>
  <script type="application/json" id="stages">${raw(JSON.stringify(STAGES))}</script>`),
  });
}

function fieldRows(p) {
  const o = p.original || {};
  const row = (label, cur, orig) => {
    const changed = orig !== undefined && orig !== null && String(orig).trim() !== '' && String(orig).trim() !== String(cur || '').trim();
    return html`<dt>${label}</dt><dd>${cur || html`<span class="muted">—</span>`}${changed ? html`<span class="corrected">Corrigido pelo participante. Na planilha: ${orig}</span>` : ''}</dd>`;
  };
  return html`<dl class="kv">
    ${row('Nome', p.name, o.name && p.name !== o.name && p.name.toLowerCase() !== String(o.name).toLowerCase() ? o.name : undefined)}
    ${p.preferred_name ? html`<dt>Prefere ser chamado(a)</dt><dd>${p.preferred_name}</dd>` : ''}
    <dt>E-mail</dt><dd>${p.email}</dd>
    ${row('WhatsApp', formatPhone(p.phone), o.phone && o.phone !== p.phone ? (o.phone_raw || o.phone) : undefined)}
    ${row('Nascimento', `${brDate(p.birth_date)} (${ageOn(p.birth_date)} anos)`, o.birth_date && o.birth_date !== isoDate(p.birth_date) ? brDate(o.birth_date) : undefined)}
    ${row('Cidade', `${p.city || ''}, ${p.uf || ''}`, (o.city !== undefined && (o.city !== p.city || o.uf !== p.uf)) ? `${o.city}, ${o.uf}` : undefined)}
    ${row('Escola', p.school, o.school)}
    <dt>Premiação</dt><dd><span class="medal ${medalClass(p.prize)}">${p.prize}</span></dd>
    <dt>Inscrição</dt><dd>${p.sheet_submitted_at || brDateTime(p.created_at)}</dd>
  </dl>`;
}

function signalPanel(signal) {
  if (!signal) return html`<div class="panel"><h2>Sinal de trilha</h2><p class="muted small">Aparece quando a parte “Founder ou Developer?” for respondida.</p></div>`;
  const side = (name, points, reasons) => html`<div class="signal-side"><h3>${name} <span class="num">${points}</span></h3>
    ${reasons.length ? html`<ul>${reasons.map(r => html`<li>${r.text}<span class="muted small"> +${r.points}</span></li>`)}</ul>` : html`<p class="muted small">Nenhuma evidência nas respostas.</p>`}</div>`;
  return html`<div class="panel"><h2>Sinal de trilha <span class="pill ${signal.label === 'A definir' ? '' : 'prog'}">${signal.label}</span></h2>
    ${side('Founder', signal.founder, signal.reasons.founder)}
    ${side('Developer', signal.developer, signal.reasons.developer)}
    <p class="muted small">Soma de evidências das respostas, para apoiar a conversa. A trilha decidida pela equipe fica em Encaminhamento.</p></div>`;
}

function fichaPage({ admin, p, resp, notes, events, isMinor, templates, msg, signal }) {
  const data = resp.data || {};
  const status = !p.first_login_at ? 'nao_acessou' : resp.status;
  const wa = p.phone ? `https://wa.me/55${p.phone}` : null;
  const flash = {
    salvo: { type: 'ok', text: 'Alterações salvas.' },
    nota: { type: 'ok', text: 'Nota adicionada.' },
    acesso: { type: 'ok', text: 'Acesso redefinido. O participante volta a entrar com o WhatsApp com DDD, confirma o nascimento e cria uma senha nova.' },
    cadastro: { type: 'ok', text: 'Cadastro atualizado.' },
    erro_tel: { type: 'error', text: 'Telefone inválido. Use DDD + número, ex.: (11) 98765-4321.' },
    erro_email: { type: 'error', text: 'E-mail inválido ou já usado por outro participante.' },
  }[msg];
  const openFields = F.ALL_FIELDS.filter(f => f.open);
  return page({
    title: p.name,
    scripts: ['admin.js'],
    body: adminShell(admin, 'lista', html`
  <div class="ficha-nav"><a href="/gestao/participantes" id="back">Participantes</a>
    <span class="pn"><a class="btn quiet small" id="prev" hidden>Anterior</a><span class="muted small" id="pos"></span><a class="btn quiet small" id="next" hidden>Próximo</a></span></div>
  ${notice(flash)}
  <div class="ficha-head" data-id="${p.id}">
    <div>
      <h1>${p.preferred_name ? html`${p.preferred_name} <span class="muted" style="font-weight:400;font-size:1.1rem">(${p.name})</span>` : p.name}</h1>
      <div class="facts">
        <span class="medal ${medalClass(p.prize)}">${medalShort(p.prize)}</span>
        <span>${ageOn(p.birth_date)} anos</span>
        <span>${p.city}, ${p.uf}</span>
        <span>${p.school}</span>
        <span class="pill ${STATUS_PILL[status]}">${STATUS_LABEL[status]}</span>
        ${!p.active ? html`<span class="pill danger">Desativado</span>` : ''}
      </div>
    </div>
    <div class="actions">
      <select id="tpl" aria-label="Modelo de e-mail">
        <option value="">E-mail em branco</option>
        ${templates.map(t => html`<option value="${t.key}">${t.name}</option>`)}
      </select>
      <a class="btn" id="mail" href="mailto:${p.email}" data-log="contato_email">Abrir e-mail</a>
      ${wa ? html`<a class="btn secondary" href="${wa}" target="_blank" rel="noopener" data-log="contato_whatsapp">WhatsApp</a>` : ''}
      <button class="btn quiet small" type="button" data-copy="${p.email}">Copiar e-mail</button>
    </div>
  </div>
  <script type="application/json" id="templates">${raw(JSON.stringify(Object.fromEntries(templates.map(t => [t.key, { s: t.subject, b: t.body }]))).replace(/</g, '\\u003c'))}</script>
  <div class="ficha">
    <div>
      <section><h2>Respostas abertas</h2>
        ${resp.status === 'nao_iniciado' ? html`<p class="muted">Ainda não começou o formulário.</p>` : html`<dl>${openFields.map(f => html`<div class="open-answer"><dt>${f.label}</dt><dd>${data[f.key] || html`<span class="muted">Sem resposta</span>`}</dd></div>`)}</dl>`}
      </section>
      ${F.SECTIONS.map(s => html`<section><h2>${s.n}. ${s.title}</h2>
        ${s.profile ? fieldRows(p) : ''}
        <dl class="answers" ${s.profile ? raw('style="margin-top:1rem"') : ''}>
          ${F.visibleFields(s, isMinor).filter(f => !f.open).map(f => {
            const v = F.displayValue(f, data);
            return html`<div><dt>${f.label}</dt><dd>${v || html`<span class="muted">Sem resposta</span>`}</dd></div>`;
          })}
        </dl></section>`)}
      <section><h2>Histórico</h2>
        <ol class="timeline">${events.map(e => html`<li><time>${brDateTime(e.created_at)}</time><span>${EVENT_LABEL[e.kind] || e.kind}${e.detail && e.detail.texto ? `: ${e.detail.texto}` : ''}<span class="muted small">, por ${e.actor}</span></span></li>`)}</ol>
      </section>
    </div>
    <aside>
      ${signalPanel(signal)}
      <div class="panel"><h2>Acompanhamento</h2>
        <form method="post" action="/gestao/p/${p.id}/acompanhamento">
          <div class="field"><label for="stage">Etapa</label>
            <select id="stage" name="stage">${STAGES.map((s, i) => html`<option value="${i + 1}" ${p.stage === i + 1 ? raw('selected') : ''}>${i + 1}. ${s}</option>`)}</select></div>
          <div class="field"><label for="referral">Encaminhamento</label>
            <select id="referral" name="referral"><option value="">Não definido</option>${REFERRALS.map(r => html`<option ${p.referral === r ? raw('selected') : ''}>${r}</option>`)}</select></div>
          <div class="field"><label for="tags">Tags</label><span class="help">Separe por vírgula. Ex.: Nola implantação, pesquisa</span>
            <input id="tags" name="tags" type="text" value="${(p.tags || []).join(', ')}"></div>
          <button class="btn small" type="submit">Salvar</button>
        </form>
      </div>
      <div class="panel"><h2>Notas internas</h2>
        <form method="post" action="/gestao/p/${p.id}/nota">
          <label for="nota" class="sr-only">Nova nota</label>
          <textarea id="nota" name="body" required placeholder="O que vale lembrar sobre este participante?" style="min-height:90px"></textarea>
          <button class="btn small" type="submit" style="margin-top:.5rem">Adicionar nota</button>
        </form>
        <ul class="notes">${notes.map(n => html`<li><span class="who">${n.author}, ${brDateTime(n.created_at)}</span><p>${n.body}</p></li>`)}</ul>
      </div>
      <div class="panel"><h2>Acesso</h2>
        <dl class="kv" style="grid-template-columns:110px 1fr;font-size:.9rem;margin-bottom:.75rem">
          <dt>1º acesso</dt><dd>${p.first_login_at ? brDateTime(p.first_login_at) : 'Nunca'}</dd>
          <dt>Último</dt><dd>${p.last_login_at ? brDateTime(p.last_login_at) : '—'}</dd>
          <dt>Senha</dt><dd>${p.password_hash ? 'Própria' : 'WhatsApp com DDD'}</dd>
          ${resp.submitted_at ? html`<dt>Enviou em</dt><dd>${brDateTime(resp.submitted_at)}</dd>` : ''}
        </dl>
        <details class="inline"><summary>Redefinir acesso</summary>
          <p class="small muted">A senha volta a ser o WhatsApp com DDD. No próximo acesso, o participante confirma o nascimento e cria uma nova.</p>
          <form method="post" action="/gestao/p/${p.id}/redefinir"><button class="btn secondary small" type="submit">Confirmar redefinição</button></form>
        </details>
        <details class="inline"><summary>Editar cadastro</summary>
          <form method="post" action="/gestao/p/${p.id}/cadastro">
            <div class="field"><label for="e_name">Nome</label><input id="e_name" name="name" value="${p.name}" required></div>
            <div class="field"><label for="e_email">E-mail (login)</label><input id="e_email" name="email" type="email" value="${p.email}" required></div>
            <div class="field"><label for="e_phone">WhatsApp com DDD</label><input id="e_phone" name="phone" type="tel" value="${formatPhone(p.phone)}" required></div>
            <div class="field"><label for="e_birth">Nascimento</label><input id="e_birth" name="birth_date" type="date" value="${isoDate(p.birth_date)}"></div>
            <div class="field"><label for="e_city">Cidade</label><input id="e_city" name="city" value="${p.city || ''}"></div>
            <div class="field"><label for="e_uf">UF</label><select id="e_uf" name="uf">${UFS.map(u => html`<option ${u === p.uf ? raw('selected') : ''}>${u}</option>`)}</select></div>
            <div class="field"><label for="e_school">Escola</label><input id="e_school" name="school" value="${p.school || ''}"></div>
            <div class="field"><label for="e_prize">Premiação</label><input id="e_prize" name="prize" value="${p.prize || ''}"></div>
            <button class="btn small" type="submit">Salvar cadastro</button>
          </form>
        </details>
        <details class="inline"><summary>${p.active ? 'Desativar participante' : 'Reativar participante'}</summary>
          <p class="small muted">${p.active ? 'O participante deixa de conseguir entrar. Nada é apagado.' : 'O participante volta a conseguir entrar.'}</p>
          <form method="post" action="/gestao/p/${p.id}/ativo"><button class="btn ${p.active ? 'danger' : 'secondary'} small" type="submit">${p.active ? 'Desativar' : 'Reativar'}</button></form>
        </details>
      </div>
    </aside>
  </div>`),
  });
}

function newParticipantPage({ admin, error, v = {} }) {
  return page({
    title: 'Adicionar participante',
    body: adminShell(admin, 'lista', html`
  <p><a href="/gestao/participantes">Participantes</a></p>
  <h1>Adicionar participante</h1>
  ${error ? html`<div class="notice error"><p>${error}</p></div>` : ''}
  <form method="post" action="/gestao/participantes/novo" style="max-width:560px">
    <div class="field"><label for="name">Nome completo</label><input id="name" name="name" required value="${v.name || ''}"></div>
    <div class="field"><label for="email">E-mail (login)</label><input id="email" name="email" type="email" required value="${v.email || ''}"></div>
    <div class="field"><label for="phone">WhatsApp com DDD (senha do primeiro acesso)</label><input id="phone" name="phone" type="tel" required value="${v.phone || ''}"></div>
    <div class="field"><label for="birth_date">Data de nascimento (confirmada no primeiro acesso)</label><input id="birth_date" name="birth_date" type="date" required value="${v.birth_date || ''}"></div>
    <div class="field"><label for="city">Cidade</label><input id="city" name="city" required value="${v.city || ''}"></div>
    <div class="field"><label for="uf">UF</label><select id="uf" name="uf">${UFS.map(u => html`<option ${u === v.uf ? raw('selected') : ''}>${u}</option>`)}</select></div>
    <div class="field"><label for="school">Escola</label><input id="school" name="school" required value="${v.school || ''}"></div>
    <div class="field"><label for="prize">Premiação</label><select id="prize" name="prize">${['Medalha de Ouro', 'Medalha de Prata', 'Medalha de Bronze', 'Menção Honrosa', 'Cheguei na 4ª fase sem premiação'].map(o => html`<option ${o === v.prize ? raw('selected') : ''}>${o}</option>`)}</select></div>
    <button class="btn" type="submit">Adicionar</button>
  </form>`),
  });
}

function importPage({ admin }) {
  return page({
    title: 'Importar planilha',
    scripts: ['import.js'],
    body: adminShell(admin, 'lista', html`
  <p><a href="/gestao/participantes">Participantes</a></p>
  <h1>Importar planilha</h1>
  <p class="muted" style="max-width:640px">Envie a planilha de inscrição (.xlsx) no mesmo formato do formulário da ONIA. Quem já está no portal, identificado pelo e-mail, não é alterado. Inscrições repetidas valem pela mais recente.</p>
  <div class="panel" style="max-width:640px">
    <div class="field"><label for="file">Planilha</label><input id="file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></div>
    <div id="preview" aria-live="polite"></div>
    <button class="btn" type="button" id="go" hidden>Importar</button>
  </div>`),
  });
}

const SETTINGS_FIELDS = [
  ['whatsapp_link', 'Link de convite do grupo de WhatsApp', 'Aparece na tela inicial dos participantes.', 'url'],
  ['deadline', 'Prazo para responder', 'Depois do prazo, quem já enviou não consegue mais editar.', 'date'],
  ['intensive_dates', 'Datas do intensivo', 'Opcional. Ex.: 5 a 23/01/2027. Aparece entre parênteses depois de “janeiro” na página Como funciona e no início do portal.', 'text'],
  ['program_contact', 'Contato do programa', 'Ex.: talentos@seudominio.com.br ou WhatsApp da equipe. Aparece para os participantes.', 'text'],
  ['portal_url', 'Endereço do portal', 'Usado nos modelos de e-mail.', 'url'],
  ['org_name', 'Organização responsável', 'Aparece no aviso de privacidade.', 'text'],
  ['retention', 'Prazo de retenção dos dados', 'Ex.: 2 anos após o fim do programa.', 'text'],
  ['privacy_contact', 'Contato de privacidade', 'Para pedidos de acesso, correção ou exclusão.', 'text'],
];

function configPage({ admin, settings, templates, admins, msg, error }) {
  const flash = { salvo: { type: 'ok', text: 'Configurações salvas.' }, gestor: { type: 'ok', text: 'Gestor adicionado.' }, senha: { type: 'ok', text: 'Senha alterada.' } }[msg];
  return page({
    title: 'Configurações',
    body: adminShell(admin, 'config', html`
  <h1>Configurações</h1>
  ${notice(flash)}
  ${error ? html`<div class="notice error"><p>${error}</p></div>` : ''}
  <form method="post" action="/gestao/configuracoes">
    <h2 style="margin-top:1.5rem">Programa</h2>
    <div class="cfg-grid">
      ${SETTINGS_FIELDS.map(([k, label, help, type]) => html`<div class="field"><label for="s_${k}">${label}</label><span class="help">${help}</span>
        <input id="s_${k}" name="${k}" type="${type}" value="${settings[k] || ''}"></div>`)}
    </div>
    <h2 style="margin-top:1rem">Modelos de e-mail</h2>
    <p class="muted">Use {nome}, {portal}, {prazo} e {contato}. O botão “Abrir e-mail” da ficha abre o seu programa de e-mail com o modelo preenchido. Nada é enviado pelo portal.</p>
    <div class="cfg-grid">
      ${templates.map(t => html`<div class="panel"><h3>${t.name}</h3>
        <div class="field"><label for="t_${t.key}_s">Assunto</label><input id="t_${t.key}_s" name="tpl_${t.key}_assunto" value="${t.subject}"></div>
        <div class="field"><label for="t_${t.key}_b">Texto</label><textarea id="t_${t.key}_b" name="tpl_${t.key}_corpo" style="min-height:200px">${t.body}</textarea></div></div>`)}
    </div>
    <button class="btn" type="submit">Salvar configurações</button>
  </form>
  <div class="cfg-grid" style="margin-top:2.5rem">
    <div><h2>Gestores</h2>
      <ul class="alerts" style="margin-bottom:1rem">${admins.map(a => html`<li><span>${a.name}<span class="muted small"> ${a.email}</span></span></li>`)}</ul>
      <details class="inline"><summary>Adicionar gestor</summary>
        <form method="post" action="/gestao/gestores">
          <div class="field"><label for="g_name">Nome</label><input id="g_name" name="name" required></div>
          <div class="field"><label for="g_email">E-mail</label><input id="g_email" name="email" type="email" required></div>
          <div class="field"><label for="g_pw">Senha inicial</label><span class="help">Pelo menos 12 caracteres. Envie por um canal seguro.</span><input id="g_pw" name="senha" type="password" minlength="12" required autocomplete="new-password"></div>
          <button class="btn small" type="submit">Adicionar gestor</button>
        </form></details>
    </div>
    <div><h2>Minha senha</h2>
      <form method="post" action="/gestao/senha">
        <div class="field"><label for="m_a">Senha atual</label><input id="m_a" name="atual" type="password" required autocomplete="current-password"></div>
        <div class="field"><label for="m_n">Nova senha</label><span class="help">Pelo menos 12 caracteres.</span><input id="m_n" name="nova" type="password" minlength="12" required autocomplete="new-password"></div>
        <button class="btn small" type="submit">Trocar senha</button>
      </form>
    </div>
  </div>`),
  });
}

module.exports = { adminSetupPage, importPage, adminLoginPage, dashboardPage, listPage, fichaPage, newParticipantPage, configPage, STAGES, REFERRALS, STATUS_LABEL, EVENT_LABEL, SETTINGS_FIELDS, medalClass, medalShort };
