import { NextResponse } from "next/server";

import { isCronRequest } from "@/server/auth";
import { notifySlack } from "@/server/slack";

export const dynamic = "force-dynamic";

/** Envia uma mensagem para o Slack. Corpo: { "text": "..." }. */
export async function POST(request: Request) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text || text.length > 3000) {
    return NextResponse.json({ error: "Campo text obrigatório (até 3000 caracteres)." }, { status: 400 });
  }

  try {
    const sent = await notifySlack(text);
    return NextResponse.json({ ok: true, sent });
  } catch (error) {
    console.error("[notify] falha no Slack.", error);
    return NextResponse.json({ error: "Slack recusou a mensagem." }, { status: 502 });
  }
}
