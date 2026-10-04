"use client";

import { useCallback, useEffect, useState } from "react";

const REFRESH_MS = 30_000;

type Health = {
  project: string;
  url: string;
  status: "healthy" | "down" | "unknown";
  last: { up: boolean; httpStatus: number | null; latencyMs: number; error: string | null; checkedAt: string } | null;
  uptime24h: number | null;
  uptime7d: number | null;
  openIncidents: number;
};

type Point = { t: string; v: number };
type Metrics = { hours: number; projects: Record<string, Record<string, Point[]>> };

type Incident = {
  id: string;
  projectId: string;
  kind: string;
  severity: string;
  title: string;
  detail: string | null;
  openedAt: string;
  resolvedAt: string | null;
};

type Data = { health: Health[]; metrics: Metrics; incidents: Incident[] };

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

const timeFormat = new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short" });

function ago(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `há ${hours} h`;
  return `há ${Math.round(hours / 24)} dias`;
}

export function Dashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [hours, setHours] = useState(24);
  const [showResolved, setShowResolved] = useState(false);

  const load = useCallback(async () => {
    try {
      const [health, metrics, incidents] = await Promise.all([
        getJson<{ projects: Health[] }>("/api/aggregate/health"),
        getJson<Metrics>(`/api/aggregate/metrics?hours=${hours}`),
        getJson<{ incidents: Incident[] }>(`/api/aggregate/incidents?status=${showResolved ? "all" : "open"}`),
      ]);
      setData({ health: health.projects, metrics, incidents: incidents.incidents });
      setError(null);
      setUpdatedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [hours, showResolved]);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load]);

  const healthy = data?.health.filter((h) => h.status === "healthy").length ?? 0;
  const total = data?.health.length ?? 0;
  const openCount = data?.health.reduce((sum, h) => sum + h.openIncidents, 0) ?? 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">saas-ops</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {data ? (
              <>
                <span className={healthy === total ? "text-up" : "text-down"}>{healthy}</span>
                <span className="text-muted">/{total}</span> projetos no ar
              </>
            ) : (
              "A carregar…"
            )}
          </h1>
        </div>
        <div className="text-right font-mono text-xs text-muted">
          <p>{openCount} incidente(s) aberto(s)</p>
          <p>
            {updatedAt ? `atualizado às ${updatedAt.toLocaleTimeString("pt-PT")}` : "—"} · a cada 30 s
          </p>
        </div>
      </header>

      {error && (
        <p className="mt-6 rounded border border-down/40 bg-down/10 px-4 py-3 font-mono text-sm text-down">
          Falha ao carregar: {error}
        </p>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data?.health.map((h) => <ProjectCard key={h.project} health={h} />)}
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Tempo de resposta</h2>
          <div className="flex gap-1 font-mono text-xs">
            {[24, 168, 720].map((h) => (
              <button
                key={h}
                onClick={() => setHours(h)}
                className={`rounded px-2.5 py-1 ${hours === h ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}
              >
                {h === 24 ? "24 h" : h === 168 ? "7 dias" : "30 dias"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {data &&
            Object.entries(data.metrics.projects).map(([project, series]) => (
              <LatencyChart key={project} project={project} points={series.latency_ms ?? []} />
            ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Incidentes</h2>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
            mostrar resolvidos
          </label>
        </div>
        <IncidentTable incidents={data?.incidents ?? []} />
      </section>
    </main>
  );
}

function ProjectCard({ health }: { health: Health }) {
  const color = health.status === "healthy" ? "bg-up" : health.status === "down" ? "bg-down" : "bg-muted";
  const label = health.status === "healthy" ? "no ar" : health.status === "down" ? "em baixo" : "sem dados";
  return (
    <article className="rounded-lg border border-line bg-panel p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{health.project}</h3>
        <span className="flex items-center gap-1.5 font-mono text-xs text-muted">
          <span className={`h-2 w-2 rounded-full ${color}`} />
          {label}
        </span>
      </div>
      <a href={health.url} target="_blank" rel="noreferrer" className="mt-1 block truncate font-mono text-xs text-muted hover:text-ink">
        {health.url.replace(/^https?:\/\//, "")}
      </a>
      <dl className="mt-4 grid grid-cols-3 gap-2 font-mono text-sm">
        <Stat label="resposta" value={health.last ? `${health.last.latencyMs} ms` : "—"} />
        <Stat label="24 h" value={health.uptime24h === null ? "—" : `${health.uptime24h}%`} />
        <Stat label="7 dias" value={health.uptime7d === null ? "—" : `${health.uptime7d}%`} />
      </dl>
      <p className="mt-3 font-mono text-xs text-muted">
        {health.last ? `verificado ${ago(health.last.checkedAt)}` : "ainda sem verificações"}
        {health.openIncidents > 0 && <span className="text-warn"> · {health.openIncidents} incidente(s)</span>}
      </p>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}

function LatencyChart({ project, points }: { project: string; points: Point[] }) {
  const width = 520;
  const height = 120;
  const max = Math.max(1000, ...points.map((p) => p.v));
  const first = points[0] ? new Date(points[0].t).getTime() : 0;
  const last = points.at(-1) ? new Date(points.at(-1)!.t).getTime() : 1;
  const span = Math.max(last - first, 1);
  const path = points
    .map((p, i) => {
      const x = ((new Date(p.t).getTime() - first) / span) * width;
      const y = height - (p.v / max) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const avg = points.length ? Math.round(points.reduce((s, p) => s + p.v, 0) / points.length) : null;

  return (
    <figure className="rounded-lg border border-line bg-panel p-4">
      <figcaption className="flex items-baseline justify-between font-mono text-xs text-muted">
        <span className="text-sm text-ink">{project}</span>
        <span>média {avg === null ? "—" : `${avg} ms`} · máx {points.length ? `${Math.round(Math.max(...points.map((p) => p.v)))} ms` : "—"}</span>
      </figcaption>
      {points.length > 1 ? (
        <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-28 w-full" preserveAspectRatio="none" role="img" aria-label={`Tempo de resposta de ${project}`}>
          <line x1="0" x2={width} y1={height - (1000 / max) * height} y2={height - (1000 / max) * height} stroke="var(--color-line)" strokeDasharray="4 4" />
          <path d={path} fill="none" stroke="var(--color-up)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
      ) : (
        <p className="mt-3 flex h-28 items-center justify-center text-sm text-muted">Poucos dados neste período.</p>
      )}
    </figure>
  );
}

function IncidentTable({ incidents }: { incidents: Incident[] }) {
  if (incidents.length === 0) {
    return <p className="mt-4 rounded-lg border border-line bg-panel px-4 py-6 text-center text-sm text-muted">Nenhum incidente.</p>;
  }
  const severityColor: Record<string, string> = { critical: "text-down", high: "text-warn" };
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-panel">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-line font-mono text-[10px] uppercase tracking-wider text-muted">
          <tr>
            <th className="px-4 py-2 font-normal">Projeto</th>
            <th className="px-4 py-2 font-normal">Severidade</th>
            <th className="px-4 py-2 font-normal">O quê</th>
            <th className="px-4 py-2 font-normal">Aberto</th>
            <th className="px-4 py-2 font-normal">Estado</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((i) => (
            <tr key={i.id} className="border-b border-line last:border-0 align-top">
              <td className="px-4 py-3 font-medium">{i.projectId}</td>
              <td className={`px-4 py-3 font-mono text-xs ${severityColor[i.severity] ?? "text-muted"}`}>{i.severity}</td>
              <td className="px-4 py-3">
                {i.title}
                {i.detail && <pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-muted">{i.detail}</pre>}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted">{timeFormat.format(new Date(i.openedAt))}</td>
              <td className="px-4 py-3 font-mono text-xs">
                {i.resolvedAt ? <span className="text-up">resolvido {ago(i.resolvedAt)}</span> : <span className="text-down">aberto</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
