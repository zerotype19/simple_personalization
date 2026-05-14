import { describe, expect, it } from "vitest";
import type { GenericPageKind, NavigationPatternRead, SessionSignals } from "@si/shared";
import { createBlankSignals } from "../session";
import { analyzeReferrer } from "./referrerAnalyzer";
import { analyzeNavigationPattern } from "./navigationPatternAnalyzer";
import { extractQueryThemes } from "./queryThemeExtractor";
import { inferTrafficAcquisition } from "./trafficSourceAnalyzer";

function baseSignals(over: Partial<SessionSignals> = {}): SessionSignals {
  return {
    ...createBlankSignals(),
    landing_href: "https://shop.example/",
    initial_referrer: null,
    ...over,
  } as SessionSignals;
}

function runInfer(opts: {
  href: string;
  ref: string | null;
  siteHost?: string;
  signals?: Partial<SessionSignals>;
  firstKind?: GenericPageKind | null;
  currentKind?: GenericPageKind;
  nav?: NavigationPatternRead;
}) {
  const signals = baseSignals({
    landing_href: opts.href,
    initial_referrer: opts.ref,
    ...opts.signals,
  });
  const nav = opts.nav ?? analyzeNavigationPattern(undefined, signals);
  return inferTrafficAcquisition({
    href: opts.href,
    documentReferrer: opts.ref,
    siteHostname: opts.siteHost ?? "shop.example",
    referrerRead: analyzeReferrer(opts.ref, opts.siteHost ?? "shop.example"),
    navigation: nav,
    signals,
    firstJourneyEntry: opts.firstKind ? { generic_kind: opts.firstKind, path: "/x" } : null,
    currentGenericKind: opts.currentKind ?? opts.firstKind ?? "homepage",
  });
}

describe("inferTrafficAcquisition", () => {
  it("infers LLM referral from ChatGPT referrer", () => {
    const r = runInfer({
      href: "https://shop.example/pricing",
      ref: "https://chatgpt.com/",
    });
    expect(r.channel_guess).toBe("llm_referral");
    expect(r.arrival_confidence_0_100).toBeGreaterThanOrEqual(85);
    expect(r.acquisition_evidence.join(" ")).toMatch(/LLM|answer-engine/i);
  });

  it("infers review-site / video-led discovery from YouTube referrer", () => {
    const r = runInfer({
      href: "https://shop.example/watch",
      ref: "https://www.youtube.com/watch?v=abc",
    });
    expect(r.channel_guess).toBe("review_site");
  });

  it("infers community referral from Reddit host", () => {
    const r = runInfer({
      href: "https://shop.example/",
      ref: "https://www.reddit.com/r/something",
    });
    expect(r.channel_guess).toBe("community_referral");
  });

  it("infers organic social from LinkedIn referrer", () => {
    const r = runInfer({
      href: "https://shop.example/blog",
      ref: "https://www.linkedin.com/feed",
    });
    expect(r.channel_guess).toBe("organic_social");
  });

  it("boosts organic search when Google referrer pairs with research-shaped journey", () => {
    const t0 = 1_700_000_000_000;
    const nav = analyzeNavigationPattern(
      [
        { path: "/blog/a", generic_kind: "article_page", title_snippet: null, t: t0 },
        { path: "/blog/b", generic_kind: "article_page", title_snippet: null, t: t0 + 30_000 },
      ],
      { ...createBlankSignals(), pages_viewed: 2, max_scroll_depth: 60, session_duration_ms: 40_000 },
    );
    const r = runInfer({
      href: "https://shop.example/blog/a",
      ref: "https://www.google.com/url?q=https://shop.example/blog/a",
      signals: { pages_viewed: 2, max_scroll_depth: 60, session_duration_ms: 40_000 },
      firstKind: "article_page",
      currentKind: "article_page",
      nav,
    });
    expect(r.channel_guess).toBe("organic_search");
    expect(r.arrival_confidence_0_100).toBeGreaterThanOrEqual(78);
  });

  it("infers probable organic search when referrer stripped but landing pattern is research-heavy", () => {
    const nav = analyzeNavigationPattern(
      [
        { path: "/insights/qbr", generic_kind: "article_page", title_snippet: null, t: 1 },
        { path: "/pricing", generic_kind: "pricing_page", title_snippet: null, t: 2 },
      ],
      { ...createBlankSignals(), pages_viewed: 2, max_scroll_depth: 70, session_duration_ms: 25_000 },
    );
    const r = runInfer({
      href: "https://shop.example/insights/qbr",
      ref: null,
      signals: { pages_viewed: 2, max_scroll_depth: 70, session_duration_ms: 25_000 },
      firstKind: "article_page",
      currentKind: "article_page",
      nav,
    });
    expect(r.channel_guess).toBe("organic_search");
    expect(r.acquisition_evidence.some((e) => /stripped|missing/i.test(e))).toBe(true);
  });
});

describe("extractQueryThemes", () => {
  it("maps search tokens to privacy-safe buckets without retaining raw query", () => {
    const themes = extractQueryThemes("https://shop.example/search?q=quarterly+marketing+planning+framework");
    expect(themes).toContain("planning");
    expect(themes).toContain("framework");
    expect(themes.join(" ")).not.toMatch(/quarterly/i);
  });
});
