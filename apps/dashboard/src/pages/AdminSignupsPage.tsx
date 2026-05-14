import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { DashboardMeResponse, SignupRequestAdminRow, SignupRequestAdminStatus } from "@si/shared";
import { fetchAdminSignups, fetchDashboardMe, patchSignupRequestStatus } from "../dashboardApi";

function deploymentBannerLabel(me: DashboardMeResponse): string {
  const label = me.deployment_mode === "staging" ? "Staging" : "Development";
  if (me.auth_bypass_enabled) {
    return `${label} environment — auth bypass enabled`;
  }
  return `${label} environment`;
}

const ACTIONS: SignupRequestAdminStatus[] = ["reviewed", "approved", "rejected"];

export default function AdminSignupsPage() {
  const [me, setMe] = useState<DashboardMeResponse | null>(null);
  const [rows, setRows] = useState<SignupRequestAdminRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const m = await fetchDashboardMe();
      setMe(m);
      if (m.role !== "platform_admin") {
        setRows([]);
        setLoading(false);
        return;
      }
      const list = await fetchAdminSignups();
      setRows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(id: string, status: SignupRequestAdminStatus) {
    setBusyId(id);
    setError(null);
    try {
      await patchSignupRequestStatus(id, status);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  const forbidden = me && me.role !== "platform_admin";

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
      {me && me.deployment_mode !== "production" ? (
        <div className="border-b border-amber-500/50 bg-amber-950 px-4 py-2.5 text-center text-sm text-amber-100">
          {deploymentBannerLabel(me)}
        </div>
      ) : null}
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold tracking-wide text-white">Signup requests</div>
            <div className="text-xs text-slate-400">Free access form submissions (platform admin only).</div>
            {me ? (
              <div className="mt-2 text-xs text-slate-500">
                Signed in as <span className="text-slate-300">{me.email}</span>
              </div>
            ) : null}
          </div>
          <Link to="/" className="text-sm font-medium text-indigo-300 hover:text-indigo-200 hover:underline">
            Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6 text-sm text-slate-400">Loading…</div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-5 text-sm text-red-200">{error}</div>
        ) : null}

        {forbidden ? (
          <div className="rounded-2xl border border-amber-900/50 bg-amber-950/20 p-6 text-sm text-amber-100">
            This page is only available to <strong className="text-amber-50">platform_admin</strong> users.
          </div>
        ) : null}

        {!forbidden && !loading ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
            <table className="w-full min-w-[960px] text-left text-sm text-slate-200">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3">Created</th>
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Company</th>
                  <th className="px-3 py-3">Website</th>
                  <th className="px-3 py-3">Use case</th>
                  <th className="px-3 py-3">Tools</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                      No signup requests yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-900 align-top">
                      <td className="px-3 py-2 text-xs text-slate-400 whitespace-nowrap">{row.created_at}</td>
                      <td className="px-3 py-2">{row.name}</td>
                      <td className="px-3 py-2 font-mono text-xs">{row.email}</td>
                      <td className="px-3 py-2">{row.company}</td>
                      <td className="px-3 py-2 text-xs">{row.website}</td>
                      <td className="max-w-[220px] px-3 py-2 text-xs text-slate-400">{row.use_case}</td>
                      <td className="px-3 py-2 text-xs text-slate-400">{row.tools.join(", ") || "—"}</td>
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-slate-900 px-2 py-1 text-[11px] uppercase tracking-wide text-slate-300">
                          {row.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {ACTIONS.map((st) => (
                            <button
                              key={st}
                              type="button"
                              disabled={busyId === row.id || row.status === st}
                              onClick={() => void setStatus(row.id, st)}
                              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </main>
    </div>
  );
}
