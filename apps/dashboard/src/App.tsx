import { useEffect, useState } from "react";
import type { DashboardSummary, ExperimentReport } from "@si/shared";

export default function App() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [experiments, setExperiments] = useState<ExperimentReport[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [sRes, eRes] = await Promise.all([
          fetch("/dashboard/summary"),
          fetch("/dashboard/experiments"),
        ]);
        if (!sRes.ok || !eRes.ok) throw new Error("Failed to load dashboard APIs");
        const s = (await sRes.json()) as DashboardSummary;
        const e = (await eRes.json()) as { experiments: ExperimentReport[] };
        if (!cancelled) {
          setSummary(s);
          setExperiments(e.experiments);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">
          <div>
            <div className="text-sm font-semibold tracking-wide text-white">Session Intelligence</div>
            <div className="text-xs text-slate-400">MVP dashboard — experiments + ingestion summary</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {error ? (
          <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-5 text-sm text-red-200">
            <div className="font-semibold">Could not reach worker APIs</div>
            <div className="mt-2 text-red-200/80">
              Start the Cloudflare worker locally (<code className="rounded bg-black/30 px-2 py-1">pnpm dev:worker</code>)
              or update Vite proxy targets.
            </div>
            <div className="mt-2 text-xs text-red-200/70">Details: {error}</div>
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <Metric title="Sessions ingested" value={summary ? String(summary.sessions_ingested) : "—"} />
          <Metric title="Conversions" value={summary ? String(summary.conversions) : "—"} />
          <Metric title="Avg intent" value={summary ? summary.avg_intent.toFixed(1) : "—"} />
          <Metric title="Avg engagement" value={summary ? summary.avg_engagement.toFixed(1) : "—"} />
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Experiments</h2>
              <p className="mt-1 text-sm text-slate-400">
                Includes seeded demo metrics + any live ingestion from <code className="text-slate-200">/collect</code>.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            {experiments.map((exp) => (
              <div key={exp.id} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{exp.name}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      <span className="rounded-full bg-slate-900 px-2 py-1 text-[11px] uppercase tracking-wide text-slate-300">
                        {exp.status}
                      </span>{" "}
                      <span className="text-slate-500">·</span>{" "}
                      <span className="text-slate-400">{exp.sessions} sessions (demo+live)</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="py-2 pr-4">Variant</th>
                        <th className="py-2 pr-4">Sessions</th>
                        <th className="py-2 pr-4">CTA CTR</th>
                        <th className="py-2 pr-4">Conversion</th>
                        <th className="py-2 pr-4">Avg engagement</th>
                        <th className="py-2 pr-4">Lift (CTR)</th>
                        <th className="py-2 pr-4">Lift (conv)</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-200">
                      {exp.variants.map((v) => (
                        <tr key={v.id} className="border-t border-slate-900">
                          <td className="py-3 pr-4">
                            <div className="font-semibold text-white">{v.name}</div>
                            <div className="text-xs text-slate-500">{v.is_control ? "control" : "treatment"}</div>
                          </td>
                          <td className="py-3 pr-4">{v.sessions}</td>
                          <td className="py-3 pr-4">{(v.cta_ctr * 100).toFixed(1)}%</td>
                          <td className="py-3 pr-4">{(v.conversion_rate * 100).toFixed(1)}%</td>
                          <td className="py-3 pr-4">{v.avg_engagement.toFixed(1)}</td>
                          <td className="py-3 pr-4">
                            {v.lift_cta == null ? "—" : `${(v.lift_cta * 100).toFixed(1)}%`}
                          </td>
                          <td className="py-3 pr-4">
                            {v.lift_conversion == null ? "—" : `${(v.lift_conversion * 100).toFixed(1)}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</div>
    </div>
  );
}
