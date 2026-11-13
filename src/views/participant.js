'use strict';
const { html, raw } = require('../html');
const { page, participantShell, notice, MARK } = require('./layout');
const F = require('../form');
const { NAME } = require('../brand');
const { UFS, formatPhone, firstName, brDate, brDateTime, ageOn, isoDate } = require('../util');

const MESSAGES = {
  enviado: { type: 'ok', text: 'Formulário enviado. Obrigado por compartilhar sua trajetória e seus interesses! A equipe vai usar suas respostas para organizar as próximas conversas.' },
  senha: { type: 'ok', text: 'Senha alterada.' },
  bemvindo: { type: 'ok', text: 'Senha criada. A partir de agora, entre com o seu e-mail e essa senha.' },
  prazo: { type: 'warn', text: 'O prazo para editar respostas já terminou. Fale com a equipe se precisar corrigir algo.' },
};

function privacyText(s) {
  return html`<p>Suas respostas serão usadas por ${s.org_name || '[organização responsável]'} para conhecer seu perfil, entrar em contato e organizar sua participação neste programa: o intensivo, as trilhas, os grupos de projeto e as oportunidades de estágio e pesquisa. O acesso é limitado à equipe responsável e aos serviços usados para operar este portal.</p>
<p>Antes de encaminhar seu perfil a uma empresa parceira, explicaremos quem receberá as informações e com qual finalidade. As respostas não serão publicadas nem usadas para divulgar sua imagem.</p>
<p>Os dados serão mantidos por ${s.retention || '[prazo de retenção]'}, salvo obrigações legais. Para tirar dúvidas ou pedir acesso, correção ou exclusão, fale com ${s.privacy_contact || '[contato de privacidade]'}. Informações sobre equipamentos e apoio servem para planejar condições de participação, não para dar nota ao seu potencial.</p>`;
}

function loginPage({ error, email, settings }) {
  return page({
    title: 'Entrar',
    body: html`<main class="login-wrap"><div class="login-card">
  <div class="brand">${MARK}<span>${NAME}</span></div>
  <h1>Entre no portal</h1>
  <p class="muted">Programa de formação para os melhores finalistas da 2ª Olimpíada Nacional de IA: um intensivo com duas trilhas, Founder e Product Developer.</p>
  ${error ? html`<div class="notice error" role="alert"><p>${error}</p></div>` : ''}
  <form method="post" action="/entrar" novalidate>
    <div class="field">
      <label for="email">E-mail</label>
      <input id="email" name="email" type="email" autocomplete="username" inputmode="email" required value="${email || ''}" autofocus>
    </div>
    <div class="field">
      <label for="senha">Senha</label>
      <span class="help" id="senha-help">No primeiro acesso, use o seu WhatsApp com DDD, só os números. Ex.: 11987654321. Em seguida, você confirma sua data de nascimento e cria uma senha.</span>
      <input id="senha" name="senha" type="password" autocomplete="current-password" required aria-describedby="senha-help">
    </div>
    <button class="btn block" type="submit">Entrar</button>
  </form>
  <p class="small" style="margin-top:1.25rem"><a href="/esqueci">Esqueci minha senha</a></p>
  <p class="small"><a href="/como-funciona">Como funciona o programa e como acessar</a></p>
</div></main>`,
  });
}

const PARTNERS = 'Arcca, Nola ou Aggir Capital';

// Página pública: explica o programa e o passo a passo de acesso. Abre sem login,
// para poder ser enviada por e-mail e lida também pelos responsáveis.
function programPage({ settings, p, portalHost }) {
  const deadline = settings.deadline ? brDate(settings.deadline) : null;
  const header = p
    ? html`<header class="top"><a class="brand" href="/inicio">${MARK}<span>${NAME}</span></a>
  <nav aria-label="Principal"><a href="/inicio">Voltar ao início</a></nav></header>`
    : html`<header class="top"><a class="brand" href="/entrar">${MARK}<span>${NAME}</span></a>
  <nav aria-label="Principal"><a class="btn small" href="/entrar">Entrar no portal</a></nav></header>`;
  const step = (n, title, when, text) => html`<li><span class="dot" aria-hidden="true">${n}</span>
    <span class="step-title">${title}<span class="meta">${when}</span></span><p class="step-text">${text}</p></li>`;
  return page({
    title: 'Como funciona',
    body: html`${header}
<main class="narrow prog">
  <div class="hello"><h1>Como funciona a ${NAME}</h1>
    <p>A ${NAME} é um programa de formação para os melhores finalistas da 2ª Olimpíada Nacional de IA. Em um intensivo de 3 semanas, você aprende a transformar um problema real em um produto com inteligência artificial. A primeira semana é com todos juntos. Nas duas seguintes, cada participante segue uma trilha: Founder ou Product Developer.</p>
    <p>Ao final, os melhores colocados recebem convite para estágio na ${PARTNERS}. Depois, quem quiser também pode desenvolver um projeto próprio, com possibilidade de investimento.</p>
    <p class="muted">Não precisa saber programar, ter currículo nem experiência profissional. As vagas são limitadas, e a seleção avalia empenho e forma de pensar, não o que você já sabe.</p></div>

  <h2>Etapas</h2>
  <ol class="track">
    ${step(1, 'Formulário', deadline ? `Agora, até ${deadline}` : 'Agora', 'Você entra no portal e responde um questionário de 15 a 20 minutos sobre seus interesses e sua experiência.')}
    ${step(2, 'Seleção', 'Dezembro', 'Três desafios curtos, um por semana, com no máximo 5 horas no total: um de Founder, um de Product Developer e um em dupla.')}
    ${step(3, 'Intensivo', `Janeiro, 3 semanas${settings.intensive_dates ? ` (${settings.intensive_dates})` : ''}`, 'Semana 1 com todos juntos. Semanas 2 e 3 na sua trilha, Founder ou Product Developer.')}
    ${step(4, 'Depois do intensivo', 'Estágio e projeto próprio', `Ao final, os melhores colocados recebem convite para estágio na ${PARTNERS}. Depois, quem quiser também pode desenvolver um projeto próprio, com possibilidade de investimento.`)}
  </ol>

  <section>
    <h2>Semana 1: todos juntos</h2>
    <p>Na primeira semana ninguém escolhe trilha ainda. Todo mundo pratica as duas coisas que o programa inteiro exige:</p>
    <ul>
      <li>Conversar com pessoas de verdade sobre um problema real, sem oferecer solução, para entender o que elas vivem.</li>
      <li>Colocar uma primeira página no ar com ajuda de IA, mesmo sem nunca ter programado.</li>
    </ul>
    <p>No fim da semana, você conversa com a equipe e escolhe a trilha das duas semanas seguintes.</p>
  </section>

  <section>
    <h2>Semanas 2 e 3: trilha Founder</h2>
    <p>Para quem quer descobrir um problema que vale resolver e testar se ele vira um negócio.</p>
    <ul>
      <li>Mais conversas com possíveis usuários e escolha de um problema e de um público.</li>
      <li>Um protótipo nas mãos de pessoas de fora, feito com um colega da trilha Product Developer.</li>
      <li>Um compromisso real de alguém que quer usar, uma conta simples de quanto custa e quanto cobraria, e uma apresentação de 3 minutos.</li>
    </ul>
  </section>

  <section>
    <h2>Semanas 2 e 3: trilha Product Developer</h2>
    <p>Para quem quer construir o produto com apoio de IA e entender como ele funciona por dentro.</p>
    <ul>
      <li>Um aplicativo com login, banco de dados e uma função de IA, no ar.</li>
      <li>O que pedir à IA e como conferir o que ela entrega: passos pequenos, testes e revisão de segurança.</li>
      <li>Uma lista de checagem de segurança e uma demonstração em que você explica cada decisão do seu código.</li>
    </ul>
    <p class="muted">Nas duas trilhas, toda semana tem uma entrega prática, e o que conta é conseguir explicar o que você fez.</p>
  </section>

  <section>
    <h2>Depois do intensivo: estágio e projeto próprio</h2>
    <div class="panel"><h3>Estágio em uma empresa parceira</h3>
      <p>Ao final do intensivo, os melhores colocados recebem convite para estágio na ${PARTNERS}. A classificação considera as entregas das três semanas, e a empresa leva em conta a trilha e o interesse de cada um.</p></div>
    <div class="panel"><h3>Projeto próprio</h3>
      <p>Depois do intensivo, quem quiser também pode desenvolver um projeto próprio. Os projetos com mais potencial podem receber investimento.</p></div>
    <p class="muted small">O estágio segue a Lei do Estágio (Lei nº 11.788/2008): é preciso ter pelo menos 16 anos, estar matriculado na escola e assinar um termo de compromisso com a escola e, para menores de 18 anos, com o responsável. Carga horária e demais condições são combinadas com cada empresa.</p>
  </section>

  <section id="acesso">
    <h2>Como acessar o portal</h2>
    <ol class="steps">
      <li>Abra <a href="/entrar">${portalHost}</a> no celular ou no computador. Os dois funcionam.</li>
      <li>Em <strong>E-mail</strong>, digite o mesmo e-mail que você usou na inscrição da olimpíada.</li>
      <li>Em <strong>Senha</strong>, no primeiro acesso, digite o seu WhatsApp com DDD, só os números. Exemplo: 11987654321.</li>
      <li>Clique em <strong>Entrar</strong>. O portal vai pedir a sua <strong>data de nascimento</strong>, a mesma da inscrição. Isso confirma que é você, porque outras pessoas podem conhecer o seu telefone.</li>
      <li>Crie uma <strong>senha nova</strong>, com pelo menos 8 caracteres, e repita. A partir daí, você entra sempre com o e-mail e essa senha.</li>
      <li>Leia o <strong>aviso de privacidade</strong>, marque a caixa de ciência e clique em <strong>Salvar senha e continuar</strong>.</li>
      <li>Na tela de início, clique em <strong>Começar</strong>.</li>
      <li>O formulário tem <strong>${F.SECTIONS.length} partes</strong>. Suas respostas são salvas enquanto você escreve, e você pode parar e continuar depois de onde parou.</li>
      <li>Na parte <strong>Founder ou Product Developer?</strong>, responda o que combina com você hoje. Não é uma escolha definitiva.</li>
      <li>No fim, em <strong>Revisar e enviar</strong>, confira tudo e clique em <strong>Enviar formulário</strong>. Até o prazo, você ainda pode voltar e editar.</li>
    </ol>
    ${p ? '' : html`<a class="btn" href="/entrar">Entrar no portal</a>`}
  </section>

  <section>
    <h2>Se algo der errado</h2>
    <ul>
      <li><strong>O portal diz que e-mail ou senha não conferem:</strong> confira se usou o e-mail da inscrição e o WhatsApp só com números, com DDD e sem o +55.</li>
      <li><strong>A data de nascimento não confere:</strong> pode haver erro no cadastro. Fale com a equipe, que corrige.</li>
      <li><strong>Esqueceu a senha:</strong> clique em <strong>Esqueci minha senha</strong> e fale com a equipe. O acesso é redefinido e você cria uma senha nova.</li>
      <li><strong>Errou a senha muitas vezes:</strong> o acesso fica bloqueado por 15 minutos. Espere e tente de novo.</li>
    </ul>
  </section>

  <section>
    <h2>Perguntas frequentes</h2>
    <dl class="faq">
      <dt>Preciso saber programar?</dt><dd>Não. A trilha Product Developer começa do zero, e a trilha Founder não exige código.</dd>
      <dt>O formulário elimina alguém?</dt><dd>Não. Ele serve para conhecer você e planejar. A seleção acontece em dezembro, com os desafios.</dd>
      <dt>Posso fazer o estágio e também um projeto próprio?</dt><dd>Sim. Uma coisa não exclui a outra. O projeto próprio é aberto a quem quiser, receba ou não o convite de estágio, e pode receber investimento.</dd>
      <dt>Tenho menos de 18 anos.</dt><dd>Converse com seu responsável antes de responder. Para participar do intensivo, ele vai assinar um termo. Para o estágio, a lei exige pelo menos 16 anos.</dd>
      <dt>Quanto tempo leva o formulário?</dt><dd>De 15 a 20 minutos. Escreva de forma simples, com exemplos reais.</dd>
      <dt>É presencial?</dt><dd>Não. O programa é online, com encontros ao vivo pela internet. Ninguém precisa sair de casa nem mudar de cidade. Os horários serão confirmados com os selecionados, e o formulário pergunta sua disponibilidade.</dd>
      <dt>Posso usar IA para escrever as respostas?</dt><dd>Pode usar para revisar o texto, mas não invente experiências e não cole dados pessoais em ferramentas externas.</dd>
    </dl>
  </section>

  ${settings.program_contact ? html`<div class="panel"><h2>Dúvidas</h2><p>Fale com a equipe: ${settings.program_contact}</p></div>` : ''}
</main>`,
  });
}

function forgotPage({ settings }) {
  return page({
    title: 'Esqueci minha senha',
    body: html`<main class="login-wrap"><div class="login-card">
  <div class="brand">${MARK}<span>${NAME}</span></div>
  <h1>Esqueceu a senha?</h1>
  <p>Fale com a equipe do programa${settings.program_contact ? html`: <strong>${settings.program_contact}</strong>` : ' pelo grupo de WhatsApp'}.</p>
  <p class="muted">A equipe redefine o seu acesso. Depois disso, você entra de novo com o seu WhatsApp com DDD, confirma sua data de nascimento e cria uma senha nova.</p>
  <a class="btn secondary block" href="/entrar">Voltar para a entrada</a>
</div></main>`,
  });
}

function firstAccessPage({ p, error, settings, isMinor, nascimento }) {
  return page({
    title: 'Crie sua senha',
    body: html`<main class="login-wrap"><div class="login-card">
  <div class="brand">${MARK}<span>${NAME}</span></div>
  <h1>Olá, ${firstName(p)}. Crie sua senha</h1>
  <p class="muted">Seu telefone fica visível para outros participantes no grupo de WhatsApp. Por isso, a partir de agora você entra com uma senha só sua.</p>
  ${error ? html`<div class="notice error" role="alert"><p>${error}</p></div>` : ''}
  <form method="post" action="/primeiro-acesso" novalidate>
    <div class="field">
      <label for="nascimento">Sua data de nascimento</label>
      <span class="help" id="nasc-help">A mesma que você informou na inscrição. Serve para confirmar que é você.</span>
      <input id="nascimento" name="nascimento" type="date" required min="1985-01-01" max="2016-12-31" value="${nascimento || ''}" aria-describedby="nasc-help">
    </div>
    <div class="field">
      <label for="nova">Nova senha</label>
      <span class="help" id="nova-help">Pelo menos 8 caracteres.</span>
      <input id="nova" name="nova" type="password" autocomplete="new-password" minlength="8" required aria-describedby="nova-help">
    </div>
    <div class="field">
      <label for="confirma">Repita a senha</label>
      <input id="confirma" name="confirma" type="password" autocomplete="new-password" minlength="8" required>
    </div>
    <details class="privacy" open><summary>Aviso de privacidade</summary><div>${privacyText(settings)}</div></details>
    ${isMinor ? html`<p class="small muted">Como você tem menos de 18 anos, converse com seu responsável antes de responder ao formulário.</p>` : ''}
    <label class="choice" style="margin-bottom:1.25rem"><input type="checkbox" name="ciente" value="1" required> <span>Li o aviso de privacidade e sei como entrar em contato com a equipe.</span></label>
    <button class="btn block" type="submit">Salvar senha e continuar</button>
  </form>
</div></main>`,
  });
}

function homePage({ p, resp, progress, settings, msg, isMinor }) {
  const sent = resp.status === 'enviado';
  const pct = progress.pct;
  const firstOpen = progress.sections.find(s => !s.complete && s.total > 0);
  const nextHref = firstOpen ? `/formulario/${firstOpen.n}` : '/formulario/revisao';
  const deadline = settings.deadline ? brDate(settings.deadline) : null;
  let card;
  if (sent) {
    card = html`<h2>Formulário enviado</h2>
      <p class="muted">Enviado em ${brDateTime(resp.submitted_at)}.${deadline ? ` Você pode revisar e editar suas respostas até ${deadline}.` : ' Você ainda pode revisar e editar suas respostas.'}</p>
      <a class="btn secondary" href="/formulario/revisao">Ver minhas respostas</a>`;
  } else if (resp.status === 'em_andamento') {
    card = html`<h2>Você já começou</h2>
      <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso do formulário"><span style="width:${pct}%"></span></div>
      <p class="muted">${pct}% das perguntas obrigatórias respondidas. Suas respostas ficam salvas enquanto você escreve.</p>
      <a class="btn" href="${nextHref}">Continuar de onde parei</a>`;
  } else {
    card = html`<h2>Queremos conhecer você</h2>
      <p class="muted">São ${F.SECTIONS.length} partes curtas, cerca de 15 a 20 minutos. Não precisa ter currículo nem experiência profissional. “Ainda não aprendi” é uma resposta válida. Você pode parar e continuar depois.</p>
      <a class="btn" href="/formulario/1">Começar</a>`;
  }
  const flash = msg && MESSAGES[msg];
  return page({
    title: 'Início',
    scripts: [],
    body: participantShell(p, 'inicio', html`
  ${notice(flash)}
  <div class="hello"><h1>Olá, ${firstName(p)}</h1>
    <p class="muted">Você participou da Olimpíada Nacional de IA. Estamos montando um intensivo com duas trilhas, Founder e Product Developer, e queremos entender qual combina com você.${deadline && !sent ? ` Responda até ${deadline}.` : ''}</p></div>
  <div class="status-card">${card}</div>
  <h2>Partes do formulário</h2>
  <ol class="track">
    ${progress.sections.map(s => {
      const optional = s.total === 0;
      const done = !optional && s.complete;
      const meta = optional ? 'Opcional' : done ? 'Completa' : s.done > 0 ? `${s.done} de ${s.total} obrigatórias` : 'Não iniciada';
      return html`<li class="${done ? 'done' : s.done > 0 ? 'partial' : ''}">
      <span class="dot" aria-hidden="true">${done ? '✓' : s.n}</span>
      <a href="/formulario/${s.n}">${s.title}<span class="meta">${meta}</span></a>
    </li>`; })}
    <li class="${sent ? 'done' : ''}"><span class="dot" aria-hidden="true">${sent ? '✓' : F.SECTIONS.length + 1}</span>
      <a href="/formulario/revisao">Revisar e enviar<span class="meta">${sent ? 'Enviado' : 'Confira tudo antes de enviar'}</span></a></li>
  </ol>
  <div class="panel"><h2>Como vai funcionar</h2>
    <ul class="plain">
      <li><strong>Intensivo de 3 semanas em janeiro</strong>${settings.intensive_dates ? ` (${settings.intensive_dates})` : ''}, online, com encontros ao vivo e prática.</li>
      <li><strong>Trilha Founder:</strong> descobrir um problema real, conversar com pessoas e testar se ele vira um negócio.</li>
      <li><strong>Trilha Product Developer:</strong> construir um produto com apoio de IA, do zero até colocar no ar com segurança. Não precisa saber programar.</li>
      <li><strong>Depois do intensivo</strong>, os melhores colocados recebem convite para estágio na ${PARTNERS}. Depois, quem quiser também pode desenvolver um projeto próprio, com possibilidade de investimento.</li>
    </ul>
    <p class="muted small">As vagas do intensivo são limitadas. Depois do formulário, em dezembro, haverá uma seleção com desafios curtos, que avaliam empenho e forma de pensar, não experiência prévia. Condições e datas são confirmadas com cada participante.</p>
    <a class="btn secondary" href="/como-funciona">Ver como funciona, passo a passo</a>
  </div>
  <div class="panel"><h2>Grupo do programa</h2>
    ${settings.whatsapp_link
      ? html`<p class="muted">Os avisos para todos os participantes saem no grupo de WhatsApp.</p><a class="btn secondary" href="${settings.whatsapp_link}" target="_blank" rel="noopener">Entrar no grupo de WhatsApp</a>`
      : html`<p class="muted">O link do grupo de WhatsApp vai aparecer aqui em breve.</p>`}
  </div>
  ${settings.program_contact ? html`<div class="panel"><h2>Dúvidas</h2><p>Fale com a equipe: ${settings.program_contact}</p></div>` : ''}
`),
  });
}

function profileInputs(p, errors) {
  const val = k => k === 'birth_date' ? isoDate(p.birth_date) : k === 'phone' ? formatPhone(p.phone) : (p[k] || '');
  const fieldHtml = f => {
    const err = errors[f.key];
    const id = 'pf_' + f.key;
    let input;
    if (f.type === 'uf') {
      input = html`<select id="${id}" name="pf_${f.key}" required>${UFS.map(u => html`<option ${u === p.uf ? raw('selected') : ''}>${u}</option>`)}</select>`;
    } else if (f.type === 'date') {
      input = html`<input id="${id}" name="pf_${f.key}" type="date" value="${val(f.key)}" required min="1985-01-01" max="2016-12-31">`;
    } else {
      input = html`<input id="${id}" name="pf_${f.key}" type="${f.inputmode === 'tel' ? 'tel' : 'text'}" value="${val(f.key)}" maxlength="${f.max}" ${f.required ? raw('required') : ''} ${f.inputmode ? raw(`inputmode="${f.inputmode}" autocomplete="tel"`) : ''}>`;
    }
    const full = ['name', 'school'].includes(f.key);
    return html`<div class="field ${full ? 'full' : ''} ${err ? 'has-error' : ''}" data-field="pf_${f.key}">
      <label for="${id}">${f.label}${f.required ? '' : html` <span class="req">(opcional)</span>`}</label>
      ${input}
      <div class="error-text" ${err ? '' : raw('hidden')}>${err || ''}</div>
    </div>`;
  };
  return html`<div class="profile-box">
    <p class="readonly-line"><span class="muted">E-mail de acesso</span><strong>${p.email}</strong><span class="small muted">Para trocar o e-mail, fale com a equipe.</span></p>
    ${p.prize ? html`<p class="readonly-line"><span class="muted">Premiação na 2ª ONIA</span><strong>${p.prize}</strong></p>` : ''}
    <div class="grid2">${F.PROFILE_FIELDS.map(fieldHtml)}</div>
  </div>`;
}

function fieldInput(f, data, locked) {
  const v = data[f.key];
  const dis = locked ? raw('disabled') : '';
  const reqMark = f.required ? '' : html` <span class="req">(opcional)</span>`;
  const help = f.help ? html`<span class="help" id="h_${f.key}">${f.help}</span>` : '';
  const describedBy = f.help ? raw(`aria-describedby="h_${f.key}"`) : '';
  if (f.type === 'radio' || f.type === 'checkbox') {
    const sel = f.type === 'checkbox' ? (Array.isArray(v) ? v : []) : [v];
    const otherVal = data[f.key + '_outro'] || '';
    const otherOn = f.other && sel.includes(f.other);
    return html`<fieldset class="field" data-field="${f.key}" ${f.maxChoices ? raw(`data-max="${f.maxChoices}"`) : ''} ${f.exclusive ? raw(`data-exclusive="${f.exclusive.replace(/"/g, '&quot;')}"`) : ''}>
      <legend>${f.label}${reqMark}</legend>${help}
      <div class="choices">
        ${f.options.map(o => html`<label class="choice"><input type="${f.type}" name="${f.key}" value="${o}" ${sel.includes(o) ? raw('checked') : ''} ${dis} ${f.other === o ? raw('data-other="1"') : ''}> <span>${o}</span></label>`)}
      </div>
      ${f.other ? html`<div class="other-input" ${otherOn ? '' : raw('hidden')}><label class="sr-only" for="${f.key}_outro">Qual?</label><input type="text" id="${f.key}_outro" name="${f.key}_outro" maxlength="200" placeholder="Qual?" value="${otherVal}" ${dis}></div>` : ''}
    </fieldset>`;
  }
  const id = 'q_' + f.key;
  const input = f.type === 'textarea'
    ? html`<textarea id="${id}" name="${f.key}" maxlength="${f.max}" ${describedBy} ${dis} data-count="${f.max}">${v || ''}</textarea><span class="counter" aria-hidden="true"></span>`
    : html`<input id="${id}" name="${f.key}" type="${f.type === 'email' ? 'email' : 'text'}" maxlength="${f.max}" value="${v || ''}" ${f.placeholder ? raw(`placeholder="${f.placeholder}"`) : ''} ${describedBy} ${dis}>`;
  return html`<div class="field" data-field="${f.key}"><label for="${id}">${f.label}${reqMark}</label>${help}${input}</div>`;
}

function sectionPage({ p, section, data, errors = {}, isMinor, progress, locked }) {
  const n = section.n;
  const total = F.SECTIONS.length;
  const pct = progress.pct;
  return page({
    title: section.title,
    scripts: ['form.js'],
    body: participantShell(p, '', html`
  <div class="form-head">
    <div class="step"><span>Parte ${n} de ${total}</span><a href="/inicio">Ver todas as partes</a></div>
    <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso do formulário"><span style="width:${pct}%"></span></div>
    <h1>${section.title}</h1>
    <p class="muted">${section.intro}</p>
  </div>
  ${locked ? html`<div class="notice warn"><p>O prazo para editar terminou. Suas respostas aparecem apenas para leitura.</p></div>` : ''}
  <form method="post" action="/formulario/${n}" id="qform" data-section="${n}" novalidate>
    ${section.profile && !locked ? profileInputs(p, errors) : ''}
    ${F.visibleFields(section, isMinor).map(f => fieldInput(f, data, locked))}
    <div class="form-nav">
      ${n > 1 ? html`<button class="btn secondary" type="submit" name="ir" value="voltar">Voltar</button>` : html`<a class="btn secondary" href="/inicio">Início</a>`}
      <span class="save-state" id="save-state" aria-live="polite"></span>
      <button class="btn" type="submit" name="ir" value="seguir">${n < total ? 'Salvar e continuar' : 'Revisar respostas'}</button>
    </div>
  </form>`),
  });
}

function reviewPage({ p, data, isMinor, missing, resp, locked, profileOk }) {
  const sent = resp.status === 'enviado';
  const profileRows = [
    ['Nome', p.name], ['Como prefere ser chamado(a)', p.preferred_name], ['E-mail', p.email], ['WhatsApp', formatPhone(p.phone)],
    ['Data de nascimento', brDate(p.birth_date)], ['Cidade', p.city && `${p.city}, ${p.uf}`], ['Escola', p.school],
  ];
  return page({
    title: 'Revisar e enviar',
    body: participantShell(p, '', html`
  <div class="form-head">
    <div class="step"><span>Revisão</span><a href="/inicio">Ver todas as partes</a></div>
    <h1>${sent ? 'Suas respostas' : 'Revise antes de enviar'}</h1>
    <p class="muted">${sent ? `Enviado em ${brDateTime(resp.submitted_at)}. ${locked ? 'O prazo de edição terminou.' : 'Você pode editar qualquer parte até o prazo.'}` : 'Confira suas respostas. Para mudar algo, use “Editar” na parte correspondente.'}</p>
  </div>
  ${!sent && missing.length ? html`<div class="notice warn"><p><strong>Faltam ${missing.length} ${missing.length === 1 ? 'resposta obrigatória' : 'respostas obrigatórias'}:</strong></p>
    <ul style="margin:.4rem 0 0;padding-left:1.2rem">${missing.map(m => html`<li><a href="/formulario/${m.section}">Parte ${m.section}</a>: ${m.label}</li>`)}</ul></div>` : ''}
  ${F.SECTIONS.map(s => html`<section class="review-section">
    <header><h2>${s.n}. ${s.title}</h2>${locked ? '' : html`<a href="/formulario/${s.n}">Editar</a>`}</header>
    <dl>
      ${s.profile ? profileRows.map(([k, v]) => html`<div class="qa"><dt>${k}</dt><dd class="${v ? '' : 'empty'}">${v || 'Sem resposta'}</dd></div>`) : ''}
      ${F.visibleFields(s, isMinor).map(f => {
        const v = F.displayValue(f, data);
        const cls = v ? '' : f.required ? 'missing' : 'empty';
        return html`<div class="qa"><dt>${f.label}</dt><dd class="${cls}">${v || (f.required ? 'Falta responder' : 'Sem resposta')}</dd></div>`;
      })}
    </dl>
  </section>`)}
  ${sent ? html`<p><a class="btn secondary" href="/inicio">Voltar ao início</a></p>` : html`<form method="post" action="/formulario/enviar" class="form-nav">
    <a class="btn secondary" href="/formulario/${F.SECTIONS.length}">Voltar</a>
    <button class="btn" type="submit" ${missing.length ? raw('disabled') : ''}>Enviar formulário</button>
  </form>`}`),
  });
}

function myDataPage({ p, msg, error }) {
  const flash = msg && MESSAGES[msg];
  return page({
    title: 'Meus dados',
    body: participantShell(p, 'dados', html`
  ${notice(flash)}
  <h1>Meus dados</h1>
  <p class="muted">Para corrigir algum dado, edite a <a href="/formulario/1">parte 1 do formulário</a>.</p>
  <dl class="kv" style="margin-bottom:2rem">
    <dt>Nome</dt><dd>${p.name}</dd>
    <dt>E-mail de acesso</dt><dd>${p.email}</dd>
    <dt>WhatsApp</dt><dd>${formatPhone(p.phone)}</dd>
    <dt>Nascimento</dt><dd>${brDate(p.birth_date)} (${ageOn(p.birth_date)} anos)</dd>
    <dt>Cidade</dt><dd>${p.city}, ${p.uf}</dd>
    <dt>Escola</dt><dd>${p.school}</dd>
    <dt>Premiação</dt><dd>${p.prize}</dd>
  </dl>
  <h2>Trocar senha</h2>
  ${error ? html`<div class="notice error" role="alert"><p>${error}</p></div>` : ''}
  <form method="post" action="/meus-dados/senha" novalidate style="max-width:400px">
    <div class="field"><label for="atual">Senha atual</label><input id="atual" name="atual" type="password" autocomplete="current-password" required></div>
    <div class="field"><label for="nova">Nova senha</label><span class="help">Pelo menos 8 caracteres.</span><input id="nova" name="nova" type="password" autocomplete="new-password" minlength="8" required></div>
    <div class="field"><label for="confirma">Repita a nova senha</label><input id="confirma" name="confirma" type="password" autocomplete="new-password" required></div>
    <button class="btn" type="submit">Trocar senha</button>
  </form>`),
  });
}

module.exports = { loginPage, forgotPage, firstAccessPage, homePage, programPage, sectionPage, reviewPage, myDataPage, privacyText };
