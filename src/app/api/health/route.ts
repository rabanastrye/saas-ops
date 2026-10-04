import { NextResponse } from "next/server";

import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

/** Health check do próprio saas-ops: confirma que a base de dados responde. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[health] base de dados não respondeu.", error);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
