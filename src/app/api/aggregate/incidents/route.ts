import { NextResponse } from "next/server";

import { aggregateIncidents } from "@/server/aggregate";

export const dynamic = "force-dynamic";

// Protegido por Basic auth em src/proxy.ts. ?status=open|all&limit=50.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const status = params.get("status") === "all" ? "all" : "open";
  const raw = Number(params.get("limit") ?? 50);
  const limit = Number.isFinite(raw) ? Math.min(Math.max(Math.round(raw), 1), 200) : 50;
  return NextResponse.json({ status, incidents: await aggregateIncidents(status, limit) });
}
