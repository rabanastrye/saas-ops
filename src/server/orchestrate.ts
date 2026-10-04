import "server-only";

import { prisma } from "./db";
import { auditSeverity, incidentTransition } from "./incidents";
import { PROJECTS } from "./projects";
import type { CheckResult, Project } from "./types";

const RETENTION_DAYS = 30;

async function check(project: Project): Promise<CheckResult> {
  const start = Date.now();
  try {
    const response = await fetch(project.url, {
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": "saas-ops/1.0" },
    });
    return {
      up: response.ok,
      httpStatus: response.status,
      latencyMs: Date.now() - start,
      error: response.ok ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    const err = error as Error & { cause?: { code?: string } };
    return { up: false, httpStatus: null, latencyMs: Date.now() - start, error: err.cause?.code ?? err.message };
  }
}

async function upsertProject(project: Project) {
  await prisma.saaSProject.upsert({
    where: { id: project.name },
    create: { id: project.name, url: project.url, repo: project.repo },
    update: { url: project.url, repo: project.repo },
  });
}

async function record(project: Project, result: CheckResult) {
  await upsertProject(project);
  await prisma.healthSnapshot.create({ data: { projectId: project.name, ...result } });
  await prisma.metricsSnapshot.create({
    data: { projectId: project.name, name: "latency_ms", value: result.latencyMs },
  });

  const open = await prisma.incident.findFirst({
    where: { projectId: project.name, kind: "downtime", resolvedAt: null },
  });
  const action = incidentTransition(Boolean(open), !result.up);
  if (action === "open") {
    await prisma.incident.create({
      data: {
        projectId: project.name,
        kind: "downtime",
        severity: "critical",
        title: `${project.name} em baixo`,
        detail: result.error,
      },
    });
  } else if (action === "resolve" && open) {
    await prisma.incident.update({ where: { id: open.id }, data: { resolvedAt: new Date() } });
  }

  return { project: project.name, ...result, incident: action };
}

/**
 * Verifica todos os projetos de projects.json e guarda o histórico.
 * Não avisa no Slack sobre quedas: isso já é trabalho do workflow uptime,
 * que corre de 5 em 5 minutos e não depende deste site estar no ar.
 */
export async function orchestrate() {
  const results = await Promise.all(PROJECTS.map(async (p) => record(p, await check(p))));

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.healthSnapshot.deleteMany({ where: { checkedAt: { lt: cutoff } } });
  await prisma.metricsSnapshot.deleteMany({ where: { recordedAt: { lt: cutoff } } });

  return results;
}

export type AuditReport = {
  project: string;
  counts: { critical?: number; high?: number; moderate?: number; low?: number };
  packages: string[];
};

/** Guarda o resultado do npm audit diário e abre ou fecha o incidente. */
export async function recordAudit(report: AuditReport) {
  const project = PROJECTS.find((p) => p.name === report.project);
  if (!project) return null;
  await upsertProject(project);

  const counts = report.counts;
  await prisma.metricsSnapshot.createMany({
    data: [
      { projectId: project.name, name: "vuln_critical", value: counts.critical ?? 0 },
      { projectId: project.name, name: "vuln_high", value: counts.high ?? 0 },
    ],
  });

  const severity = auditSeverity(counts);
  const open = await prisma.incident.findFirst({
    where: { projectId: project.name, kind: "vulnerabilities", resolvedAt: null },
  });
  const action = incidentTransition(Boolean(open), severity !== null);
  const title = `${counts.critical ?? 0} crítica(s), ${counts.high ?? 0} alta(s) em dependências`;
  const detail = report.packages.slice(0, 20).join("\n");

  if (action === "open" && severity) {
    await prisma.incident.create({
      data: { projectId: project.name, kind: "vulnerabilities", severity, title, detail },
    });
  } else if (action === "keep" && open && severity) {
    await prisma.incident.update({ where: { id: open.id }, data: { severity, title, detail } });
  } else if (action === "resolve" && open) {
    await prisma.incident.update({ where: { id: open.id }, data: { resolvedAt: new Date() } });
  }
  return { project: project.name, severity, incident: action };
}
