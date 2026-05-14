import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type {
  DashboardInsightsResponse,
  DashboardMeResponse,
  DashboardSessionListRow,
  DashboardSummary,
  ExperimentReport,
} from "@si/shared";
import {
  fetchDashboardExperiments,
  fetchDashboardInsights,
  fetchDashboardMe,
  fetchDashboardSessions,
  fetchDashboardSummary,
} from "../dashboardApi";
import WebmasterIntegrationSection from "../components/WebmasterIntegrationSection";

function envUrl(name: string, fallback: string): string {
  const v = import.meta.env[name as keyof ImportMetaEnv] as string | undefined;
  return typeof v === "string" && v.trim() ? v.trim().replace(/\/$/, "") : fallback;
}

function deploymentBannerLabel(me: DashboardMeResponse): string {
  const label = me.deployment_mode === "staging" ? "Staging" : "Development";
  if (me.auth_bypass_enabled) {
    return `${label} environment — auth bypass enabled`;
  }
  return `${label} environment`;
}

export default function MainDashboard() {
  const cdnOrigin = envUrl("VITE_SI_SNIPPET_ORIGIN", "https://cdn.optiview.ai");
  const [me, setMe] = useState<DashboardMeResponse | null>(null);
  const [siteId, setSiteId] = useState<string>("");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [experiments, setExperiments] = useState<ExperimentReport[]>([]);
  const [sessions, setSessions] = useState<DashboardSessionListRow[]>([]);
  const [insights, setInsights] = useState<DashboardInsightsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      try {
        const m = await fetchDashboardMe();
        if (cancelled) return;
        setMe(m);
        setSiteId((prev) => prev || m.sites[0]?.id || "");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load session");
      }
    }
    void loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadSiteData = useCallback(async (sid: string) => {
    if (!sid) return;
    setError(null);
    try {
      const [s, e, sess, ins] = await Promise.all([
        fetchDashboardSummary(sid),
        fetchDashboardExperiments(sid),
        fetchDashboardSessions(sid, 50),
        fetchDashboardInsights(sid),
      ]);
      setSummary(s);
      setExperiments(e);
      setSessions(sess);
      setInsights(ins);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load site data");
    }
  }, []);

  useEffect(() => {
    if (!siteId) return;
    void loadSiteData(siteId);
  }, [siteId, loadSiteData]);

  const selectedSite = useMemo(() => me?.sites.find((s) => s.id === siteId), [me, siteId]);

  const hideAdvanced = me?.role === "customer_viewer";

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
      {me && me.deployment_mode !== "production" ? (
        <div className="border-b border-amber-500/50 bg-amber-950 px-4 py-2.5 text-center text-sm text-amber-100">
          {deploymentBannerLabel(me)}
        </div>
      ) : null}
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold tracking-wide text-white">Session Intelligence</div>
            <div className="text-xs text-slate-400">
              Customer dashboard — data scoped per site. Auth via Cloudflare Access (production) or dev bypass (local).
            </div>
            {me ? (
              <div className="mt-2 text-xs text-slate-500">
                Signed in as <span className="text-slate-300">{me.email}</span> · role{" "}
                <span className="text-slate-300">{me.role}</span>
                {me.auth_via === "dev_bypass" ? (
                  <span className="ml-2 rounded bg-amber-950/60 px-2 py-0.5 text-amber-200">dev bypass</span>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex flex-col items-stretch gap-3 md:items-end">
            {me?.role === "platform_admin" ? (
              <Link
                to="/admin/signups"
                className="text-right text-xs font-medium text-indigo-300 hover:text-indigo-200 hover:underline"
              >
                Signup requests (admin)
              </Link>
            ) : null}
            {me && me.sites.length ? (
            <label className="flex flex-col gap-1 text-xs text-slate-400 md:items-end">
              <span className="font-semibold uppercase tracking-wide">Site</span>
              <select
                className="min-w-[220px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                value={siteId}
                onChange={(ev) => setSiteId(ev.target.value)}
              >
                {me.sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.display_name} ({s.domain})
                  </option>
                ))}
              </select>
            </label>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {error ? (
          <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-5 text-sm text-red-200">
            <div className="font-semibold">Dashboard API error</div>
            <div className="mt-2 text-red-200/80">
              For local dev: run <code className="rounded bg-black/30 px-2 py-1">pnpm dev:worker</code>, ensure{" "}
              <code className="rounded bg-black/30 px-2 py-1">SI_BYPASS_DASHBOARD_AUTH</code> and your email exist in
              D1 <code className="rounded bg-black/30 px-2 py-1">authorized_users</code> (see docs/DASHBOARD_AUTH.md).
            </div>
            <div className="mt-2 text-xs text-red-200/70">{error}</div>
          </div>
        ) : null}

        {!me ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6 text-sm text-slate-400">Loading…</div>
        ) : null}

        {me && !me.sites.length ? (
          <div className="rounded-2xl border border-amber-900/50 bg-amber-950/20 p-6 text-sm text-amber-100">
            No sites are assigned to your account. Ask an administrator to add you to{" "}
            <code className="rounded bg-black/30 px-2 py-1">authorized_users</code> and provision{" "}
            <code className="rounded bg-black/30 px-2 py-1">sites</code> in D1.
          </div>
        ) : null}

        {me && siteId && summary ? (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <Metric title="Sessions (unique)" value={String(summary.sessions_ingested)} />
              <Metric title="Conversions" value={String(summary.conversions)} />
              <Metric title="Avg intent" value={summary.avg_intent.toFixed(1)} />
              <Metric title="Avg engagement" value={summary.avg_engagement.toFixed(1)} />
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
              <h2 className="text-lg font-semibold text-white">Install snippet</h2>
              <p className="mt-1 text-sm text-slate-400">
                Prefer the public <strong className="text-slate-200">snippet key</strong> (<code className="text-slate-200">data-si-key</code>) for
                broad installs — the Worker resolves tenant/site from D1 and never trusts a client-supplied tenant. Add{" "}
                <code className="text-slate-200">data-si-site</code> as an optional display/support hint; if both are set, they must match the same
                site or collect returns HTTP 400.
              </p>
              <pre className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80 p-4 font-mono text-[13px] leading-relaxed text-emerald-200/95">
                {`<script async src="${cdnOrigin}/si.js" data-si-key="${selectedSite?.snippet_key ?? ""}" data-si-site="${siteId}"></script>`}
              </pre>
              <p className="mt-3 text-xs text-slate-500">
                Minimal MVP (key + origin fallback only):{" "}
                <code className="text-slate-400">{`<script async src="${cdnOrigin}/si.js" data-si-key="…"></script>`}</code>
              </p>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
              <h2 className="text-lg font-semibold text-white">Sessions</h2>
              <p className="mt-1 text-sm text-slate-400">Recent anonymous sessions for the selected site (no PII).</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm text-slate-200">
                  <thead className="text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Session</th>
                      <th className="py-2 pr-3">Origin</th>
                      <th className="py-2 pr-3">Stage</th>
                      <th className="py-2 pr-3">Intent</th>
                      <th className="py-2 pr-3">Conv</th>
                      <th className="py-2 pr-3">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((row) => (
                      <tr key={`${row.session_id}-${row.created_at}`} className="border-t border-slate-900">
                        <td className="py-2 pr-3 font-mono text-xs text-slate-300">
                          …{row.session_id.slice(-8)}
                        </td>
                        <td className="py-2 pr-3 text-xs text-slate-400">{row.origin ?? "—"}</td>
                        <td className="py-2 pr-3">{row.journey_stage ?? "—"}</td>
                        <td className="py-2 pr-3">{row.intent_score ?? "—"}</td>
                        <td className="py-2 pr-3">{row.converted ? "yes" : "no"}</td>
                        <td className="py-2 pr-3 text-xs text-slate-500">{row.created_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sessions.length === 0 ? (
                  <div className="mt-4 text-sm text-slate-500">No ingested rows yet for this site.</div>
                ) : null}
              </div>
            </section>

            {insights ? (
              <section className="grid gap-4 md:grid-cols-2">
                <InsightCard title="Top journey stages" rows={insights.journey_stages.map((x) => ({ k: x.stage, v: x.sessions }))} />
                <InsightCard title="Top inferred verticals" rows={insights.site_verticals.map((x) => ({ k: x.vertical, v: x.sessions }))} />
              </section>
            ) : null}

            <section className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
              <h2 className="text-lg font-semibold text-white">Top concepts &amp; activation (preview)</h2>
              <p className="mt-1 text-sm text-slate-400">
                Full concept graphs and activation opportunities will roll up from stored payloads in a later release.
                Journey and vertical distributions above come from live <code className="text-slate-200">/collect</code>{" "}
                summaries.
              </p>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
              <h2 className="text-lg font-semibold text-white">Acquisition sources</h2>
              <p className="mt-1 text-sm text-slate-400">Requires referrer enrichment in collect — placeholder for MVP.</p>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
              <h2 className="text-lg font-semibold text-white">Personalization signal performance</h2>
              <p className="mt-1 text-sm text-slate-400">
                Aggregates from activation payload storage are not yet in D1 for this MVP — use the Sessions table and
                inspector on the live site.
              </p>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
              <h2 className="text-lg font-semibold text-white">Recent anonymous visitor reads</h2>
              <p className="mt-1 text-sm text-slate-400">
                Visitor read cards are generated client-side in the snippet inspector. Dashboard shows session-level
                summaries only (no raw PII).
              </p>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Experiments</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Demo seed merged with live rows for <strong className="text-slate-200">{selectedSite?.display_name}</strong>.
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
                          <span className="text-slate-400">{exp.sessions} unique sessions (demo + live)</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[860px] text-left text-sm">
                        <thead className="text-xs uppercase tracking-wide text-slate-400">
                          <tr>
                            <th className="py-2 pr-4">Variant</th>
                            <th className="py-2 pr-4">Sessions (unique)</th>
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
                              <td className="py-3 pr-4">{v.lift_cta == null ? "—" : `${(v.lift_cta * 100).toFixed(1)}%`}</td>
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

            {!hideAdvanced ? (
              <WebmasterIntegrationSection />
            ) : (
              <section className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6 text-sm text-slate-400">
                Integration docs and generic install copy are hidden for customer viewers. Use the install snippet above
                for your assigned site.
              </section>
            )}
          </>
        ) : null}
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

function InsightCard({ title, rows }: { title: string; rows: { k: string; v: number }[] }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="text-sm font-semibold text-white">{title}</div>
      <ul className="mt-3 space-y-2 text-sm text-slate-300">
        {rows.length ? (
          rows.map((r) => (
            <li key={r.k} className="flex justify-between gap-2 border-b border-slate-900/80 py-1">
              <span className="text-slate-400">{r.k}</span>
              <span className="font-mono text-slate-100">{r.v}</span>
            </li>
          ))
        ) : (
          <li className="text-slate-500">No data yet</li>
        )}
      </ul>
    </div>
  );
}
