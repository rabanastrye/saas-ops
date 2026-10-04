import { NextResponse } from "next/server";

import { aggregateHealth } from "@/server/aggregate";

export const dynamic = "force-dynamic";

// Protegido por Basic auth em src/proxy.ts.
export async function GET() {
  return NextResponse.json({ projects: await aggregateHealth() });
}
