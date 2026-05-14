import { describe, expect, it } from "vitest";
import { createBlankSignals } from "../session";
import { minimalProfile } from "../test/fixtures";
import { emptySiteEnvironmentSnapshot } from "../siteEnvironment/emptySnapshot";
import { buildBehaviorSnapshot } from "./behaviorSnapshot";

describe("buildBehaviorSnapshot commercial phase", () => {
  it("keeps content-depth editorial sessions in evaluation when there is no CTA commit", () => {
    const p = minimalProfile({
      journey_stage: "conversion",
      signals: {
        ...createBlankSignals(),
        cta_clicks: 0,
      },
      page_journey: [
        { path: "/intro", generic_kind: "article_page", title_snippet: null, t: 1 },
        { path: "/deep-dive", generic_kind: "article_page", title_snippet: null, t: 2 },
      ],
      site_environment: {
        ...emptySiteEnvironmentSnapshot(),
        page: { ...emptySiteEnvironmentSnapshot().page, generic_kind: "article_page" },
      },
    });
    buildBehaviorSnapshot(p);
    expect(p.behavior_snapshot?.navigation.journey_pattern).toBe("content_depth_led");
    expect(p.commercial_journey_phase).toBe("evaluation");
  });
});
