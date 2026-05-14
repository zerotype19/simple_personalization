import type {
  DashboardAdminSignupsResponse,
  SignupRequestAdminRow,
  SignupRequestAdminStatus,
} from "@si/shared";
import { jsonDashboard, loadAuthorizedUser, resolveDashboardEmail, type EnvAccess } from "./access";

type AdminEnv = EnvAccess;

export async function requirePlatformAdmin(
  request: Request,
  env: AdminEnv,
): Promise<{ email: string } | Response> {
  const auth = resolveDashboardEmail(request, env);
  if (!auth) {
    return jsonDashboard({ error: "unauthorized", message: "Missing Cloudflare Access identity" }, request, env, {
      status: 403,
    });
  }
  const user = await loadAuthorizedUser(env.SI_DB, auth.email);
  if (!user || user.role !== "platform_admin") {
    return jsonDashboard({ error: "forbidden", message: "platform_admin role required" }, request, env, {
      status: 403,
    });
  }
  return { email: user.email };
}

function parseRowStatus(raw: string): SignupRequestAdminStatus {
  const s = raw.trim().toLowerCase();
  if (s === "reviewed" || s === "approved" || s === "rejected" || s === "pending") return s;
  return "pending";
}

export async function handleAdminSignupsList(request: Request, env: AdminEnv): Promise<Response> {
  const gate = await requirePlatformAdmin(request, env);
  if (gate instanceof Response) return gate;

  const r = await env.SI_DB
    .prepare(
      `SELECT id, name, email, company, website, use_case, tools_json, created_at, status
       FROM signup_requests ORDER BY datetime(created_at) DESC LIMIT 200`,
    )
    .all<{
      id: string;
      name: string;
      email: string;
      company: string;
      website: string;
      use_case: string;
      tools_json: string;
      created_at: string;
      status: string;
    }>();

  const rows = r.results ?? [];
  const signups: SignupRequestAdminRow[] = rows.map((row) => {
    let tools: string[] = [];
    try {
      const p = JSON.parse(row.tools_json) as unknown;
      if (Array.isArray(p)) tools = p.filter((t): t is string => typeof t === "string");
    } catch {
      tools = [];
    }
    return {
      id: row.id,
      created_at: row.created_at,
      name: row.name,
      email: row.email,
      company: row.company,
      website: row.website,
      use_case: row.use_case,
      tools,
      status: parseRowStatus(row.status),
    };
  });

  const body: DashboardAdminSignupsResponse = { signups };
  return jsonDashboard(body, request, env);
}

const PATCHABLE: SignupRequestAdminStatus[] = ["reviewed", "approved", "rejected"];

export function parseSignupAdminPatchStatus(v: unknown): SignupRequestAdminStatus | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase() as SignupRequestAdminStatus;
  return PATCHABLE.includes(s) ? s : null;
}

export function isValidSignupId(id: string): boolean {
  if (!id || id.length > 80) return false;
  return /^[0-9a-f-]{36}$/i.test(id);
}

export async function handleAdminSignupPatch(request: Request, env: AdminEnv, id: string): Promise<Response> {
  const gate = await requirePlatformAdmin(request, env);
  if (gate instanceof Response) return gate;

  if (!isValidSignupId(id)) {
    return jsonDashboard({ error: "invalid_id", message: "Invalid signup id" }, request, env, { status: 400 });
  }

  const text = await request.text();
  if (text.length > 4096) {
    return jsonDashboard({ error: "payload_too_large" }, request, env, { status: 413 });
  }
  let body: { status?: unknown };
  try {
    body = JSON.parse(text) as { status?: unknown };
  } catch {
    return jsonDashboard({ error: "invalid_json" }, request, env, { status: 400 });
  }
  const status = parseSignupAdminPatchStatus(body.status);
  if (!status) {
    return jsonDashboard({ error: "invalid_status", message: "status must be reviewed, approved, or rejected" }, request, env, {
      status: 400,
    });
  }

  const run = await env.SI_DB.prepare(`UPDATE signup_requests SET status = ? WHERE id = ?`).bind(status, id).run();
  if (!run.success) {
    return jsonDashboard({ error: "update_failed" }, request, env, { status: 500 });
  }
  if (run.meta?.changes === 0) {
    return jsonDashboard({ error: "not_found", message: "No signup row with that id" }, request, env, { status: 404 });
  }

  return jsonDashboard({ ok: true, id, status }, request, env);
}
