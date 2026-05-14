import type {
  DashboardInsightsResponse,
  DashboardMeResponse,
  DashboardSessionListRow,
  DashboardSummary,
  ExperimentReport,
  SignupRequestAdminRow,
  SignupRequestAdminStatus,
} from "@si/shared";
import { workerUrl } from "./workerUrl";

function dashHeaders(siteId: string): HeadersInit {
  return { "X-SI-Site-Id": siteId };
}

export async function fetchDashboardMe(): Promise<DashboardMeResponse> {
  const r = await fetch(workerUrl("/dashboard/me"), { credentials: "include" });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || `GET /dashboard/me ${r.status}`);
  }
  return r.json() as Promise<DashboardMeResponse>;
}

export async function fetchAdminSignups(): Promise<SignupRequestAdminRow[]> {
  const r = await fetch(workerUrl("/dashboard/admin/signups"), { credentials: "include" });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || `GET /dashboard/admin/signups ${r.status}`);
  }
  const j = (await r.json()) as { signups: SignupRequestAdminRow[] };
  return j.signups;
}

export async function patchSignupRequestStatus(id: string, status: SignupRequestAdminStatus): Promise<void> {
  const r = await fetch(workerUrl(`/dashboard/admin/signups/${encodeURIComponent(id)}`), {
    method: "PATCH",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || `PATCH signup ${r.status}`);
  }
}

export async function fetchDashboardSummary(siteId: string): Promise<DashboardSummary> {
  const r = await fetch(workerUrl(`/dashboard/summary?site_id=${encodeURIComponent(siteId)}`), {
    credentials: "include",
    headers: dashHeaders(siteId),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<DashboardSummary>;
}

export async function fetchDashboardExperiments(siteId: string): Promise<ExperimentReport[]> {
  const r = await fetch(workerUrl(`/dashboard/experiments?site_id=${encodeURIComponent(siteId)}`), {
    credentials: "include",
    headers: dashHeaders(siteId),
  });
  if (!r.ok) throw new Error(await r.text());
  const j = (await r.json()) as { experiments: ExperimentReport[] };
  return j.experiments;
}

export async function fetchDashboardSessions(siteId: string, limit = 40): Promise<DashboardSessionListRow[]> {
  const r = await fetch(
    workerUrl(`/dashboard/sessions?site_id=${encodeURIComponent(siteId)}&limit=${encodeURIComponent(String(limit))}`),
    { credentials: "include", headers: dashHeaders(siteId) },
  );
  if (!r.ok) throw new Error(await r.text());
  const j = (await r.json()) as { sessions: DashboardSessionListRow[] };
  return j.sessions;
}

export async function fetchDashboardInsights(siteId: string): Promise<DashboardInsightsResponse> {
  const r = await fetch(workerUrl(`/dashboard/insights?site_id=${encodeURIComponent(siteId)}`), {
    credentials: "include",
    headers: dashHeaders(siteId),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<DashboardInsightsResponse>;
}
