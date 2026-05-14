import type {
  AnalyticsPayload,
  DashboardInsightsResponse,
  DashboardMeResponse,
  DashboardSessionListRow,
  DashboardSummary,
  ExperimentReport,
  SDKConfig,
  VariantReport,
} from "@si/shared";
import { getDemoExperimentReports } from "@si/shared/demoMetrics";
import { clamp01, mergeExperiment } from "./analyticsMath";
import { GENERIC_HOSTED_SDK_CONFIG, VELOCITY_RETAIL_DEMO_SDK_CONFIG } from "@si/shared";
import {
  assertSiteAllowedForUser,
  buildDashboardMe,
  dashboardCorsHeaders,
  jsonDashboard,
  jsonPublic,
  loadAuthorizedUser,
  parseDashboardOrigins,
  publicCorsHeaders,
  resolveCollectSite,
  resolveDashboardEmail,
  type CollectEnvelope,
  type EnvAccess,
} from "./access";
import { handleAdminSignupsList, handleAdminSignupPatch } from "./adminSignups";
import { handleSignupRequest } from "./signup";
import { assertProductionSafety, isAuthBypassEnabled, parseDeploymentMode } from "./deploymentSafety";

type Env = EnvAccess & {
  SI_KV?: KVNamespace;
};

const DEMO_EXPERIMENTS: ExperimentReport[] = getDemoExperimentReports();

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const gate = assertProductionSafety(env);
    if (gate) return gate;

    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      if (url.pathname.startsWith("/dashboard")) {
        const h = dashboardCorsHeaders(request, env) ?? publicCorsHeaders();
        return new Response(null, { headers: h });
      }
      return new Response(null, { headers: publicCorsHeaders() });
    }

    try {
      if (request.method === "GET" && url.pathname === "/config") {
        return await handleConfig(request, env);
      }

      if (request.method === "POST" && url.pathname === "/collect") {
        return await handleCollect(request, env, ctx);
      }

      if (request.method === "POST" && url.pathname === "/signup-request") {
        return await handleSignupRequest(request, env);
      }

      if (request.method === "GET" && url.pathname === "/dashboard/me") {
        return await handleDashboardMe(request, env);
      }

      if (request.method === "GET" && url.pathname === "/dashboard/admin/signups") {
        return await handleAdminSignupsList(request, env);
      }

      {
        const adminPatch = url.pathname.match(/^\/dashboard\/admin\/signups\/([^/]+)$/);
        if (request.method === "PATCH" && adminPatch?.[1]) {
          return await handleAdminSignupPatch(request, env, adminPatch[1]);
        }
      }

      if (request.method === "GET" && url.pathname === "/dashboard/summary") {
        return await handleSummary(request, env);
      }

      if (request.method === "GET" && url.pathname === "/dashboard/experiments") {
        return await handleExperiments(request, env);
      }

      if (request.method === "GET" && url.pathname === "/dashboard/sessions") {
        return await handleSessions(request, env);
      }

      if (request.method === "GET" && url.pathname === "/dashboard/insights") {
        return await handleInsights(request, env);
      }

      return jsonPublic({ error: "not_found" }, { status: 404 });
    } catch (e) {
      return jsonPublic({ error: "internal_error", message: String(e) }, { status: 500 });
    }
  },
};

function configBaseForRequest(request: Request): SDKConfig {
  const url = new URL(request.url);
  return url.searchParams.get("demo") === "velocity"
    ? VELOCITY_RETAIL_DEMO_SDK_CONFIG
    : GENERIC_HOSTED_SDK_CONFIG;
}

async function handleConfig(request: Request, env: Env): Promise<Response> {
  const base = configBaseForRequest(request);
  const kv = env.SI_KV;
  if (kv) {
    const raw = await kv.get("config:active", { type: "text" });
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        return jsonPublic(deepMerge(clone(base) as any, parsed));
      } catch {
        /* fall through */
      }
    }
  }
  return jsonPublic(base);
}

type DashboardAuthOk = {
  email: string;
  via: "access" | "dev_bypass";
  user: NonNullable<Awaited<ReturnType<typeof loadAuthorizedUser>>>;
  siteId: string;
};

async function requireDashboardSite(request: Request, env: Env): Promise<DashboardAuthOk | Response> {
  const auth = resolveDashboardEmail(request, env);
  if (!auth) {
    return jsonDashboard({ error: "unauthorized", message: "Missing Cloudflare Access identity" }, request, env, {
      status: 403,
    });
  }
  const user = await loadAuthorizedUser(env.SI_DB, auth.email);
  if (!user) {
    return jsonDashboard({ error: "forbidden", message: "Email not provisioned in authorized_users" }, request, env, {
      status: 403,
    });
  }
  const siteId =
    request.headers.get("x-si-site-id")?.trim() ||
    new URL(request.url).searchParams.get("site_id")?.trim() ||
    "";
  if (!siteId) {
    return jsonDashboard({ error: "site_id_required", message: "Pass site_id query or X-SI-Site-Id header" }, request, env, {
      status: 400,
    });
  }
  const ok = await assertSiteAllowedForUser(env.SI_DB, user, siteId);
  if (!ok) {
    return jsonDashboard({ error: "forbidden_site", message: "Site not allowed for this user" }, request, env, {
      status: 403,
    });
  }
  return { email: auth.email, via: auth.via, user, siteId };
}

async function handleDashboardMe(request: Request, env: Env): Promise<Response> {
  const auth = resolveDashboardEmail(request, env);
  if (!auth) {
    return jsonDashboard({ error: "unauthorized", message: "Missing Cloudflare Access identity" }, request, env, {
      status: 403,
    });
  }
  const me = await buildDashboardMe(env.SI_DB, auth.email, auth.via);
  if (!me) {
    return jsonDashboard({ error: "forbidden", message: "Email not provisioned in authorized_users" }, request, env, {
      status: 403,
    });
  }
  const body: DashboardMeResponse = {
    ...me,
    deployment_mode: parseDeploymentMode(env),
    auth_bypass_enabled: isAuthBypassEnabled(env.SI_BYPASS_DASHBOARD_AUTH),
  };
  return jsonDashboard(body, request, env);
}

async function handleSummary(request: Request, env: Env): Promise<Response> {
  const gate = await requireDashboardSite(request, env);
  if (gate instanceof Response) return gate;

  const row = await env.SI_DB.prepare(
    `WITH per_session AS (
       SELECT
         session_id,
         MAX(converted) AS converted,
         AVG(intent_score) AS intent,
         AVG(engagement_score) AS engagement
       FROM sessions_summary
       WHERE site_id = ?
       GROUP BY session_id
     )
     SELECT
       COUNT(*) AS sessions,
       SUM(CASE WHEN converted = 1 THEN 1 ELSE 0 END) AS conversions,
       AVG(intent) AS avg_intent,
       AVG(engagement) AS avg_engagement
     FROM per_session`,
  )
    .bind(gate.siteId)
    .first<{
      sessions: number | null;
      conversions: number | null;
      avg_intent: number | null;
      avg_engagement: number | null;
    }>();

  const summary: DashboardSummary = {
    sessions_ingested: row?.sessions ?? 0,
    conversions: row?.conversions ?? 0,
    avg_intent: row?.avg_intent ?? 0,
    avg_engagement: row?.avg_engagement ?? 0,
    updated_at: Date.now(),
  };

  return jsonDashboard(summary, request, env);
}

async function handleExperiments(request: Request, env: Env): Promise<Response> {
  const gate = await requireDashboardSite(request, env);
  if (gate instanceof Response) return gate;

  const rows = await env.SI_DB.prepare(
    `SELECT
       json_extract(experiment_json, '$.experiment_id') as experiment_id,
       json_extract(experiment_json, '$.variant_id') as variant_id,
       CASE
         WHEN json_type(experiment_json, '$.is_control') = 'true' THEN 1
         WHEN CAST(json_extract(experiment_json, '$.is_control') AS INTEGER) = 1 THEN 1
         ELSE 0
       END as is_control,
       COUNT(DISTINCT session_id) as sessions,
       COALESCE(SUM(CAST(json_extract(summary_json, '$.cta_clicks') AS REAL)), 0)
         / NULLIF(COALESCE(SUM(CAST(json_extract(summary_json, '$.pages') AS REAL)), 0), 0) as cta_ctr,
       COUNT(DISTINCT CASE WHEN converted = 1 THEN session_id END) * 1.0
         / NULLIF(COUNT(DISTINCT session_id), 0) as conversion_rate,
       AVG(engagement_score) as avg_engagement
     FROM sessions_summary
     WHERE experiment_json IS NOT NULL AND site_id = ?
     GROUP BY 1, 2, 3`,
  )
    .bind(gate.siteId)
    .all<{
      experiment_id: string | null;
      variant_id: string | null;
      is_control: number | null;
      sessions: number | null;
      cta_ctr: number | null;
      conversion_rate: number | null;
      avg_engagement: number | null;
    }>();

  const live = new Map<string, Map<string, VariantReport>>();
  for (const r of rows.results ?? []) {
    if (!r.experiment_id || !r.variant_id) continue;
    const expId = r.experiment_id;
    if (!live.has(expId)) live.set(expId, new Map());
    const m = live.get(expId)!;
    m.set(r.variant_id, {
      id: r.variant_id,
      name: r.variant_id,
      is_control: !!r.is_control,
      sessions: r.sessions ?? 0,
      cta_ctr: clamp01(r.cta_ctr ?? 0),
      conversion_rate: clamp01(r.conversion_rate ?? 0),
      avg_engagement: r.avg_engagement ?? 0,
      lift_cta: null,
      lift_conversion: null,
    });
  }

  const merged: ExperimentReport[] = DEMO_EXPERIMENTS.map((demo) => mergeExperiment(demo, live.get(demo.id)));
  return jsonDashboard({ experiments: merged }, request, env);
}

async function handleSessions(request: Request, env: Env): Promise<Response> {
  const gate = await requireDashboardSite(request, env);
  if (gate instanceof Response) return gate;
  const limit = Math.min(100, Math.max(1, Number(new URL(request.url).searchParams.get("limit")) || 40));

  const rows = await env.SI_DB.prepare(
    `SELECT s.session_id, s.origin, s.journey_stage, s.intent_score, s.converted, s.created_at
     FROM sessions_summary s
     INNER JOIN (
       SELECT session_id, MAX(created_at) AS mx
       FROM sessions_summary
       WHERE site_id = ?
       GROUP BY session_id
     ) t ON s.session_id = t.session_id AND s.created_at = t.mx
     WHERE s.site_id = ?
     ORDER BY s.created_at DESC
     LIMIT ?`,
  )
    .bind(gate.siteId, gate.siteId, limit)
    .all<DashboardSessionListRow>();

  return jsonDashboard({ sessions: rows.results ?? [] }, request, env);
}

async function handleInsights(request: Request, env: Env): Promise<Response> {
  const gate = await requireDashboardSite(request, env);
  if (gate instanceof Response) return gate;

  const siteId = gate.siteId;

  const stages = await env.SI_DB.prepare(
    `SELECT json_extract(summary_json, '$.journey_stage') AS stage, COUNT(DISTINCT session_id) AS sessions
     FROM sessions_summary WHERE site_id = ? AND summary_json IS NOT NULL
     GROUP BY 1 ORDER BY sessions DESC LIMIT 12`,
  )
    .bind(siteId)
    .all<{ stage: string | null; sessions: number | null }>();

  const verts = await env.SI_DB.prepare(
    `SELECT json_extract(summary_json, '$.site_vertical') AS vertical, COUNT(DISTINCT session_id) AS sessions
     FROM sessions_summary WHERE site_id = ? AND summary_json IS NOT NULL
     GROUP BY 1 ORDER BY sessions DESC LIMIT 12`,
  )
    .bind(siteId)
    .all<{ vertical: string | null; sessions: number | null }>();

  const body: DashboardInsightsResponse = {
    journey_stages: (stages.results ?? [])
      .filter((r) => r.stage)
      .map((r) => ({ stage: String(r.stage), sessions: r.sessions ?? 0 })),
    site_verticals: (verts.results ?? [])
      .filter((r) => r.vertical)
      .map((r) => ({ vertical: String(r.vertical), sessions: r.sessions ?? 0 })),
    activation_opportunity_hits: [],
    acquisition_sources: [],
    personalization_signal_samples: [],
  };

  return jsonDashboard(body, request, env);
}

async function handleCollect(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  if (!(await rateLimit(env, ip))) {
    return jsonPublic({ error: "rate_limited" }, { status: 429 });
  }

  const text = await request.text();
  if (text.length > 50_000) {
    return jsonPublic({ error: "payload_too_large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return jsonPublic({ error: "invalid_json" }, { status: 400 });
  }

  const envelope = body as CollectEnvelope;
  if (!envelope || typeof envelope !== "object") return jsonPublic({ error: "invalid_body" }, { status: 400 });
  if (typeof envelope.reason !== "string") return jsonPublic({ error: "invalid_reason" }, { status: 400 });

  const payload = envelope.payload;
  const err = validatePayload(payload);
  if (err) return jsonPublic({ error: err }, { status: 400 });

  const p = payload as AnalyticsPayload;
  const siteRes = await resolveCollectSite(env.SI_DB, envelope, p.origin);
  if (siteRes && "error" in siteRes) {
    return jsonPublic({ error: siteRes.error }, { status: 400 });
  }
  const tenantId = siteRes?.tenant_id ?? null;
  const siteId = siteRes?.site_id ?? null;

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const treatmentId = p.active_treatments?.[0]?.treatment_id ?? null;

  ctx.waitUntil(
    env.SI_DB.prepare(
      `INSERT INTO sessions_summary (
        id, session_id, origin, ingest_reason, summary_json,
        intent_score, urgency_score, engagement_score, journey_stage,
        treatment_id, converted, conversion_type, experiment_json, treatments_json, created_at,
        tenant_id, site_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        p.session_id,
        p.origin,
        envelope.reason,
        JSON.stringify(p.summary),
        p.summary.intent_score,
        p.summary.urgency_score,
        p.summary.engagement_score,
        p.summary.journey_stage,
        treatmentId,
        p.converted ? 1 : 0,
        p.conversion_type ?? null,
        p.experiment_assignment ? JSON.stringify(p.experiment_assignment) : null,
        JSON.stringify(p.active_treatments ?? []),
        createdAt,
        tenantId,
        siteId,
      )
      .run()
      .catch(() => undefined),
  );

  return jsonPublic({ ok: true });
}

export function validatePayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return "invalid_payload";
  const p = payload as Partial<AnalyticsPayload>;
  if (typeof p.session_id !== "string" || p.session_id.length < 6) return "invalid_session_id";
  if (typeof p.origin !== "string") return "invalid_origin";
  if (!p.summary || typeof p.summary !== "object") return "invalid_summary";
  const s = p.summary;
  const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  if (!num(s.pages) || s.pages < 0) return "invalid_summary_pages";
  if (!num(s.vdp_views) || s.vdp_views < 0) return "invalid_summary_vdp";
  if (!num(s.pricing_views) || s.pricing_views < 0) return "invalid_summary_pricing";
  if (!num(s.finance_interactions) || s.finance_interactions < 0) return "invalid_summary_finance";
  if (!num(s.compare_interactions) || s.compare_interactions < 0) return "invalid_summary_compare";
  if (!num(s.cta_clicks) || s.cta_clicks < 0) return "invalid_summary_cta";
  if (!num(s.max_scroll_depth) || s.max_scroll_depth < 0) return "invalid_summary_scroll";
  if (!num(s.intent_score)) return "invalid_summary_intent";
  if (!num(s.urgency_score)) return "invalid_summary_urgency";
  if (!num(s.engagement_score)) return "invalid_summary_engagement";
  if (typeof s.journey_stage !== "string") return "invalid_summary_stage";
  if (!s.category_affinity || typeof s.category_affinity !== "object") return "invalid_summary_affinity";
  for (const v of Object.values(s.category_affinity)) {
    if (!num(v) || v < 0 || v > 1.001) return "invalid_summary_affinity_value";
  }
  if (typeof p.converted !== "boolean") return "invalid_converted";
  return null;
}

async function rateLimit(env: Env, ip: string): Promise<boolean> {
  const kv = env.SI_KV;
  if (!kv) return true;
  const key = `rl:collect:${ip}`;
  const now = Date.now();
  const windowMs = 60_000;
  const max = 120;

  const raw = await kv.get(key);
  const data = raw ? (JSON.parse(raw) as { t: number; n: number }) : { t: now, n: 0 };
  if (now - data.t > windowMs) {
    await kv.put(key, JSON.stringify({ t: now, n: 1 }), { expirationTtl: 120 });
    return true;
  }
  if (data.n >= max) return false;
  await kv.put(key, JSON.stringify({ t: data.t, n: data.n + 1 }), { expirationTtl: 120 });
  return true;
}

function deepMerge<T extends Record<string, any>>(base: T, patch: Record<string, any>): T {
  for (const key of Object.keys(patch)) {
    const pv = patch[key];
    if (pv === undefined) continue;
    const bv = base[key];
    if (Array.isArray(pv)) {
      (base as any)[key] = pv;
    } else if (pv && typeof pv === "object" && !Array.isArray(pv)) {
      (base as any)[key] = deepMerge((bv && typeof bv === "object" ? bv : {}) as any, pv as any);
    } else {
      (base as any)[key] = pv;
    }
  }
  return base;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** Exported for tests that assert CORS allowlist parsing. */
export { parseDashboardOrigins };
