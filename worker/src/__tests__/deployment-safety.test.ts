import { describe, expect, it } from "vitest";
import {
  assertProductionSafety,
  evaluateDeploymentSafety,
  isAuthBypassEnabled,
  originsContainLocalhost,
  parseDeploymentMode,
} from "../deploymentSafety";

describe("isAuthBypassEnabled", () => {
  it("treats common truthy tokens as enabled", () => {
    expect(isAuthBypassEnabled("1")).toBe(true);
    expect(isAuthBypassEnabled("true")).toBe(true);
    expect(isAuthBypassEnabled("YES")).toBe(true);
    expect(isAuthBypassEnabled("0")).toBe(false);
    expect(isAuthBypassEnabled(undefined)).toBe(false);
  });
});

describe("parseDeploymentMode", () => {
  it("reads SI_DEPLOYMENT_MODE", () => {
    expect(parseDeploymentMode({ SI_DEPLOYMENT_MODE: "production" })).toBe("production");
    expect(parseDeploymentMode({ SI_DEPLOYMENT_MODE: "staging" })).toBe("staging");
    expect(parseDeploymentMode({ SI_DEPLOYMENT_MODE: "dev" })).toBe("development");
  });

  it("falls back to SI_ENV when mode unset", () => {
    expect(parseDeploymentMode({ SI_ENV: "prod" })).toBe("production");
    expect(parseDeploymentMode({ SI_ENV: "dev" })).toBe("development");
  });
});

describe("originsContainLocalhost", () => {
  it("detects localhost and loopback", () => {
    expect(originsContainLocalhost("https://dashboard.optiview.ai,http://localhost:5174")).toBe(true);
    expect(originsContainLocalhost("http://127.0.0.1:5174")).toBe(true);
    expect(originsContainLocalhost("https://dashboard.optiview.ai")).toBe(false);
  });
});

describe("evaluateDeploymentSafety", () => {
  it("allows development with insecure flags", () => {
    const r = evaluateDeploymentSafety(
      { SI_BYPASS_DASHBOARD_AUTH: "1", SI_DEV_ACCESS_EMAIL: "x@y.com", SI_DASHBOARD_ORIGINS: "http://localhost:5174" },
      "development",
    );
    expect(r.ok).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("rejects production with bypass", () => {
    const r = evaluateDeploymentSafety({ SI_BYPASS_DASHBOARD_AUTH: "1", SI_DASHBOARD_ORIGINS: "https://d.com" }, "production");
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("BYPASS"))).toBe(true);
  });

  it("rejects production with dev access email", () => {
    const r = evaluateDeploymentSafety(
      { SI_BYPASS_DASHBOARD_AUTH: "0", SI_DEV_ACCESS_EMAIL: "viewer@local", SI_DASHBOARD_ORIGINS: "https://d.com" },
      "production",
    );
    expect(r.ok).toBe(false);
  });

  it("rejects production with localhost in dashboard origins", () => {
    const r = evaluateDeploymentSafety(
      { SI_BYPASS_DASHBOARD_AUTH: "0", SI_DASHBOARD_ORIGINS: "https://dashboard.optiview.ai,http://localhost:5174" },
      "production",
    );
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("localhost"))).toBe(true);
  });

  it("allows production when clean", () => {
    const r = evaluateDeploymentSafety(
      { SI_BYPASS_DASHBOARD_AUTH: "0", SI_DASHBOARD_ORIGINS: "https://dashboard.optiview.ai" },
      "production",
    );
    expect(r.ok).toBe(true);
  });

  it("staging stays up with bypass but records warnings", () => {
    const r = evaluateDeploymentSafety(
      { SI_BYPASS_DASHBOARD_AUTH: "1", SI_DEV_ACCESS_EMAIL: "a@b.co", SI_DASHBOARD_ORIGINS: "http://localhost:5174" },
      "staging",
    );
    expect(r.ok).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe("assertProductionSafety", () => {
  it("returns 503 Response when production is misconfigured", () => {
    const res = assertProductionSafety({
      SI_DEPLOYMENT_MODE: "production",
      SI_BYPASS_DASHBOARD_AUTH: "1",
      SI_DASHBOARD_ORIGINS: "https://dashboard.optiview.ai",
    });
    expect(res).toBeInstanceOf(Response);
    expect(res!.status).toBe(503);
  });

  it("returns null when production is valid", () => {
    const res = assertProductionSafety({
      SI_DEPLOYMENT_MODE: "production",
      SI_BYPASS_DASHBOARD_AUTH: "0",
      SI_DASHBOARD_ORIGINS: "https://dashboard.optiview.ai",
    });
    expect(res).toBeNull();
  });
});
