import type { EnvAccess } from "./access";
import { jsonPublic } from "./access";

export type SignupBody = {
  name?: unknown;
  email?: unknown;
  company?: unknown;
  website?: unknown;
  use_case?: unknown;
  tools?: unknown;
};

export function validateSignupBody(body: SignupBody): { error: string } | null {
  const str = (v: unknown, field: string, max = 2000) => {
    if (typeof v !== "string") return `${field}_required` as const;
    const t = v.trim();
    if (!t) return `${field}_empty` as const;
    if (t.length > max) return `${field}_too_long` as const;
    return null;
  };
  const e1 = str(body.name, "name", 200);
  if (e1) return { error: e1 };
  const e2 = str(body.company, "company", 200);
  if (e2) return { error: e2 };
  const e3 = str(body.website, "website", 500);
  if (e3) return { error: e3 };
  const e4 = str(body.use_case, "use_case", 4000);
  if (e4) return { error: e4 };
  const em = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!em || em.length > 320) return { error: "email_invalid" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return { error: "email_invalid" };
  if (body.tools !== undefined && body.tools !== null && !Array.isArray(body.tools)) {
    return { error: "tools_invalid" };
  }
  const tools = Array.isArray(body.tools) ? body.tools.filter((t) => typeof t === "string") : [];
  if (tools.length > 40) return { error: "tools_too_many" };
  for (const t of tools) {
    if (t.length > 64) return { error: "tools_item_too_long" };
  }
  return null;
}

export async function signupRateLimit(env: { SI_KV?: KVNamespace }, ip: string): Promise<boolean> {
  const kv = env.SI_KV;
  if (!kv) return true;
  const key = `rl:signup:${ip}`;
  const now = Date.now();
  const windowMs = 3600_000;
  const max = 10;
  const raw = await kv.get(key);
  const data = raw ? (JSON.parse(raw) as { t: number; n: number }) : { t: now, n: 0 };
  if (now - data.t > windowMs) {
    await kv.put(key, JSON.stringify({ t: now, n: 1 }), { expirationTtl: 7200 });
    return true;
  }
  if (data.n >= max) return false;
  await kv.put(key, JSON.stringify({ t: data.t, n: data.n + 1 }), { expirationTtl: 7200 });
  return true;
}

export async function handleSignupRequest(
  request: Request,
  env: EnvAccess & { SI_KV?: KVNamespace },
): Promise<Response> {
  if (request.method !== "POST") {
    return jsonPublic({ error: "method_not_allowed" }, { status: 405 });
  }
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  if (!(await signupRateLimit(env, ip))) {
    return jsonPublic({ error: "rate_limited" }, { status: 429 });
  }

  const text = await request.text();
  if (text.length > 32_000) {
    return jsonPublic({ error: "payload_too_large" }, { status: 413 });
  }
  let parsed: SignupBody;
  try {
    parsed = JSON.parse(text) as SignupBody;
  } catch {
    return jsonPublic({ error: "invalid_json" }, { status: 400 });
  }
  const verr = validateSignupBody(parsed);
  if (verr) return jsonPublic({ error: verr.error }, { status: 400 });

  const name = String(parsed.name).trim();
  const email = String(parsed.email).trim().toLowerCase();
  const company = String(parsed.company).trim();
  const website = String(parsed.website).trim();
  const use_case = String(parsed.use_case).trim();
  const tools = Array.isArray(parsed.tools) ? parsed.tools.filter((t): t is string => typeof t === "string") : [];
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const run = await env.SI_DB.prepare(
    `INSERT INTO signup_requests (id, name, email, company, website, use_case, tools_json, created_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
  )
    .bind(id, name, email, company, website, use_case, JSON.stringify(tools), createdAt)
    .run();

  if (!run.success) {
    return jsonPublic({ error: "storage_failed" }, { status: 500 });
  }

  return jsonPublic({ ok: true, id });
}
