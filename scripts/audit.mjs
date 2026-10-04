import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { notifySlack } from "./slack.mjs";

const [name, dir] = process.argv.slice(2);

if (!existsSync(join(dir, "package-lock.json"))) {
  console.log(`${name}: sem package-lock.json, auditoria saltada.`);
  process.exit(0);
}

let raw;
try {
  raw = execFileSync("npm", ["audit", "--json", "--omit=dev"], { cwd: dir, encoding: "utf-8", shell: process.platform === "win32" });
} catch (error) {
  // npm audit sai com código != 0 quando encontra vulnerabilidades; o JSON vem no stdout.
  raw = error.stdout;
}

const report = JSON.parse(raw);
const counts = report.metadata?.vulnerabilities ?? {};
const serious = (counts.high ?? 0) + (counts.critical ?? 0);
console.log(`${name}:`, counts);

if (serious > 0) {
  const packages = Object.values(report.vulnerabilities ?? {})
    .filter((v) => v.severity === "high" || v.severity === "critical")
    .map((v) => `• \`${v.name}\` (${v.severity})${v.fixAvailable ? "" : " — sem correção disponível"}`)
    .slice(0, 10);
  await notifySlack(
    `:lock: *${name}*: ${counts.critical ?? 0} crítica(s), ${counts.high ?? 0} alta(s) em dependências de produção.\n${packages.join("\n")}\nCorrigir com \`npm audit fix\` no projeto.`,
  );
}

// Guarda o resultado no dashboard do saas-ops, quando configurado.
if (process.env.SAAS_OPS_URL && process.env.CRON_SECRET) {
  const packages = Object.values(report.vulnerabilities ?? {})
    .filter((v) => v.severity === "high" || v.severity === "critical")
    .map((v) => `${v.name} (${v.severity})`);
  const response = await fetch(`${process.env.SAAS_OPS_URL}/api/report/audit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.CRON_SECRET}` },
    body: JSON.stringify({ project: name, counts, packages }),
    signal: AbortSignal.timeout(20_000),
  });
  console.log(`saas-ops: HTTP ${response.status}`);
}
