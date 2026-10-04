export type Project = { name: string; url: string; repo: string };

export type IncidentKind = "downtime" | "vulnerabilities";
export type Severity = "critical" | "high" | "medium" | "low";

export type CheckResult = {
  up: boolean;
  httpStatus: number | null;
  latencyMs: number;
  error: string | null;
};
