import { NextResponse } from "next/server";

import { isCronRequest } from "@/server/auth";
import { recordAudit, type AuditReport } from "@/server/orchestrate";

export const dynamic = "force-dynamic";

/** Recebe o resultado do npm audit diário (scripts/audit.mjs). */
export async function POST(request: Request) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Partial<AuditReport> | null;
  if (!body || typeof body.project !== "string" || typeof body.counts !== "object" || body.counts === null) {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const counts = {
    critical: Number(body.counts.critical) || 0,
    high: Number(body.counts.high) || 0,
  };
  const packages = Array.isArray(body.packages) ? body.packages.filter((p) => typeof p === "string") : [];

  const result = await recordAudit({ project: body.project, counts, packages });
  if (!result) {
    return NextResponse.json({ error: "Projeto não está em projects.json." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, ...result });
}
