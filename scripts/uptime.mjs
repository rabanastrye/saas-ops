import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { notifySlack } from "./slack.mjs";

const STATE_FILE = process.env.STATE_FILE ?? "uptime-state.json";
const SLOW_MS = 5000;

const projects = JSON.parse(readFileSync(new URL("../projects.json", import.meta.url)));
const previous = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf-8")) : {};

async function check(project) {
  const start = Date.now();
  try {
    const response = await fetch(project.url, {
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const ms = Date.now() - start;
    if (!response.ok) return { up: false, ms, reason: `HTTP ${response.status}` };
    return { up: true, ms };
  } catch (error) {
    return { up: false, ms: Date.now() - start, reason: error.cause?.code ?? error.message };
  }
}

const results = await Promise.all(projects.map(async (p) => [p, await check(p)]));
const state = {};

for (const [project, result] of results) {
  const wasUp = previous[project.name]?.up ?? true;
  state[project.name] = { up: result.up, since: wasUp === result.up ? previous[project.name]?.since ?? new Date().toISOString() : new Date().toISOString() };
  console.log(`${result.up ? "UP  " : "DOWN"} ${project.name} ${result.ms}ms ${result.reason ?? ""}`);

  // Só avisa em mudança de estado, senão um site em baixo manda alerta a cada 5 minutos.
  if (wasUp && !result.up) {
    await notifySlack(`:red_circle: *${project.name} em baixo* — ${project.url} (${result.reason})`);
  } else if (!wasUp && result.up) {
    await notifySlack(`:large_green_circle: *${project.name} voltou* — ${result.ms}ms (em baixo desde ${previous[project.name].since})`);
  } else if (result.up && result.ms > SLOW_MS) {
    console.log(`  lento: ${result.ms}ms`);
  }
}

writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
