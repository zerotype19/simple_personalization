import type { ExperienceDecision } from "@si/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { attachDecisionsToRegions, buildCssSelector, discoverSurfaceRegions } from "./discoverSurfaceRegions";
import { buildSurfaceDecisionPreview } from "./surfaceDecisionPreview";
import {
  clearMappingsForPage,
  loadMappingsForPage,
  saveMappingsForPage,
  SURFACE_MAPPINGS_STORAGE_KEY,
} from "./surfaceMappingStore";

/** happy-dom layout rects are often 0×0; stub area from inline `width`/`height` styles in tests only. */
const STUB_DISCOVER_OPTS = {
  layoutStub: {
    visibleArea(el: HTMLElement): number {
      const w = Number.parseFloat(el.style.width) || 0;
      const h = Number.parseFloat(el.style.height) || 0;
      return Math.max(0, w * h);
    },
  },
} as const;

function sizedDiv(width: number, height: number, attrs: Record<string, string> = {}): HTMLDivElement {
  const el = document.createElement("div");
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  document.body.appendChild(el);
  return el;
}

function baseDecision(overrides: Partial<ExperienceDecision> = {}): ExperienceDecision {
  return {
    id: "d1",
    surface_id: "article_inline_mid",
    action: "none",
    message_angle: "x",
    offer_type: "nudge",
    headline: "",
    body: "",
    cta_label: "",
    target_url_hint: "",
    timing: "immediate",
    friction: "low",
    priority: 1,
    confidence: 0.2,
    reason: [],
    evidence: [],
    ttl_seconds: 60,
    expires_at: Date.now() + 60_000,
    privacy_scope: "session_only",
    visitor_status: "anonymous",
    ...overrides,
  };
}

beforeEach(() => {
  sessionStorage.clear();
  document.body.replaceChildren();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("discoverSurfaceRegions", () => {
  it("discovers visible [data-si-surface] with sufficient area", () => {
    sizedDiv(40, 40, { "data-si-surface": "article_inline_mid" });
    const regions = discoverSurfaceRegions(document, [], STUB_DISCOVER_OPTS);
    expect(regions).toHaveLength(1);
    expect(regions[0]!.surface_id).toBe("article_inline_mid");
    expect(regions[0]!.source).toBe("attribute");
    expect(regions[0]!.selector.length).toBeGreaterThan(0);
  });

  it("ignores tiny elements", () => {
    sizedDiv(10, 10, { "data-si-surface": "article_inline_mid" });
    expect(discoverSurfaceRegions(document, [], STUB_DISCOVER_OPTS)).toHaveLength(0);
  });

  it("ignores hidden elements", () => {
    const el = sizedDiv(40, 40, { "data-si-surface": "article_inline_mid" });
    el.style.display = "none";
    expect(discoverSurfaceRegions(document, [], STUB_DISCOVER_OPTS)).toHaveLength(0);
  });

  it("ignores regions inside inspector DOM", () => {
    const root = document.createElement("div");
    root.id = "si-inspector-root";
    const inner = sizedDiv(40, 40, { "data-si-surface": "sticky_footer_cta" });
    root.appendChild(inner);
    document.body.appendChild(root);
    expect(discoverSurfaceRegions(document, [], STUB_DISCOVER_OPTS)).toHaveLength(0);
  });

  it("includes regions from saved inspector mappings when selector resolves", () => {
    const target = sizedDiv(50, 50);
    target.id = "demo-target-surface";
    const regions = discoverSurfaceRegions(
      document,
      [
        {
          surface_id: "soft_popup",
          selector: "#demo-target-surface",
          label: "Popup",
          created_at: 1,
          source: "inspector",
        },
      ],
      STUB_DISCOVER_OPTS,
    );
    expect(regions.some((r) => r.surface_id === "soft_popup" && r.source === "inspector")).toBe(true);
  });
});

describe("buildCssSelector", () => {
  it("returns the same selector for the same element", () => {
    const el = sizedDiv(30, 30);
    expect(buildCssSelector(el)).toBe(buildCssSelector(el));
  });

  it("prefers a stable id selector when id is present and not si- prefixed", () => {
    const el = sizedDiv(30, 30);
    el.id = "page-hero";
    expect(buildCssSelector(el)).toBe("#page-hero");
  });
});

describe("surfaceMappingStore", () => {
  it("roundtrips mappings in sessionStorage keyed by page", () => {
    const pageKey = "example.com|/inventory";
    const mappings = [
      {
        surface_id: "inventory_assist_module",
        selector: "#grid",
        label: "Grid",
        created_at: 1,
        source: "inspector" as const,
      },
    ];
    saveMappingsForPage(mappings, pageKey);
    expect(loadMappingsForPage(pageKey)).toEqual(mappings);
    const raw = sessionStorage.getItem(SURFACE_MAPPINGS_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as { pages: Record<string, unknown> };
    expect(parsed.pages[pageKey]).toEqual(mappings);
    clearMappingsForPage(pageKey);
    expect(loadMappingsForPage(pageKey)).toEqual([]);
  });

  it("does not use localStorage for surface mappings", () => {
    const spy = vi.spyOn(localStorage, "setItem");
    saveMappingsForPage(
      [
        {
          surface_id: "article_inline_end",
          selector: "body > div",
          label: "End",
          created_at: 2,
          source: "inspector",
        },
      ],
      "host|/path",
    );
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("buildSurfaceDecisionPreview", () => {
  it("describes none as no strong decision yet", () => {
    const pr = buildSurfaceDecisionPreview(baseDecision({ action: "none" }));
    expect(pr.headline).toBe("No strong decision yet");
    expect(pr.suppressionLine).toBeNull();
  });

  it("describes suppress with a suppression line", () => {
    const pr = buildSurfaceDecisionPreview(
      baseDecision({
        action: "suppress",
        surface_id: "soft_popup",
        suppression_reason: "  cadence limit  ",
      }),
    );
    expect(pr.headline).toBe("Suppressed");
    expect(pr.suppressionLine).toContain("cadence limit");
  });

  it("describes show with headline and body snippet", () => {
    const pr = buildSurfaceDecisionPreview(
      baseDecision({
        action: "show",
        headline: "Save today",
        body: "Short body text for the shopper.",
      }),
    );
    expect(pr.headline).toBe("Save today");
    expect(pr.offerLine).toContain("Short body text");
  });
});

describe("attachDecisionsToRegions", () => {
  it("attaches current_decision per surface_id", () => {
    sizedDiv(40, 40, { "data-si-surface": "article_inline_end" });
    const raw = discoverSurfaceRegions(document, [], STUB_DISCOVER_OPTS);
    const withDecisions = attachDecisionsToRegions(raw, (sid) =>
      baseDecision({
        surface_id: sid,
        action: sid === "article_inline_end" ? "suppress" : "none",
        suppression_reason: sid === "article_inline_end" ? "holdback" : undefined,
      }),
    );
    const end = withDecisions.find((r) => r.surface_id === "article_inline_end");
    expect(end?.current_decision?.action).toBe("suppress");
    expect(end?.current_decision?.suppression_reason).toBe("holdback");
  });
});
