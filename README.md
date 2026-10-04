# saas-ops

Monitor central de todos os SaaS em `C:\Users\urani\Documents\Softwares`.
Corre no GitHub Actions, por fora dos sites. Assim continua a avisar mesmo
quando um site está em baixo.

| Workflow | Quando | O que faz |
|---|---|---|
| `uptime` | a cada 5 min | Abre o `url` de cada projeto. Avisa no Slack quando um site cai e quando volta, nunca repetidamente. |
| `audit` | todos os dias às 05:00 UTC | Corre `npm audit --omit=dev` em cada repo. Avisa no Slack se houver vulnerabilidades altas ou críticas. |

## Acrescentar um SaaS novo

Acrescentar uma entrada em `projects.json` e fazer push:

```json
{ "name": "novo-saas", "url": "https://novo-saas.com/api/health", "repo": "rabanastrye/novo-saas" }
```

Usar `/api/health` quando o projeto tiver essa rota. Ela verifica também a
base de dados. Sem a rota, usar a página inicial.

## Configuração (uma vez)

1. Criar o repo privado `rabanastrye/saas-ops` no GitHub e fazer push deste diretório.
2. Slack: criar uma app em https://api.slack.com/apps, ativar **Incoming Webhooks**,
   escolher o canal (ex: `#saas-alertas`) e copiar o URL do webhook.
3. GitHub: criar um token *fine-grained* com acesso só de leitura a
   **Contents** nos repos listados em `projects.json`.
4. No repo `saas-ops`, em Settings → Secrets and variables → Actions, criar:
   - `SLACK_WEBHOOK_URL`: o URL do passo 2
   - `REPOS_TOKEN`: o token do passo 3
5. Em Actions, correr `uptime` e `audit` à mão uma vez (**Run workflow**) para confirmar.

Sem `SLACK_WEBHOOK_URL`, os scripts escrevem os alertas só no log.

## Testar localmente

```bash
node scripts/uptime.mjs
node scripts/audit.mjs agendapro ../AgendaPro
```
