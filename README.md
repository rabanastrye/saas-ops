# saas-ops

Monitor central de todos os SaaS em `C:\Users\urani\Documents\Softwares`.
Tem duas partes:

1. **Alertas**, no GitHub Actions. Correm por fora dos sites e continuam a
   avisar mesmo quando um site, ou o próprio dashboard, está em baixo.
2. **Dashboard**, uma app Next.js na Vercel com Postgres. Guarda o
   histórico: estado, tempo de resposta, uptime e incidentes.

| Workflow | Quando | O que faz |
|---|---|---|
| `uptime` | a cada 5 min | Abre o `url` de cada projeto. Avisa no Slack quando um site cai e quando volta, nunca repetidamente. |
| `audit` | todos os dias às 05:00 UTC | Corre `npm audit --omit=dev` em cada repo. Avisa no Slack se houver vulnerabilidades altas ou críticas e envia o resultado para o dashboard. |
| `orchestrate` | a cada 15 min, e às 08:00 UTC com resumo no Slack | Chama `POST /api/orchestrate`, que verifica todos os projetos e guarda o histórico. |

## Dashboard

`/dashboard` mostra cada projeto (estado, tempo de resposta, uptime de 24 h
e 7 dias), o gráfico de tempo de resposta e os incidentes. Atualiza a cada
30 segundos. Pede uma senha (Basic auth): `DASHBOARD_PASSWORD`, com qualquer
nome de utilizador.

| Rota | Acesso | O que faz |
|---|---|---|
| `GET /api/health` | público | Confirma que a base de dados responde. |
| `GET /api/aggregate/health` | senha | Estado e uptime por projeto. |
| `GET /api/aggregate/metrics?hours=24` | senha | Séries temporais (`latency_ms`, `vuln_critical`, `vuln_high`). |
| `GET /api/aggregate/incidents?status=open\|all` | senha | Incidentes de queda e de vulnerabilidades. |
| `POST /api/orchestrate[?summary=1]` | `Bearer CRON_SECRET` | Verifica todos os projetos e guarda o resultado. |
| `POST /api/notify` | `Bearer CRON_SECRET` | Envia `{ "text": "..." }` para o Slack. |
| `POST /api/report/audit` | `Bearer CRON_SECRET` | Recebe o resultado do `npm audit` (usado por `scripts/audit.mjs`). |

Um incidente abre quando um projeto cai ou passa a ter vulnerabilidades
altas ou críticas. Fecha sozinho quando o problema desaparece. O histórico
de verificações é apagado ao fim de 30 dias.

## Acrescentar um SaaS novo

Acrescentar uma entrada em `projects.json` e fazer push. Os workflows e o
dashboard leem todos daqui.

```json
{ "name": "novo-saas", "url": "https://novo-saas.com/api/health", "repo": "rabanastrye/novo-saas" }
```

Usar `/api/health` quando o projeto tiver essa rota. Ela verifica também a
base de dados. Sem a rota, usar a página inicial.

## Configuração

**Secrets do GitHub** (Settings → Secrets and variables → Actions):

- `SLACK_WEBHOOK_URL`: webhook do Slack (Incoming Webhooks)
- `REPOS_TOKEN`: token *fine-grained* só de leitura a **Contents** nos repos de `projects.json`
- `SAAS_OPS_URL`: URL do dashboard em produção, sem `/` no fim
- `CRON_SECRET`: o mesmo valor da variável da Vercel

**Variáveis da Vercel** (projeto `saas-ops`, equipa `urania-holding`):

- `DATABASE_URL`: Prisma Postgres `saas-ops` (Paris)
- `CRON_SECRET`: protege as rotas chamadas pelo GitHub Actions
- `DASHBOARD_PASSWORD`: senha do dashboard
- `SLACK_WEBHOOK_URL`: para `/api/notify` e para o resumo diário

Sem `SLACK_WEBHOOK_URL`, as mensagens ficam só no log.

## Desenvolvimento

```bash
npm install
npm run dev          # http://localhost:3000/dashboard
npm test
npm run db:migrate   # depois de mudar prisma/schema.prisma
```

O `.env` local aponta para a mesma base de produção. São só dados de
monitorização, mas `prisma migrate reset` apaga o histórico.

Os scripts dos alertas também correm localmente:

```bash
node scripts/uptime.mjs
node scripts/audit.mjs agendapro ../AgendaPro
```
