// Corre a orquestração à mão, como o workflow orchestrate faz a cada 15 min:
// verifica todos os projetos de projects.json e guarda o histórico no dashboard.
//
// Uso: npm run orchestrate            (lê SAAS_OPS_URL e CRON_SECRET do ambiente ou do .env)
//      npm run orchestrate -- --slack (envia também o resumo para o Slack)

require("dotenv/config");

const url = process.env.SAAS_OPS_URL ?? "https://saas-ops.vercel.app";
const secret = process.env.CRON_SECRET;
const slack = process.argv.includes("--slack");

async function main() {
  if (!secret) {
    console.error("CRON_SECRET não está definido.");
    process.exit(1);
  }

  const response = await fetch(`${url}/api/orchestrate${slack ? "?summary=1" : ""}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(60_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body) {
    console.error(`saas-ops respondeu ${response.status}.`);
    process.exit(1);
  }

  for (const r of body.results) {
    console.log(`${r.up ? "UP  " : "DOWN"} ${r.project} ${r.latencyMs}ms ${r.error ?? ""}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
