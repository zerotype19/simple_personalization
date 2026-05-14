import { describe, expect, it, vi } from "vitest";
import {
  assertSiteAllowedForUser,
  dashboardCorsHeaders,
  normalizeOriginHost,
  parseDashboardOrigins,
  resolveCollectSite,
  stripWww,
} from "../access";

describe("parseDashboardOrigins", () => {
  it("splits and trims", () => {
    expect(parseDashboardOrigins(" https://a.com/ , http://localhost:5174 ")).toEqual([
      "https://a.com",
      "http://localhost:5174",
    ]);
  });
});

describe("normalizeOriginHost", () => {
  it("strips protocol and www", () => {
    expect(normalizeOriginHost("https://www.example.com/path")).toBe("example.com");
  });
  it("returns empty on garbage", () => {
    expect(normalizeOriginHost("not-a-url")).toBe("");
  });
});

describe("stripWww", () => {
  it("removes leading www.", () => {
    expect(stripWww("WWW.EXAMPLE.COM")).toBe("example.com");
  });
});

describe("resolveCollectSite", () => {
  it("returns error for unknown snippet_key", async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
      }),
    } as unknown as D1Database;
    const r = await resolveCollectSite(db, { snippet_key: "bad" }, "https://x.com");
    expect(r).toEqual({ error: "unknown_snippet_key" });
  });

  it("resolves by snippet_key", async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ id: "s1", tenant_id: "t1" }),
      }),
    } as unknown as D1Database;
    const r = await resolveCollectSite(db, { snippet_key: "sk_demo_velocity" }, "https://x.com");
    expect(r).toEqual({ tenant_id: "t1", site_id: "s1" });
  });

  it("rejects site_id that does not match snippet_key row", async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ id: "s1", tenant_id: "t1" }),
      }),
    } as unknown as D1Database;
    const r = await resolveCollectSite(
      db,
      { snippet_key: "sk_good", site_id: "wrong-site" },
      "https://x.com",
    );
    expect(r).toEqual({ error: "site_id_snippet_mismatch" });
  });

  it("allows site_id when it matches the snippet_key row", async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ id: "s1", tenant_id: "t1" }),
      }),
    } as unknown as D1Database;
    const r = await resolveCollectSite(db, { snippet_key: "sk_good", site_id: "s1" }, "https://x.com");
    expect(r).toEqual({ tenant_id: "t1", site_id: "s1" });
  });
});

describe("dashboardCorsHeaders", () => {
  const env = {
    SI_DB: {} as D1Database,
    SI_DASHBOARD_ORIGINS: "https://dashboard.optiview.ai,http://localhost:5174",
  };

  it("returns null when Origin is not allowlisted", () => {
    const req = {
      headers: {
        get: (name: string) => (name.toLowerCase() === "origin" ? "https://evil.example" : null),
      },
    } as unknown as Request;
    expect(dashboardCorsHeaders(req, env)).toBeNull();
  });

  it("returns credentialed CORS when Origin matches", () => {
    const req = {
      headers: {
        get: (name: string) => (name.toLowerCase() === "origin" ? "http://localhost:5174" : null),
      },
    } as unknown as Request;
    const h = dashboardCorsHeaders(req, env) as Record<string, string> | null;
    expect(h).toBeTruthy();
    expect(h!["access-control-allow-credentials"]).toBe("true");
    expect(h!["access-control-allow-origin"]).toBe("http://localhost:5174");
  });
});

describe("assertSiteAllowedForUser", () => {
  it("denies cross-tenant site for viewer", async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
      }),
    } as unknown as D1Database;
    const ok = await assertSiteAllowedForUser(db, { tenant_id: "t1", role: "customer_viewer" }, "other-site");
    expect(ok).toBe(false);
  });

  it("allows platform_admin when site exists", async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ ok: 1 }),
      }),
    } as unknown as D1Database;
    const ok = await assertSiteAllowedForUser(db, { tenant_id: "t1", role: "platform_admin" }, "any");
    expect(ok).toBe(true);
  });
});
