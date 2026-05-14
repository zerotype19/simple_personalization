import { describe, expect, it } from "vitest";
import { buildActivationPayload } from "./activationPayload";
import { buildBehaviorSnapshot } from "./behaviorSnapshot";
import { minimalProfile } from "../test/fixtures";

describe("buildActivationPayload behavior.timeline_preview", () => {
  it("includes at most 5 clock-prefixed lines and activation_debug context", () => {
    const started = Date.now() - 120_000;
    const p = minimalProfile({
      started_at: started,
      intel_timeline: [
        { t: started + 1000, message: "A" },
        { t: started + 2000, message: "B" },
        { t: started + 3000, message: "C" },
        { t: started + 4000, message: "D" },
        { t: started + 5000, message: "E" },
        { t: started + 6000, message: "F" },
        { t: started + 7000, message: "G" },
      ],
    });
    buildBehaviorSnapshot(p);
    const payload = buildActivationPayload(p);
    const behavior = payload.si.behavior as Record<string, unknown>;
    expect(behavior.context).toBe("activation_debug_preview");
    const preview = behavior.timeline_preview as string[];
    expect(preview.length).toBe(5);
    expect(preview[0]).toMatch(/^\d{2}:\d{2} C$/);
    expect(preview[4]).toMatch(/^\d{2}:\d{2} G$/);
  });

  it("collapses http URLs in timeline lines to path-only", () => {
    const started = Date.now() - 5000;
    const p = minimalProfile({
      started_at: started,
      intel_timeline: [{ t: started + 1000, message: "Visit https://evil.example/foo?x=1 done" }],
    });
    buildBehaviorSnapshot(p);
    const payload = buildActivationPayload(p);
    const behavior = payload.si.behavior as Record<string, unknown>;
    const preview = behavior.timeline_preview as string[];
    expect(preview[0]).toContain("/foo?x=1");
    expect(preview[0]).not.toContain("https://");
  });
});
