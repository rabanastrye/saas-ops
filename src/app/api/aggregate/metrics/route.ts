import { NextResponse } from "next/server";

import { aggregateMetrics } from "@/server/aggregate";

export const dynamic = "force-dynamic";

// Protegido por Basic auth em src/proxy.ts. ?hours=24 (1 a 720).
export async function GET(request: Request) {
  const raw = Number(new URL(request.url).searchParams.get("hours") ?? 24);
  const hours = Number.isFinite(raw) ? Math.min(Math.max(Math.round(raw), 1), 720) : 24;
  return NextResponse.json(await aggregateMetrics(hours));
}
