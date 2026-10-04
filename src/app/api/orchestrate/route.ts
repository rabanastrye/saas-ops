import { NextResponse } from "next/server";

import { isCronRequest } from "@/server/auth";
import { orchestrate } from "@/server/orchestrate";
import { notifySlack } from "@/server/slack";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Verifica todos os projetos e guarda o histórico.
 * Chamado pelo workflow orchestrate do GitHub Actions. ?summary=1 envia
 * também um resumo para o Slack.
 */
export async function POST(request: Request) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const results = await orchestrate();

  if (new URL(request.url).searchParams.get("summary") === "1") {
    const up = results.filter((r) => r.up).length;
    const lines = results.map(
      (r) => `${r.up ? ":large_green_circle:" : ":red_circle:"} *${r.project}* ${r.latencyMs}ms${r.error ? ` (${r.error})` : ""}`,
    );
    await notifySlack(`:bar_chart: *saas-ops*: ${up}/${results.length} projetos no ar\n${lines.join("\n")}`);
  }

  return NextResponse.json({ ok: true, results });
}
