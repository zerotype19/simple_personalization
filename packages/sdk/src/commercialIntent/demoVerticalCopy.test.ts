import { describe, expect, it } from "vitest";
import { buildExperienceOperatorNarrative } from "../decisioning/experienceInspectorNarrative";
import { inferActivationOpportunity } from "../siteSemantics/conversionArchitecture";
import { buildFixtureProfile } from "../decisioning/fixtures/buildFixtureProfile";
import { classifyCommercialAction } from "./classifyCommercialAction";
import { classifyCtaElement } from "./classifyCtaElement";
import { buyerSafeTimelineLabel } from "./timelineLabels";
import { buyerSafeFormTimelineLabel } from "./formTimelineLabels";

describe("demo auto_retail vertical copy", () => {
  it("schedule_test_drive timeline label stays in-person test drive", () => {
    expect(
      buyerSafeTimelineLabel(
        {
          action_family: "schedule_test_drive",
          matched_phrase: "book test drive",
          confidence: 0.9,
          commercial_stage: "human_escalation",
          intent_strength: "very_high",
          friction_level: "high",
          commitment_level: "human_contact",
          evidence: [],
        },
        "auto_retail",
      ),
    ).toBe("Moved toward an in-person test drive");
  });

  it("form submit appointment label stays in-person visit wording", () => {
    expect(buyerSafeFormTimelineLabel("appointment")).toBe(
      "Moved toward scheduling or an in-person visit",
    );
  });

  it("auto retail remaps generic schedule_demo timeline away from consultation", () => {
    expect(
      buyerSafeTimelineLabel(
        {
          action_family: "schedule_demo",
          matched_phrase: "see demo",
          confidence: 0.8,
          commercial_stage: "human_escalation",
          intent_strength: "very_high",
          friction_level: "high",
          commitment_level: "human_contact",
          evidence: [],
        },
        "auto_retail",
      ),
    ).toBe("Moved toward scheduling or an in-person visit");
  });

  it("test-drive path hints schedule_test_drive before demo", () => {
    expect(
      classifyCommercialAction({
        text: "continue",
        href: "https://demo.optiview.ai/test-drive",
        vertical: "auto_retail",
      }).action_family,
    ).toBe("schedule_test_drive");
  });

  it("data-si-intent schedule_test_drive on CTA uses test-drive timeline", () => {
    document.body.innerHTML = `<button data-si-intent="schedule_test_drive">Submit test-drive request</button>`;
    const el = document.querySelector("button")!;
    const r = classifyCtaElement(el, { vertical: "auto_retail", dataSiIntent: "schedule_test_drive" });
    expect(r?.action.action_family).toBe("schedule_test_drive");
    expect(r?.timeline_label).toMatch(/in-person test drive/i);
  });

  it("operator narrative for auto demo does not say B2B motion", () => {
    const profile = buildFixtureProfile({
      name: "auto-demo-compare",
      vertical: "auto_retail",
      activation_opportunity: {},
    });
    const text = buildExperienceOperatorNarrative(profile, null, "Signals still thin.");
    expect(text).not.toMatch(/B2B motion/i);
    expect(text).not.toMatch(/product marketing/i);
  });

  it("activation opportunity for auto demo uses retail paths", () => {
    const profile = buildFixtureProfile({
      name: "auto-demo-finance",
      vertical: "auto_retail",
      activation_opportunity: {},
    });
    const opp = inferActivationOpportunity({
      profile,
      env: profile.site_environment!,
      scan: profile.site_context.scan,
      semantics: profile.page_semantics!,
    });
    expect(opp.primary_path_label).toMatch(/vehicle|visit|purchase/i);
    expect(opp.offer_type).not.toMatch(/implementation guide|soft demo/i);
  });
});
