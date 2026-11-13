'use strict';
// Definição única do formulário "Vamos conhecer você".
// Usada pela tela do participante, pela validação no servidor, pela ficha da gestão e pela exportação.

// Opções que também alimentam o sinal de trilha (ver trackSignal).
const TRILHA = {
  founder: 'Founder: descobrir um problema, conversar com pessoas e transformar em negócio',
  developer: 'Product Developer: construir o produto, entender como funciona e colocar no ar',
  ambas: 'As duas me atraem na mesma medida',
  nao_sei: 'Ainda não sei',
};
const PAPEL_FOUNDER = ['Conversar com possíveis usuários para entender o problema', 'Apresentar a ideia e convencer pessoas a testar', 'Fazer as contas: quanto custa, quem pagaria e quanto'];
const PAPEL_DEVELOPER = ['Construir o produto e fazer funcionar', 'Descobrir por que algo quebrou e deixar mais seguro e rápido', 'Desenhar como as partes do sistema se conectam'];
const TIME_PROPOR = 'Quero propor uma ideia e formar um grupo';
const CAMINHO_PROJETO = 'Desenvolver um projeto próprio ou explorar empreendedorismo';
const ATIVIDADE_PROGRAMAR = 'Programar e construir aplicativos ou agentes de IA';
const PROGRAMACAO_PROPRIA = ['Já construí algo próprio e consigo explicar como funciona', 'Já mantive ou melhorei um projeto usado por outras pessoas'];

const SECTIONS = [
  {
    n: 1,
    title: 'Você e seus estudos',
    intro: 'Já preenchemos o que você informou na inscrição. Confira e corrija o que estiver errado.',
    profile: true,
    fields: [
      {
        key: 'situacao', type: 'radio', required: true,
        label: 'Qual é sua situação de estudos hoje?',
        options: ['Ensino médio regular', 'Ensino médio com formação técnica/profissional', 'Ensino fundamental', 'Ensino médio concluído; ainda não iniciei graduação', 'Graduação em andamento', 'Outra situação'],
        other: 'Outra situação',
      },
      {
        key: 'serie', type: 'text', required: true, max: 150,
        label: 'Em que série ou curso você está e quando prevê concluir?',
        help: 'Informe série/curso e mês/ano previstos. Se já concluiu, informe quando. Se não souber, escreva “a confirmar”.',
        placeholder: 'Ex.: 3º ano, conclusão em dez/2026',
      },
      {
        key: 'convenio', type: 'radio', required: false,
        label: 'Sua escola já tem convênio de estágio com alguma empresa?',
        help: 'Ajuda a entender que caminhos ficam mais simples para você.',
        options: ['Sim', 'Não', 'Não sei'],
      },
      {
        key: 'resp_nome', type: 'text', required: false, max: 120, minorOnly: true,
        label: 'Nome de um responsável',
        help: 'Só usaremos esse contato se uma oportunidade precisar da participação do seu responsável.',
      },
      {
        key: 'resp_email', type: 'email', required: false, max: 160, minorOnly: true,
        label: 'E-mail desse responsável',
      },
    ],
  },
  {
    n: 2,
    title: 'Interesses e expectativas',
    intro: 'Marque o que interessa a você hoje. Isso não impede experimentar outros caminhos depois.',
    fields: [
      {
        key: 'caminho', type: 'radio', required: true,
        label: 'Qual caminho mais interessa a você neste momento?',
        options: ['Estágio remunerado em um projeto real', 'Formação prática e mentoria antes de um estágio', 'Pesquisa orientada por um mentor ou laboratório', CAMINHO_PROJETO, 'Ainda quero conhecer as possibilidades', 'Outro'],
        other: 'Outro',
      },
      {
        key: 'atividades', type: 'checkbox', required: true, maxChoices: 3,
        label: 'Quais atividades você tem mais vontade de experimentar?',
        help: 'Escolha até 3.',
        options: [ATIVIDADE_PROGRAMAR, 'Analisar dados e trabalhar com modelos de IA', 'Pesquisar matemática, algoritmos ou novas técnicas', 'Entender usuários e desenhar produtos ou experiências', 'Automatizar tarefas e melhorar processos de empresas', 'Trabalhar com robótica, sensores ou sistemas físicos', 'Ainda estou descobrindo', 'Outra'],
        exclusive: 'Ainda estou descobrindo', other: 'Outra',
      },
      {
        key: 'problemas', type: 'checkbox', required: true, maxChoices: 3,
        label: 'Em quais tipos de problema você gostaria de trabalhar?',
        help: 'Escolha até 3. Você não precisa conhecer esses setores.',
        options: ['Restaurantes, comércio e pequenos negócios', 'Educação e ferramentas para alunos ou professores', 'Operações e organização financeira de empresas', 'Análise de informações sobre negócios, startups e investimentos', 'Organização de serviços de saúde, sem decisões clínicas', 'Problemas sociais, ambientais ou da minha comunidade', 'Robótica e soluções no mundo físico', 'Estou aberto(a) a descobrir', 'Outro'],
        exclusive: 'Estou aberto(a) a descobrir', other: 'Outro',
      },
      {
        key: 'seis_meses', type: 'textarea', required: true, max: 500, open: true,
        label: 'Daqui a seis meses, o que você gostaria de ter aprendido ou construído?',
        help: 'Pode ser uma habilidade, um projeto ou uma experiência. Seja concreto(a), sem se preocupar em impressionar.',
      },
    ],
  },
  {
    n: 3,
    title: 'Experiência prática',
    intro: 'Considere o que você consegue explicar, mesmo que tenha usado ferramentas de IA. Ter pouca experiência não elimina ninguém.',
    fields: [
      {
        key: 'programacao', type: 'radio', required: true,
        label: 'Qual alternativa melhor descreve sua experiência atual com programação?',
        options: ['Ainda não programei', 'Já experimentei lógica ou programação visual', 'Já segui tutoriais e fiz pequenas alterações', ...PROGRAMACAO_PROPRIA],
      },
      {
        key: 'ja_fez', type: 'checkbox', required: true,
        label: 'Quais destas coisas você já fez e consegue explicar?',
        help: 'Marque todas as que se aplicam. Não vale apenas ter visto uma demonstração.',
        options: ['Criei um programa, site ou aplicativo', 'Conectei um programa a uma API ou serviço externo', 'Limpei ou analisei dados em planilhas ou código', 'Consultei ou organizei dados em um banco de dados', 'Integrei um modelo de IA a uma aplicação', 'Treinei ou avaliei um modelo de aprendizado de máquina', 'Usei Git para acompanhar alterações ou colaborar', 'Criei testes ou investiguei erros de um programa', 'Ainda não fiz essas atividades', 'Outra'],
        exclusive: 'Ainda não fiz essas atividades', other: 'Outra',
      },
      {
        key: 'ferramentas', type: 'text', required: false, max: 250,
        label: 'Quais linguagens ou ferramentas você já usou na prática?',
        help: 'Cite até 5. Não precisa listar ferramentas que só conhece de nome.',
        placeholder: 'Ex.: Python, JavaScript, Scratch, SQL, Git',
      },
      {
        key: 'projeto', type: 'textarea', required: true, max: 1000, open: true,
        label: 'Conte um projeto ou desafio de que você participou.',
        help: 'Pode ser da escola, da olimpíada ou pessoal, mesmo inacabado. Diga qual era o objetivo, o que você fez pessoalmente, qual dificuldade encontrou e o que funcionou ou aprendeu. Se nunca construiu um projeto, conte um problema que tentou resolver.',
      },
      {
        key: 'links', type: 'textarea', required: false, max: 600,
        label: 'Há algum link que ajude a conhecer esse trabalho?',
        help: 'Até 3 links: repositório, demonstração, texto ou apresentação. Não precisa criar nada novo. Não compartilhe materiais privados.',
      },
    ],
  },
  {
    n: 4,
    title: 'Founder ou Product Developer?',
    intro: 'O intensivo terá duas trilhas. Na Founder, você descobre um problema, conversa com pessoas e transforma isso em um negócio. Na Product Developer, você constrói o produto com apoio de IA e aprende a colocá-lo no ar com segurança. Esta resposta é um ponto de partida: a escolha é feita depois, em conversa com a equipe.',
    fields: [
      {
        key: 'trilha', type: 'radio', required: true,
        label: 'Qual trilha combina mais com você hoje?',
        help: 'Não precisa ter experiência em nenhuma das duas.',
        options: [TRILHA.founder, TRILHA.developer, TRILHA.ambas, TRILHA.nao_sei],
      },
      {
        key: 'papel', type: 'checkbox', required: true, maxChoices: 2,
        label: 'Seu grupo tem três semanas para tirar uma ideia do papel. Em quais partes você mais gostaria de passar o tempo?',
        help: 'Escolha até 2.',
        options: [...PAPEL_FOUNDER.flatMap((f, i) => [f, PAPEL_DEVELOPER[i]]), 'Ainda estou descobrindo'],
        exclusive: 'Ainda estou descobrindo',
      },
      {
        key: 'ja_fez_negocio', type: 'checkbox', required: true,
        label: 'Quais destas coisas você já fez?',
        help: 'Marque todas as que se aplicam. Vale dentro ou fora da escola.',
        options: ['Vendi um produto ou serviço, mesmo pequeno', 'Organizei um evento, clube, grêmio ou equipe', 'Convenci pessoas a participar de um projeto meu', 'Criei conteúdo ou uma página que outras pessoas acompanham', 'Procurei alguém que eu não conhecia para pedir ajuda ou informação', 'Ainda não fiz essas atividades'],
        exclusive: 'Ainda não fiz essas atividades',
      },
      {
        key: 'problema', type: 'textarea', required: true, max: 600, open: true,
        label: 'Que problema da sua escola, da sua cidade ou do seu dia a dia você gostaria de ver resolvido?',
        help: 'Diga quem sofre com ele e como as pessoas lidam com isso hoje. Não precisa ter a solução.',
      },
      {
        key: 'time', type: 'radio', required: true,
        label: 'Depois do intensivo, grupos vão desenvolver projetos próprios. Como você se vê nessa etapa?',
        options: [TIME_PROPOR, 'Quero entrar em um grupo e ajudar a construir', 'Topo qualquer um dos dois', 'Prefiro fazer só o intensivo por enquanto', 'Ainda não sei'],
      },
    ],
  },
  {
    n: 5,
    title: 'Raciocínio, aprendizado e colaboração',
    intro: 'Não há respostas certas. Queremos entender como você pensa e aprende.',
    fields: [
      {
        key: 'assistente', type: 'textarea', required: true, max: 600, open: true,
        label: 'Um assistente de IA respondeu perguntas com base em documentos e funcionou bem em três demonstrações. O que você faria antes de deixá-lo ser usado por outras pessoas?',
        help: 'Cite até três cuidados ou testes. Não precisa saber programar nem dar uma resposta técnica perfeita.',
      },
      {
        key: 'ingles', type: 'radio', required: false,
        label: 'Ao ler materiais técnicos em inglês, qual situação mais se aproxima da sua?',
        help: 'Serve para adaptar materiais e apoio, não como filtro.',
        options: ['Ainda preciso de bastante ajuda', 'Consigo acompanhar com tradutor', 'Entendo boa parte sem tradutor, mas consulto alguns termos', 'Leio com facilidade', 'Ainda não tive contato suficiente para saber'],
      },
      {
        key: 'iniciativa', type: 'textarea', required: true, max: 600, open: true,
        label: 'O que você aprendeu por iniciativa própria recentemente e como fez isso?',
        help: 'Pode ser dentro ou fora da tecnologia. Conte o que despertou sua curiosidade e como lidou com uma dificuldade.',
      },
      {
        key: 'acompanhamento', type: 'radio', required: true,
        label: 'Que tipo de acompanhamento parece ajudar mais você a aprender?',
        options: ['Um início mais guiado, com exemplos e passos claros', 'Desafios pequenos e conversas frequentes para tirar dúvidas', 'Um objetivo claro, liberdade para experimentar e revisões combinadas', 'Ainda não sei; gostaria de experimentar diferentes formas'],
      },
      {
        key: 'grupo', type: 'checkbox', required: true, maxChoices: 2,
        label: 'Em um grupo, com quais contribuições você mais se identifica?',
        help: 'Escolha até 2.',
        options: ['Investigar e buscar informações', 'Construir ou colocar uma ideia em prática', 'Testar, revisar e encontrar problemas', 'Organizar as tarefas e acompanhar combinados', 'Ouvir pessoas e explicar ideias', 'Ainda estou descobrindo'],
        exclusive: 'Ainda estou descobrindo',
      },
    ],
  },
  {
    n: 6,
    title: 'Disponibilidade e participação',
    intro: 'Estamos mapeando o que é viável para você, sem prejudicar seus estudos. Mais horas não significa perfil melhor.',
    fields: [
      {
        key: 'inicio', type: 'text', required: true, max: 120,
        label: 'A partir de quando você poderia participar?',
        help: 'Mês/ano ou uma condição, como “depois das provas” ou “nas férias”. Não é um compromisso.',
      },
      {
        key: 'horas', type: 'radio', required: true,
        label: 'Durante o período de aulas, quantas horas por semana caberiam na sua rotina?',
        options: ['Até 5 horas', 'De 6 a 10 horas', 'De 11 a 15 horas', 'De 16 a 20 horas', 'Ainda preciso avaliar com a escola e/ou meu responsável'],
      },
      {
        key: 'horas_ferias', type: 'radio', required: true,
        label: 'E durante as férias escolares, quantas horas por semana você teria?',
        help: 'As datas do intensivo ainda estão sendo definidas. Queremos saber se as férias são uma boa opção para você.',
        options: ['Até 5 horas', 'De 6 a 10 horas', 'De 11 a 20 horas', 'Mais de 20 horas', 'Não estarei disponível nas férias', 'Ainda preciso avaliar com meu responsável'],
      },
      {
        key: 'horarios', type: 'text', required: true, max: 300,
        label: 'Quais dias e horários costumam estar livres?',
        help: 'Use o horário da sua cidade. Pode escrever “a confirmar” e indicar períodos de provas ou vestibular.',
        placeholder: 'Ex.: segundas e quartas, das 14h às 17h',
      },
      {
        key: 'formatos', type: 'checkbox', required: true,
        label: 'Quais formatos seriam viáveis para você?',
        help: 'Ninguém precisa mudar de cidade.',
        options: ['Remoto', 'Presencial na minha cidade ou região próxima', 'Híbrido na minha cidade ou região próxima', 'Ainda preciso combinar'],
        exclusive: 'Ainda preciso combinar',
      },
      {
        key: 'computador', type: 'radio', required: true,
        label: 'Como é seu acesso a um computador para estudar e desenvolver projetos?',
        help: 'Serve para planejar apoio. Não é uma avaliação.',
        options: ['Tenho acesso regular a um computador', 'Uso um computador compartilhado ou com tempo limitado', 'Hoje acesso principalmente por celular ou tablet', 'Precisaria de um computador para participar', 'Prefiro conversar com a equipe sobre isso'],
      },
      {
        key: 'apoio', type: 'checkbox', required: false,
        label: 'Que apoio ajudaria você a participar?',
        help: 'Marque o que fizer sentido. Não informe renda, diagnósticos ou detalhes pessoais sensíveis.',
        options: ['Acesso à internet', 'Empréstimo de equipamento', 'Acesso a ferramentas e infraestrutura', 'Auxílio para deslocamento, caso haja atividades presenciais', 'Ajustes de agenda por causa dos estudos ou outros compromissos', 'Orientação técnica para começar', 'Gostaria de conversar em particular sobre uma adaptação ou apoio', 'Não identifico uma necessidade adicional agora'],
        exclusive: 'Não identifico uma necessidade adicional agora',
      },
      {
        key: 'responsavel', type: 'radio', required: true, minorOnly: true,
        label: 'Você já conversou com seu responsável sobre participar?',
        help: 'Esta resposta não é uma autorização formal.',
        options: ['Sim, meu responsável está ciente do meu interesse', 'Ainda não conversei', 'Gostaria de ajuda da equipe para apresentar a proposta'],
      },
    ],
  },
  {
    n: 7,
    title: 'Para fechar',
    intro: 'Último passo antes de revisar e enviar.',
    fields: [
      {
        key: 'algo_mais', type: 'textarea', required: false, max: 500,
        label: 'Há algo mais sobre você que gostaria que soubéssemos?',
        help: 'Um interesse fora da tecnologia, uma pergunta ou algo que o formulário não contemplou. Não envie dados sensíveis.',
      },
    ],
  },
];

// Campos de cadastro mostrados na seção 1 (gravados na tabela participants).
const PROFILE_FIELDS = [
  { key: 'name', label: 'Nome completo', required: true, max: 120 },
  { key: 'preferred_name', label: 'Como prefere ser chamado(a)', required: false, max: 60 },
  { key: 'phone', label: 'WhatsApp com DDD', required: true, max: 20, inputmode: 'tel' },
  { key: 'birth_date', label: 'Data de nascimento', required: true, type: 'date' },
  { key: 'city', label: 'Cidade onde mora', required: true, max: 80 },
  { key: 'uf', label: 'Estado', required: true, type: 'uf' },
  { key: 'school', label: 'Escola', required: true, max: 160 },
];

const ALL_FIELDS = SECTIONS.flatMap(s => s.fields.map(f => ({ ...f, section: s.n })));
const FIELD_BY_KEY = Object.fromEntries(ALL_FIELDS.map(f => [f.key, f]));

function visibleFields(section, isMinor) {
  return section.fields.filter(f => !f.minorOnly || isMinor);
}

function isAnswered(f, v) {
  if (f.type === 'checkbox') return Array.isArray(v) && v.length > 0;
  return typeof v === 'string' && v.trim() !== '';
}

// Limpa e valida o que veio do navegador para uma seção.
function sanitizeSection(section, body, isMinor) {
  const out = {};
  for (const f of visibleFields(section, isMinor)) {
    let v = body[f.key];
    if (f.type === 'checkbox') {
      v = (Array.isArray(v) ? v : v ? [v] : []).map(String).filter(x => f.options.includes(x));
      v = [...new Set(v)];
      if (f.exclusive && v.includes(f.exclusive) && v.length > 1) v = v.filter(x => x !== f.exclusive);
      if (f.maxChoices) v = v.slice(0, f.maxChoices);
    } else if (f.type === 'radio') {
      v = typeof v === 'string' && f.options.includes(v) ? v : '';
    } else {
      v = typeof v === 'string' ? v.replace(/\r\n/g, '\n').trim().slice(0, f.max || 2000) : '';
    }
    out[f.key] = v;
    if (f.other) {
      const chosen = f.type === 'checkbox' ? v.includes(f.other) : v === f.other;
      const ov = body[f.key + '_outro'];
      out[f.key + '_outro'] = chosen && typeof ov === 'string' ? ov.trim().slice(0, 200) : '';
    }
  }
  return out;
}

function sectionProgress(section, data, isMinor, profileOk = true) {
  const req = visibleFields(section, isMinor).filter(f => f.required);
  const done = req.filter(f => isAnswered(f, data[f.key])).length;
  const total = req.length + (section.profile ? 1 : 0);
  const doneAll = done + (section.profile && profileOk ? 1 : 0);
  return { done: doneAll, total, complete: doneAll >= total };
}

function missingRequired(data, isMinor, profileOk) {
  const missing = [];
  for (const s of SECTIONS) {
    if (s.profile && !profileOk) missing.push({ section: s.n, label: 'Dados de cadastro incompletos' });
    for (const f of visibleFields(s, isMinor)) {
      if (f.required && !isAnswered(f, data[f.key])) missing.push({ section: s.n, label: f.label });
    }
  }
  return missing;
}

function displayValue(f, data) {
  const v = data[f.key];
  if (f.type === 'checkbox') {
    if (!Array.isArray(v) || !v.length) return '';
    return v.map(x => (f.other && x === f.other && data[f.key + '_outro']) ? `${x}: ${data[f.key + '_outro']}` : x).join('\n');
  }
  if (f.other && v === f.other && data[f.key + '_outro']) return `${v}: ${data[f.key + '_outro']}`;
  return v || '';
}

// Sinal de trilha: soma evidências das respostas para apoiar a conversa com o participante.
// Não é uma decisão. A trilha definida pela equipe fica no campo "Encaminhamento".
const TRACK_LABELS = ['Founder', 'Developer', 'Híbrido', 'A definir'];

function trackSignal(data = {}) {
  if (!data.trilha) return null;
  const list = k => (Array.isArray(data[k]) ? data[k] : []);
  const founder = [], developer = [];
  const add = (side, points, text) => side.push({ points, text });

  if (data.trilha === TRILHA.founder) add(founder, 2, 'Prefere a trilha Founder');
  if (data.trilha === TRILHA.developer) add(developer, 2, 'Prefere a trilha Product Developer');
  if (data.trilha === TRILHA.ambas) { add(founder, 1, 'Sente atração pelas duas trilhas'); add(developer, 1, 'Sente atração pelas duas trilhas'); }

  for (const o of list('papel')) {
    if (PAPEL_FOUNDER.includes(o)) add(founder, 1, `Em um projeto, quer: ${o.toLowerCase()}`);
    if (PAPEL_DEVELOPER.includes(o)) add(developer, 1, `Em um projeto, quer: ${o.toLowerCase()}`);
  }

  const evidence = (key, side, what) => {
    const f = FIELD_BY_KEY[key];
    const n = list(key).filter(o => o !== f.exclusive && o !== f.other).length;
    if (n >= 1) add(side, n >= 3 ? 2 : 1, `Já fez ${n} ${n === 1 ? 'atividade' : 'atividades'} de ${what}`);
  };
  evidence('ja_fez_negocio', founder, 'negócio ou mobilização');
  evidence('ja_fez', developer, 'construção de software');

  if (data.caminho === CAMINHO_PROJETO) add(founder, 1, 'Caminho de interesse: projeto próprio ou empreendedorismo');
  if (data.time === TIME_PROPOR) add(founder, 1, 'Quer propor uma ideia e formar um grupo');
  if (PROGRAMACAO_PROPRIA.includes(data.programacao)) add(developer, 1, 'Já construiu software próprio e consegue explicar');
  if (list('atividades').includes(ATIVIDADE_PROGRAMAR)) add(developer, 1, 'Quer programar e construir aplicativos ou agentes de IA');

  const sum = side => side.reduce((a, e) => a + e.points, 0);
  const f = sum(founder), d = sum(developer);
  let label;
  if (f - d >= 2) label = 'Founder';
  else if (d - f >= 2) label = 'Developer';
  else if (f + d >= 6) label = 'Híbrido';
  else label = 'A definir';
  return { label, founder: f, developer: d, reasons: { founder, developer } };
}

// Rótulos curtos para filtros e colunas da gestão.
const SHORT = {
  caminho: {
    'Estágio remunerado em um projeto real': 'Estágio',
    'Formação prática e mentoria antes de um estágio': 'Formação antes',
    'Pesquisa orientada por um mentor ou laboratório': 'Pesquisa',
    'Desenvolver um projeto próprio ou explorar empreendedorismo': 'Projeto próprio',
    'Ainda quero conhecer as possibilidades': 'Conhecer opções',
    'Outro': 'Outro',
  },
  programacao: {
    'Ainda não programei': '0. Nunca programou',
    'Já experimentei lógica ou programação visual': '1. Lógica ou visual',
    'Já segui tutoriais e fiz pequenas alterações': '2. Tutoriais',
    'Já construí algo próprio e consigo explicar como funciona': '3. Projeto próprio',
    'Já mantive ou melhorei um projeto usado por outras pessoas': '4. Projeto usado por outros',
  },
  horas: {
    'Até 5 horas': 'até 5h',
    'De 6 a 10 horas': '6–10h',
    'De 11 a 15 horas': '11–15h',
    'De 16 a 20 horas': '16–20h',
    'Ainda preciso avaliar com a escola e/ou meu responsável': 'a avaliar',
  },
  horas_ferias: {
    'Até 5 horas': 'até 5h',
    'De 6 a 10 horas': '6–10h',
    'De 11 a 20 horas': '11–20h',
    'Mais de 20 horas': 'mais de 20h',
    'Não estarei disponível nas férias': 'indisponível',
    'Ainda preciso avaliar com meu responsável': 'a avaliar',
  },
  computador: {
    'Tenho acesso regular a um computador': 'Tem regular',
    'Uso um computador compartilhado ou com tempo limitado': 'Compartilhado',
    'Hoje acesso principalmente por celular ou tablet': 'Só celular/tablet',
    'Precisaria de um computador para participar': 'Precisa de um',
    'Prefiro conversar com a equipe sobre isso': 'Conversar',
  },
};

module.exports = { SECTIONS, PROFILE_FIELDS, ALL_FIELDS, FIELD_BY_KEY, SHORT, TRACK_LABELS, trackSignal, visibleFields, isAnswered, sanitizeSection, sectionProgress, missingRequired, displayValue };
