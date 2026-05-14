import { describe, expect, it } from "vitest";
import { curateIntelTimelineForInspector, synthesizedActivationRecommendation } from "./inspectorBriefing";
import { minimalProfile } from "./test/fixtures";

describe("inspectorBriefing", () => {
  it("synthesizedActivationRecommendation prefers playbook summary", () => {
    const p = minimalProfile({
      activation_opportunity: {
        ...minimalProfile().activation_opportunity,
        playbook: {
          id: "test_pb",
          label: "Test playbook",
          why: ["a"],
          recommended_activation_summary: "Offer a planning checklist via inline CTA.",
        },
        opportunity_note: "Activation opportunity: something else",
      },
    });
    expect(synthesizedActivationRecommendation(p)).toBe("Offer a planning checklist via inline CTA.");
  });

  it("curateIntelTimelineForInspector collapses consecutive scroll milestones", () => {
    const t0 = 1000;
    const p = minimalProfile({
      started_at: t0,
      intel_timeline: [
        { t: t0 + 1000, message: "Sustained deep reading on this page" },
        { t: t0 + 2000, message: "Sustained deep reading on this page" },
        { t: t0 + 3000, message: "Viewed /pricing" },
      ],
    });
    const rows = curateIntelTimelineForInspector(p);
    expect(rows).toHaveLength(2);
    expect(rows[0].displayMessage).toBe("Sustained deep reading");
    expect(rows[0].t).toBe(t0 + 2000);
    expect(rows[1].message).toBe("Viewed /pricing");
  });

  it("curates long streaks of page views into one milestone", () => {
    const t0 = 5000;
    const p = minimalProfile({
      started_at: t0,
      intel_timeline: [
        { t: t0 + 100, message: "Viewed Chapter A — /a" },
        { t: t0 + 200, message: "Viewed Chapter B — /b" },
        { t: t0 + 300, message: "Viewed Chapter C — /c" },
      ],
    });
    const rows = curateIntelTimelineForInspector(p);
    expect(rows).toHaveLength(1);
    expect(rows[0].displayMessage).toBe("Explored 3 in-session pages");
  });
});
