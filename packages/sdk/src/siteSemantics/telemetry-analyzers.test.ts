import { describe, expect, it } from "vitest";
import { createBlankSignals } from "../session";
import { analyzeCampaignIntent } from "./campaignIntentAnalyzer";
import { analyzeNavigationPattern } from "./navigationPatternAnalyzer";
import { analyzeTrafficAcquisition } from "./trafficSourceAnalyzer";

describe("analyzeTrafficAcquisition", () => {
  it("classifies Google Ads-style click ids as paid search", () => {
    const r = analyzeTrafficAcquisition("https://shop.example/inventory?utm_medium=cpc&gclid=abc", null);
    expect(r.has_click_id).toBe(true);
    expect(r.channel_guess).toBe("paid_search");
  });

  it("classifies utm_source=google + utm_medium=organic as organic search", () => {
    const r = analyzeTrafficAcquisition(
      "https://shop.example/?utm_source=google&utm_medium=organic",
      "https://www.google.com/",
    );
    expect(r.channel_guess).toBe("organic_search");
  });

  it("classifies social network source as organic social", () => {
    const r = analyzeTrafficAcquisition("https://shop.example/p?utm_source=facebook&utm_medium=social", null);
    expect(r.channel_guess).toBe("organic_social");
  });

  it("uses referral when only document referrer is present", () => {
    const r = analyzeTrafficAcquisition("https://shop.example/", "https://news.example/article");
    expect(r.channel_guess).toBe("referral");
  });
});

describe("analyzeCampaignIntent", () => {
  it("extracts keyword themes and comparison intent from utm_term", () => {
    const r = analyzeCampaignIntent("best+hybrid+suv", "spring_push", "creative_compare");
    expect(r.keyword_themes).toContain("hybrid");
    expect(r.keyword_themes).toContain("suv");
    expect(r.commercial_clues).toContain("comparison_or_evaluation");
    expect(r.campaign_angle).toBe("Comparison / evaluation");
  });

  it("detects financing / offer sensitivity in campaign names", () => {
    const r = analyzeCampaignIntent(null, "summer-financing-event", null);
    expect(r.commercial_clues).toContain("offer_or_financing_sensitivity");
    expect(r.campaign_angle).toBe("Offer / financing");
  });
});

describe("analyzeNavigationPattern", () => {
  it("flags high-intent transition from content to pricing", () => {
    const t0 = 1_700_000_000_000;
    const r = analyzeNavigationPattern(
      [
        { path: "/blog/planning", generic_kind: "article_page", title_snippet: null, t: t0 },
        { path: "/pricing", generic_kind: "pricing_page", title_snippet: null, t: t0 + 20_000 },
      ],
      { ...createBlankSignals(), pages_viewed: 2 },
    );
    expect(r.high_intent_transition).toBe(true);
    expect(r.journey_pattern).toBe("evaluation_or_conversion_surface");
  });

  it("returns empty path summary when no steps", () => {
    const r = analyzeNavigationPattern(undefined, { ...createBlankSignals(), pages_viewed: 0 });
    expect(r.path_summary).toBe("—");
    expect(r.journey_velocity).toBe("deliberate");
  });
});
