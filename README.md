# Portal Talentos ONIA

Portal do programa de formação para participantes da 2ª Olimpíada Nacional de IA: um intensivo com duas trilhas, Founder e Developer.

- **Participantes:** entram com o e-mail da inscrição. No primeiro acesso, a senha é o WhatsApp com DDD (só números). Em seguida, confirmam a data de nascimento e criam uma senha própria. Preenchem o formulário "Vamos conhecer você" em 7 partes, com salvamento automático.
- **Gestão (`/gestao`):** painel, lista com filtros, ficha individual, sinal de trilha, etapas, notas, tags, modelos de e-mail e exportação para Excel.

O portal não envia e-mails. Os botões da ficha abrem o programa de e-mail do gestor ou o WhatsApp.

## Rodar

Node 22 e Postgres.

```
npm install
DATABASE_URL=postgres://... ADMIN_EMAIL=... ADMIN_NAME="..." ADMIN_PASSWORD=... npm start
```

| Variável | Para quê |
| --- | --- |
| `DATABASE_URL` | Conexão com o Postgres. As tabelas são criadas na primeira execução. |
| `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` | O primeiro gestor, criado na primeira execução se ainda não houver nenhum. A senha precisa ter 12 ou mais caracteres. |
| `NODE_ENV=production` | Ativa cookies seguros e HSTS. |
| `PGSSL=1` | Só se o banco exigir SSL. |
| `PROGRAM_NAME` | Nome do programa nas telas, nos e-mails e na exportação. Sem ela, vale "Talentos ONIA". |
| `ASSET_VERSION` | Mude o valor a cada publicação que altere CSS ou JavaScript, para o navegador não usar a versão antiga. |

## Sinal de trilha

A parte 4 do formulário pergunta qual trilha o participante prefere e o que ele já fez. A gestão mostra um sinal (Founder, Developer, Híbrido ou A definir) com as evidências que o compõem. A regra está em `trackSignal`, em `src/form.js`. O sinal apoia a conversa; a trilha decidida pela equipe fica no campo Encaminhamento da ficha.

## Dados dos participantes

Nenhum dado de participante fica no repositório. Para importar a planilha de inscrição, use **Gestão > Participantes > Importar planilha**, ou rode `npm run import -- caminho/planilha.xlsx`. Quem já está no portal não é alterado. Participantes sem data de nascimento na planilha não conseguem criar a senha; o painel lista esses casos, e a correção é feita na ficha, em Editar cadastro.

## Railway

Um serviço deste repositório e um Postgres. No serviço, defina `DATABASE_URL=${{Postgres.DATABASE_URL}}`, as variáveis do gestor e `NODE_ENV=production`, e gere um domínio. O `railway.json` define o início e a checagem de saúde em `/saude`.
