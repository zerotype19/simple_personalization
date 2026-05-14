import { describe, expect, it } from "vitest";
import { buildAnonymousVisitorRead } from "./anonymousVisitorRead";
import { minimalProfile } from "./test/fixtures";
import { buildBehaviorSnapshot } from "./siteSemantics/behaviorSnapshot";

describe("buildAnonymousVisitorRead", () => {
  it("returns paragraphs and a recommended activation line", () => {
    const p = minimalProfile({
      journey_stage: "browsing",
      activation_opportunity: {
        ...minimalProfile().activation_opportunity,
        visitor_read: "Visitor is exploring.",
        inferred_need: "Understand implementation",
        message_angle: "Operational clarity",
        offer_type: "Guide",
        surface: "inline_module",
        timing: "after_scroll",
        playbook: null,
        evidence: [],
        reason: [],
      },
    });
    buildBehaviorSnapshot(p);
    const r = buildAnonymousVisitorRead(p);
    expect(r.paragraphs.length).toBe(3);
    expect(r.paragraphs[0].length).toBeGreaterThan(40);
    expect(r.recommended_activation.length).toBeGreaterThan(10);
  });
});
