import { jsonPublic, parseDashboardOrigins } from "./access";

export type DeploymentMode = "development" | "staging" | "production";

export type EnvWithDeployment = {
  SI_DEPLOYMENT_MODE?: string;
  SI_ENV?: string;
  SI_BYPASS_DASHBOARD_AUTH?: string;
  SI_DEV_ACCESS_EMAIL?: string;
  SI_DASHBOARD_ORIGINS?: string;
};

/** True when dashboard auth bypass is enabled (insecure for production). */
export function isAuthBypassEnabled(raw: string | undefined): boolean {
  const v = (raw ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/**
 * Resolves explicit deployment mode. Prefer SI_DEPLOYMENT_MODE; fall back to SI_ENV.
 * Unknown non-empty SI_DEPLOYMENT_MODE values are treated as development (fail-open for local ergonomics).
 */
export function parseDeploymentMode(env: EnvWithDeployment): DeploymentMode {
  const raw = (env.SI_DEPLOYMENT_MODE ?? "").trim().toLowerCase();
  if (raw === "production" || raw === "prod") return "production";
  if (raw === "staging" || raw === "stage") return "staging";
  if (raw === "development" || raw === "dev") return "development";
  if (raw.length > 0) return "development";

  const legacy = (env.SI_ENV ?? "").trim().toLowerCase();
  if (legacy === "production" || legacy === "prod") return "production";
  if (legacy === "staging" || legacy === "stage") return "staging";
  if (legacy === "development" || legacy === "dev") return "development";
  return "development";
}

export function originsContainLocalhost(origins: string | undefined): boolean {
  for (const o of parseDashboardOrigins(origins)) {
    try {
      const host = new URL(o).hostname.toLowerCase();
      if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".localhost")) {
        return true;
      }
    } catch {
      /* ignore malformed origin entries */
    }
  }
  return false;
}

export type DeploymentSafetyResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export function evaluateDeploymentSafety(env: EnvWithDeployment, mode: DeploymentMode): DeploymentSafetyResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const bypass = isAuthBypassEnabled(env.SI_BYPASS_DASHBOARD_AUTH);
  const devEmail = (env.SI_DEV_ACCESS_EMAIL ?? "").trim();
  const localhost = originsContainLocalhost(env.SI_DASHBOARD_ORIGINS);

  if (mode === "development") {
    return { ok: true, errors, warnings };
  }

  if (mode === "staging") {
    if (bypass) {
      warnings.push(
        "SI_BYPASS_DASHBOARD_AUTH is enabled in staging — disable when validating Cloudflare Access parity.",
      );
    }
    if (devEmail) warnings.push("SI_DEV_ACCESS_EMAIL is set in staging — clear before customer demos if possible.");
    if (localhost) warnings.push("SI_DASHBOARD_ORIGINS includes localhost — remove for staging that mirrors production CORS.");
    return { ok: true, errors, warnings };
  }

  if (bypass) errors.push("SI_BYPASS_DASHBOARD_AUTH must not be enabled in production.");
  if (devEmail) errors.push("SI_DEV_ACCESS_EMAIL must be unset in production.");
  if (localhost) errors.push("SI_DASHBOARD_ORIGINS must not include localhost, 127.0.0.1, or ::1 in production.");

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Run on every Worker request before routing. Returns a 503 Response when production (or staging) rules fail;
 * logs warnings for staging-only issues.
 */
export function assertProductionSafety(env: EnvWithDeployment): Response | null {
  const mode = parseDeploymentMode(env);
  const result = evaluateDeploymentSafety(env, mode);
  for (const w of result.warnings) {
    console.warn(`[si-deployment:${mode}] ${w}`);
  }
  if (result.ok) return null;
  return jsonPublic({ error: "deployment_misconfigured", mode, errors: result.errors }, { status: 503 });
}
