import { describe, expect, it } from "vitest";
import { isBuyerUnsafeString } from "../decisioning/buyerCopySafety";
import { minimalProfile } from "../test/fixtures";
import { classifyCommercialAction } from "./classifyCommercialAction";
import { classifyCtaElement } from "./classifyCtaElement";
import { classifyFormIntent } from "./classifyFormIntent";
import { classifyPageRole } from "./classifyPageRole";
import { buildBuyerCommercialIntentRead } from "./buyerCommercialIntentRead";
import { updateCommercialIntentMemory } from "./updateCommercialIntentMemory";

describe("commercial intent classification", () => {
  it("classifies schedule test drive as high-intent human escalation", () => {
    const r = classifyCommercialAction({ text: "Schedule a test drive" });
    expect(r.action_family).toBe("schedule_test_drive");
    expect(r.intent_strength).toBe("very_high");
    expect(r.friction_level).toBe("high");
  });

  it("does not treat demo video as schedule_demo", () => {
    const r = classifyCommercialAction({ text: "Watch demo video" });
    expect(r.action_family).not.toBe("schedule_demo");
  });

  it("matches multilingual demo phrases", () => {
    const r = classifyCommercialAction({ text: "demo anfordern" });
    expect(r.action_family).toBe("schedule_demo");
  });

  it("classifies learn more as low exploration", () => {
    const r = classifyCommercialAction({ text: "Learn more" });
    expect(r.action_family).toBe("learn_more");
    expect(r.intent_strength).toBe("low");
  });

  it("buyer commercial read avoids engineering jargon", () => {
    const p = minimalProfile();
    p.commercial_intent = updateCommercialIntentMemory(p, {
      action: classifyCommercialAction({ text: "Schedule test drive" }),
      element_role: "hero",
      is_primary_visual_cta: true,
      is_repeated_chrome_cta: false,
      should_count_as_cta_click: true,
      should_count_as_high_intent: true,
      timeline_label: "Moved toward an in-person test drive",
    });
    const lines = buildBuyerCommercialIntentRead(p);
    const blob = lines.join(" ");
    expect(isBuyerUnsafeString(blob)).toBe(false);
    expect(blob).not.toMatch(/schedule_test_drive|very_high|friction_level/i);
  });
});

describe("classifyCtaElement", () => {
  it("down-weights footer learn more", () => {
    document.body.innerHTML = `<footer><a href="/x">Learn more</a></footer>`;
    const a = document.querySelector("footer a")!;
    const r = classifyCtaElement(a)!;
    expect(r.should_count_as_cta_click).toBe(false);
  });

  it("flags hero schedule demo as high intent", () => {
    document.body.innerHTML = `<section class="hero"><button>Book a demo</button></section>`;
    const b = document.querySelector("button")!;
    const r = classifyCtaElement(b)!;
    expect(r.action.action_family).toBe("schedule_demo");
    expect(r.should_count_as_high_intent).toBe(true);
  });
});

describe("classifyFormIntent", () => {
  it("detects newsletter without capturing values", () => {
    document.body.innerHTML = `<form><input type="email" name="email" placeholder="Email"/><button>Subscribe</button></form>`;
    const f = document.querySelector("form")! as HTMLFormElement;
    const r = classifyFormIntent(f);
    expect(r.form_type).toBe("newsletter");
  });

  it("detects lead forms", () => {
    document.body.innerHTML = `<form><input name="company"/><input name="message"/><button>Contact sales</button></form>`;
    const r = classifyFormIntent(document.querySelector("form")! as HTMLFormElement);
    expect(r.form_type).toBe("lead");
  });
});

describe("classifyPageRole", () => {
  it("reads pricing paths as comparison", () => {
    const p = minimalProfile();
    p.signals.path_sequence = ["/", "/pricing"];
    const r = classifyPageRole(p, "/pricing");
    expect(r.page_role).toBe("comparison");
  });
});
