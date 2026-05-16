import { describe, expect, it } from "vitest";
import { isBuyerUnsafeString } from "../../decisioning/buyerCopySafety";
import { minimalProfile } from "../../test/fixtures";
import { classifyCommercialAction } from "../classifyCommercialAction";
import { classifyCtaElement } from "../classifyCtaElement";
import { classifyFormIntent } from "../classifyFormIntent";
import { buildCommercialIntentJourney } from "../testUtils/buildCommercialIntentJourney";
import { timelineHumanPageLabel } from "../../siteEnvironment/genericPageClassifier";

function blockerIds(result: ReturnType<typeof buildCommercialIntentJourney>): string[] {
  return result.memory.blockers.map((b) => b.id);
}

function stagesInclude(
  result: ReturnType<typeof buildCommercialIntentJourney>,
  ...stages: string[]
): boolean {
  return stages.every((s) => result.memory.stage_sequence.includes(s as never));
}

function buyerBlob(result: ReturnType<typeof buildCommercialIntentJourney>): string {
  return result.buyerRead.join(" ");
}

describe("commercial intent journey replay", () => {
  it("auto retail: compare → finance → test drive deepens with financing blocker before escalation", () => {
    const mid = buildCommercialIntentJourney("auto_retail", [
      { text: "Compare vehicles", path: "/compare" },
      { text: "See payments for picks", path: "/finance", dataSiCta: "finance" },
    ]);
    expect(blockerIds(mid)).toContain("financing_or_payment_uncertainty");

    const end = buildCommercialIntentJourney("auto_retail", [
      { text: "Compare vehicles", path: "/compare" },
      { text: "Estimate payment", path: "/finance", dataSiCta: "finance" },
      { text: "Book a test drive", path: "/test-drive", dataSiIntent: "schedule_test_drive" },
    ]);

    expect(stagesInclude(end, "comparison", "qualification", "human_escalation")).toBe(true);
    expect(end.memory.strongest_action_family).toBe("schedule_test_drive");
    expect(["increasing", "hesitating"]).toContain(end.memory.momentum.direction);
    expect(end.memory.human_escalation_interactions).toBeGreaterThan(0);
    expect(buyerBlob(end)).toMatch(/human contact|in-person/i);
    expect(isBuyerUnsafeString(buyerBlob(end))).toBe(false);
    expect(buyerBlob(end)).not.toMatch(/schedule_test_drive|very_high|friction/i);
  });

  it("B2B: integrations → security → pricing → demo", () => {
    const end = buildCommercialIntentJourney("b2b_saas", [
      { text: "View integrations", path: "/integrations" },
      { text: "Security and compliance", path: "/security" },
      { text: "See pricing", path: "/pricing" },
      { text: "Schedule a demo", path: "/demo" },
    ]);

    const ids = blockerIds(end);
    expect(ids.some((id) => id === "integration_concern" || id === "trust_security_concern")).toBe(true);
    expect(stagesInclude(end, "comparison", "human_escalation")).toBe(true);
    expect(end.memory.strongest_action_family).toBe("schedule_demo");
    expect(buyerBlob(end)).toMatch(/implementation|trust|human contact/i);
    expect(isBuyerUnsafeString(buyerBlob(end))).toBe(false);
  });

  it("ecommerce: compare → reviews → shipping → add to cart", () => {
    const end = buildCommercialIntentJourney("ecommerce", [
      { text: "Compare products", path: "/compare" },
      { text: "Read reviews", path: "/reviews" },
      { text: "Shipping and returns", path: "/shipping-returns" },
      { text: "Add to cart", path: "/cart" },
    ]);

    const ids = blockerIds(end);
    expect(
      ids.some((id) => id === "shipping_returns_uncertainty" || id === "trust_security_concern"),
    ).toBe(true);
    expect(["validating", "increasing"]).toContain(end.memory.momentum.direction);
    expect(end.memory.strongest_action_family).toBe("add_to_cart");
    expect(buyerBlob(end)).not.toMatch(/coupon|discount|%\s*off/i);
    expect(isBuyerUnsafeString(buyerBlob(end))).toBe(false);
  });

  it("healthcare: education → eligibility → request info stays restrained", () => {
    const end = buildCommercialIntentJourney("healthcare", [
      { text: "Read article", path: "/blog/coverage-basics" },
      { text: "Check eligibility", path: "/eligibility" },
      { text: "Talk to an advisor", path: "/contact" },
    ]);

    expect(blockerIds(end)).toContain("coverage_or_eligibility_uncertainty");
    expect(["check_eligibility", "talk_to_sales", "request_quote"]).toContain(
      end.memory.strongest_action_family ?? "",
    );
    const blob = buyerBlob(end);
    expect(blob).not.toMatch(/diagnos|fear|urgent|emergency|guaranteed coverage/i);
    expect(isBuyerUnsafeString(blob)).toBe(false);
  });

  it("finance: rates → calculator → apply without distress language", () => {
    const end = buildCommercialIntentJourney("financial_services", [
      { text: "View rates and fees", path: "/rates" },
      { text: "Payment calculator", path: "/calculator" },
      { text: "Apply now", path: "/apply" },
    ]);

    const ids = blockerIds(end);
    expect(ids.some((id) => id === "pricing_uncertainty" || id === "application_friction")).toBe(true);
    expect(["increasing", "validating", "hesitating"]).toContain(end.memory.momentum.direction);
    expect(stagesInclude(end, "qualification", "commitment")).toBe(true);
    const blob = buyerBlob(end);
    expect(blob).not.toMatch(/approved|distress|urgent|guaranteed|denied/i);
    expect(isBuyerUnsafeString(blob)).toBe(false);
  });
});

describe("commercial intent journey negatives", () => {
  it("watch demo video does not classify as schedule_demo", () => {
    const r = classifyCommercialAction({ text: "Watch demo video" });
    expect(r.action_family).not.toBe("schedule_demo");
  });

  it("footer learn more is down-weighted", () => {
    document.body.innerHTML = `<footer><a href="/x">Learn more</a></footer>`;
    const r = classifyCtaElement(document.querySelector("footer a")!)!;
    expect(r.should_count_as_cta_click).toBe(false);
  });

  it("data-si-cta=primary uses visible label, not the token primary", () => {
    document.body.innerHTML = `<button data-si-cta="primary">Book test drive</button>`;
    const r = classifyCtaElement(document.querySelector("button")!)!;
    expect(r.action.action_family).toBe("schedule_test_drive");
  });

  it("multilingual schedule demo phrases classify", () => {
    expect(classifyCommercialAction({ text: "solicitar demo" }).action_family).toBe("schedule_demo");
    expect(classifyCommercialAction({ text: "demander une démo" }).action_family).toBe("schedule_demo");
    expect(classifyCommercialAction({ text: "demo anfordern" }).action_family).toBe("schedule_demo");
  });

  it("form classifier inspects field names only, not input values", () => {
    document.body.innerHTML = `<form>
      <input name="email" value="secret@corp.example" />
      <input name="ssn" value="999-99-9999" />
      <button type="submit">Apply now</button>
    </form>`;
    const form = document.querySelector("form")! as HTMLFormElement;
    const r = classifyFormIntent(form);
    const evidence = JSON.stringify(r);
    expect(evidence).not.toContain("secret@corp");
    expect(evidence).not.toContain("999-99-9999");
    expect(r.form_type).toBe("application");
  });

  it("buyer read omits raw unsafe CTA labels", () => {
    const end = buildCommercialIntentJourney("auto_retail", [
      { text: "schedule_test_drive cta_clicks progression_gate", path: "/test-drive" },
    ]);
    expect(end.buyerRead.length).toBeGreaterThan(0);
    expect(buyerBlob(end)).not.toMatch(/schedule_test_drive|progression_gate|cta_clicks/i);
  });

  it("demo compare/finance paths get retailer-shaped timeline labels", () => {
    expect(timelineHumanPageLabel("unknown", "/compare")).toBe("Compare or shortlist page");
    expect(timelineHumanPageLabel("unknown", "/finance")).toBe("Financing or payment page");
    expect(timelineHumanPageLabel("unknown", "/test-drive")).toBe("Test drive or appointment page");
  });
});

describe("buildCommercialIntentJourney profile baseline", () => {
  it("starts from minimal profile with vertical context", () => {
    const p = minimalProfile();
    expect(p.commercial_intent).toBeUndefined();
    const end = buildCommercialIntentJourney("ecommerce", [{ text: "Add to cart", path: "/cart" }]);
    expect(end.profile.commercial_intent).toBeDefined();
    expect(end.profile.site_context.vertical).toBe("ecommerce");
  });
});
