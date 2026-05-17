import type { DashboardMeResponse, DashboardRole, DashboardSiteDTO } from "@si/shared";

export type EnvAccess = {
  SI_DB: D1Database;
  SI_BYPASS_DASHBOARD_AUTH?: string;
  SI_DEV_ACCESS_EMAIL?: string;
  SI_DASHBOARD_ORIGINS?: string;
  SI_DEPLOYMENT_MODE?: string;
  SI_ENV?: string;
};

export type ResolvedCollectSite = { tenant_id: string; site_id: string };

export function stripWww(host: string): string {
  const h = host.toLowerCase();
  return h.startsWith("www.") ? h.slice(4) : h;
}

export function normalizeOriginHost(origin: string): string {
  try {
    const u = new URL(origin);
    return stripWww(u.hostname);
  } catch {
    return "";
  }
}

export function parseDashboardOrigins(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

/** CORS for credentialed dashboard fetches (browser sends cookies for Cloudflare Access). */
export function dashboardCorsHeaders(request: Request, env: EnvAccess): HeadersInit | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const allowed = parseDashboardOrigins(env.SI_DASHBOARD_ORIGINS);
  if (!allowed.includes(origin)) return null;
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
    "access-control-allow-headers": "content-type, x-si-site-id",
    Vary: "Origin",
  };
}

export function publicCorsHeaders(request?: Request): HeadersInit {
  const origin = request?.headers.get("Origin");
  if (origin) {
    return {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
      Vary: "Origin",
    };
  }
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  };
}

export function jsonPublic(data: unknown, init: ResponseInit = {}, request?: Request): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers ?? {}),
      ...publicCorsHeaders(request),
    },
  });
}

export function jsonDashboard(data: unknown, request: Request, env: EnvAccess, init: ResponseInit = {}): Response {
  const dc = dashboardCorsHeaders(request, env);
  const cors = dc ?? publicCorsHeaders(request);
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers ?? {}),
      ...cors,
    },
  });
}

export function resolveDashboardEmail(request: Request, env: EnvAccess): { email: string; via: "access" | "dev_bypass" } | null {
  if (env.SI_BYPASS_DASHBOARD_AUTH === "1") {
    const hdr = request.headers.get("x-si-dev-access-email")?.trim().toLowerCase();
    if (hdr) return { email: hdr, via: "dev_bypass" };
    const fallback = env.SI_DEV_ACCESS_EMAIL?.trim().toLowerCase();
    if (fallback) return { email: fallback, via: "dev_bypass" };
  }
  const accessEmail = request.headers.get("cf-access-authenticated-user-email")?.trim().toLowerCase();
  if (accessEmail) return { email: accessEmail, via: "access" };
  return null;
}

export async function loadAuthorizedUser(
  db: D1Database,
  email: string,
): Promise<{ id: string; tenant_id: string; email: string; role: DashboardRole } | null> {
  const row = await db
    .prepare(`SELECT id, tenant_id, email, role FROM authorized_users WHERE lower(email) = lower(?) LIMIT 1`)
    .bind(email)
    .first<{ id: string; tenant_id: string; email: string; role: string }>();
  if (!row) return null;
  const role = row.role as DashboardRole;
  if (role !== "customer_viewer" && role !== "tenant_admin" && role !== "platform_admin") return null;
  return { ...row, role };
}

export async function loadSitesForUser(
  db: D1Database,
  user: { tenant_id: string; role: DashboardRole },
): Promise<DashboardSiteDTO[]> {
  if (user.role === "platform_admin") {
    const r = await db
      .prepare(`SELECT id, tenant_id, domain, snippet_key, display_name FROM sites ORDER BY display_name ASC`)
      .all<DashboardSiteDTO>();
    return r.results ?? [];
  }
  const r = await db
    .prepare(
      `SELECT id, tenant_id, domain, snippet_key, display_name FROM sites WHERE tenant_id = ? ORDER BY display_name ASC`,
    )
    .bind(user.tenant_id)
    .all<DashboardSiteDTO>();
  return r.results ?? [];
}

export async function assertSiteAllowedForUser(
  db: D1Database,
  user: { tenant_id: string; role: DashboardRole },
  siteId: string,
): Promise<boolean> {
  if (user.role === "platform_admin") {
    const hit = await db.prepare(`SELECT 1 as ok FROM sites WHERE id = ? LIMIT 1`).bind(siteId).first<{ ok: number }>();
    return !!hit;
  }
  const hit = await db
    .prepare(`SELECT 1 as ok FROM sites WHERE id = ? AND tenant_id = ? LIMIT 1`)
    .bind(siteId, user.tenant_id)
    .first<{ ok: number }>();
  return !!hit;
}

export type CollectEnvelope = {
  reason?: unknown;
  payload?: unknown;
  site_id?: unknown;
  snippet_key?: unknown;
};

export async function resolveCollectSite(
  db: D1Database,
  envelope: CollectEnvelope,
  payloadOrigin: string,
): Promise<ResolvedCollectSite | null | { error: string }> {
  const sk = typeof envelope.snippet_key === "string" ? envelope.snippet_key.trim() : "";
  if (sk) {
    const row = await db
      .prepare(`SELECT id, tenant_id FROM sites WHERE snippet_key = ? LIMIT 1`)
      .bind(sk)
      .first<{ id: string; tenant_id: string }>();
    if (!row) return { error: "unknown_snippet_key" };
    const sid = typeof envelope.site_id === "string" ? envelope.site_id.trim() : "";
    if (sid && sid !== row.id) {
      return { error: "site_id_snippet_mismatch" };
    }
    return { tenant_id: row.tenant_id, site_id: row.id };
  }
  const sid = typeof envelope.site_id === "string" ? envelope.site_id.trim() : "";
  if (sid) {
    const row = await db
      .prepare(`SELECT id, tenant_id FROM sites WHERE id = ? LIMIT 1`)
      .bind(sid)
      .first<{ id: string; tenant_id: string }>();
    if (!row) return { error: "unknown_site_id" };
    return { tenant_id: row.tenant_id, site_id: row.id };
  }
  const host = normalizeOriginHost(payloadOrigin);
  if (!host) return null;
  const row = await db
    .prepare(`SELECT id, tenant_id FROM sites WHERE lower(domain) = lower(?) LIMIT 1`)
    .bind(host)
    .first<{ id: string; tenant_id: string }>();
  if (!row) return null;
  return { tenant_id: row.tenant_id, site_id: row.id };
}

export type DashboardMeCore = Pick<DashboardMeResponse, "email" | "role" | "auth_via" | "sites">;

export async function buildDashboardMe(
  db: D1Database,
  email: string,
  via: "access" | "dev_bypass",
): Promise<DashboardMeCore | null> {
  const user = await loadAuthorizedUser(db, email);
  if (!user) return null;
  const sites = await loadSitesForUser(db, user);
  return {
    email: user.email,
    role: user.role,
    auth_via: via,
    sites,
  };
}
