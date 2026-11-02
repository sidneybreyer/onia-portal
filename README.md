# Portal Talentos ONIA

Portal do programa de formação e estágio para participantes da 2ª Olimpíada Nacional de IA.

- **Participantes:** entram com o e-mail da inscrição. No primeiro acesso, a senha é o WhatsApp com DDD (só números). Depois, criam uma senha própria. Preenchem o formulário "Vamos conhecer você" em 6 partes, com salvamento automático.
- **Gestão (`/gestao`):** painel, lista com filtros, ficha individual, etapas, notas, tags, modelos de e-mail e exportação para Excel.

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
| `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` | O primeiro gestor, criado só se ainda não houver nenhum. A senha precisa ter 12 ou mais caracteres. |
| `NODE_ENV=production` | Ativa cookies seguros e HSTS. |
| `SEED_KEY` | Chave da planilha criptografada (importação inicial). |
| `PGSSL=1` | Só se o banco exigir SSL. |

## Dados dos participantes

A planilha original **não fica no repositório**. Há só uma cópia criptografada (`seed/participantes.xlsx.enc`), importada automaticamente na primeira execução quando a variável `SEED_KEY` está definida e o banco está vazio. Para importar outras planilhas, use **Gestão > Participantes > Importar planilha**, ou rode `npm run import -- caminho/planilha.xlsx`. Quem já está no portal não é alterado.

## Railway

Um serviço deste repositório e um Postgres. No serviço, defina `DATABASE_URL=${{Postgres.DATABASE_URL}}`, as variáveis do gestor e `NODE_ENV=production`, e gere um domínio. O `railway.json` define o início e a checagem de saúde em `/saude`.
