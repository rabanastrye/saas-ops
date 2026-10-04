import type { Severity } from "./types";

/**
 * O que fazer a um incidente dado o estado anterior e o novo.
 * Funções puras, para poderem ser testadas sem base de dados.
 */
export function incidentTransition(hasOpen: boolean, problem: boolean): "open" | "resolve" | "keep" {
  if (problem && !hasOpen) return "open";
  if (!problem && hasOpen) return "resolve";
  return "keep";
}

export function auditSeverity(counts: { critical?: number; high?: number }): Severity | null {
  if ((counts.critical ?? 0) > 0) return "critical";
  if ((counts.high ?? 0) > 0) return "high";
  return null;
}

/** Percentagem de verificações "up", com uma casa decimal. null sem dados. */
export function uptimePercent(checks: { up: boolean }[]): number | null {
  if (checks.length === 0) return null;
  const up = checks.filter((c) => c.up).length;
  return Math.round((up / checks.length) * 1000) / 10;
}
