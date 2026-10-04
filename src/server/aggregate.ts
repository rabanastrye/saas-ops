import "server-only";

import { prisma } from "./db";
import { uptimePercent } from "./incidents";
import { PROJECTS } from "./projects";

const HOUR = 60 * 60 * 1000;

export async function aggregateHealth() {
  const since7d = new Date(Date.now() - 7 * 24 * HOUR);
  const since24h = new Date(Date.now() - 24 * HOUR);

  return Promise.all(
    PROJECTS.map(async (project) => {
      const checks = await prisma.healthSnapshot.findMany({
        where: { projectId: project.name, checkedAt: { gte: since7d } },
        orderBy: { checkedAt: "desc" },
        select: { up: true, httpStatus: true, latencyMs: true, error: true, checkedAt: true },
      });
      const last = checks[0] ?? null;
      const openIncidents = await prisma.incident.count({
        where: { projectId: project.name, resolvedAt: null },
      });
      return {
        project: project.name,
        url: project.url,
        status: last === null ? "unknown" : last.up ? "healthy" : "down",
        last,
        uptime24h: uptimePercent(checks.filter((c) => c.checkedAt >= since24h)),
        uptime7d: uptimePercent(checks),
        openIncidents,
      };
    }),
  );
}

export async function aggregateMetrics(hours: number) {
  const since = new Date(Date.now() - hours * HOUR);
  const rows = await prisma.metricsSnapshot.findMany({
    where: { recordedAt: { gte: since } },
    orderBy: { recordedAt: "asc" },
    select: { projectId: true, name: true, value: true, recordedAt: true },
  });

  const projects: Record<string, Record<string, { t: string; v: number }[]>> = {};
  for (const project of PROJECTS) projects[project.name] = {};
  for (const row of rows) {
    const series = (projects[row.projectId] ??= {});
    (series[row.name] ??= []).push({ t: row.recordedAt.toISOString(), v: row.value });
  }
  return { hours, projects };
}

export async function aggregateIncidents(status: "open" | "all", limit: number) {
  return prisma.incident.findMany({
    where: status === "open" ? { resolvedAt: null } : {},
    orderBy: { openedAt: "desc" },
    take: limit,
  });
}
