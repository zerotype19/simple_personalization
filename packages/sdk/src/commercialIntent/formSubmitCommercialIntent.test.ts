import { describe, expect, it } from "vitest";
import { isBuyerUnsafeString } from "../decisioning/buyerCopySafety";
import { minimalProfile } from "../test/fixtures";
import { buildBuyerCommercialIntentRead } from "./buyerCommercialIntentRead";
import { classifyFormIntent } from "./classifyFormIntent";
import { formIntentToCommercialAction } from "./formIntentCommercialAction";
import { buyerSafeFormTimelineLabel } from "./formTimelineLabels";
import { updateCommercialIntentFromForm } from "./updateCommercialIntentFromForm";

describe("form submit commercial intent", () => {
  it("classifies lead forms from structure only", () => {
    document.body.innerHTML = `<form action="/contact" method="post">
      <input name="company" placeholder="Company"/>
      <input name="phone" type="tel"/>
      <textarea name="message"></textarea>
      <button type="submit">Contact sales</button>
    </form>`;
    const r = classifyFormIntent(document.querySelector("form")! as HTMLFormElement);
    expect(r.form_type).toBe("lead");
    expect(JSON.stringify(r.evidence)).not.toMatch(/secret@|555-1234/);
  });

  it("classifies appointment / test-drive forms", () => {
    document.body.innerHTML = `<form>
      <label>Notes (optional)</label>
      <textarea name="notes" placeholder="evenings only"></textarea>
      <button type="submit">Book test drive</button>
    </form>`;
    const r = classifyFormIntent(document.querySelector("form")! as HTMLFormElement);
    expect(r.form_type).toBe("appointment");
    expect(buyerSafeFormTimelineLabel("appointment")).toBe(
      "Moved toward scheduling or an in-person visit",
    );
  });

  it("classifies hyphenated test-drive submit labels", () => {
    document.body.innerHTML = `<form>
      <label>Notes (optional — not stored)</label>
      <textarea name="notes" placeholder="Optional"></textarea>
      <button type="submit">Submit test-drive request</button>
    </form>`;
    const r = classifyFormIntent(document.querySelector("form")! as HTMLFormElement);
    expect(r.form_type).toBe("appointment");
  });

  it("classifies finance application forms", () => {
    document.body.innerHTML = `<form action="/apply">
      <input name="annual_income" autocomplete="off"/>
      <input name="ssn" type="text"/>
      <button>Continue application</button>
    </form>`;
    const r = classifyFormIntent(document.querySelector("form")! as HTMLFormElement);
    expect(r.form_type).toBe("application");
  });

  it("classifies healthcare eligibility forms", () => {
    document.body.innerHTML = `<form>
      <input name="zip" placeholder="ZIP code"/>
      <input name="coverage" placeholder="Plan type"/>
      <button>Check eligibility</button>
    </form>`;
    const r = classifyFormIntent(document.querySelector("form")! as HTMLFormElement);
    expect(r.form_type).toBe("eligibility");
  });

  it("classifies checkout forms", () => {
    document.body.innerHTML = `<form>
      <input name="card_number" autocomplete="cc-number"/>
      <input name="billing_zip"/>
      <button>Complete checkout</button>
    </form>`;
    const r = classifyFormIntent(document.querySelector("form")! as HTMLFormElement);
    expect(r.form_type).toBe("checkout");
  });

  it("newsletter forms map to low exploration action", () => {
    document.body.innerHTML = `<form><input type="email" name="email"/><button>Subscribe</button></form>`;
    const form = document.querySelector("form")! as HTMLFormElement;
    const intent = classifyFormIntent(form);
    const action = formIntentToCommercialAction(intent);
    expect(intent.form_type).toBe("newsletter");
    expect(action.intent_strength).toBe("low");
  });

  it("search forms map to low-friction exploration", () => {
    document.body.innerHTML = `<form action="/search"><input type="search" name="q"/><button>Search</button></form>`;
    const intent = classifyFormIntent(document.querySelector("form")! as HTMLFormElement);
    const action = formIntentToCommercialAction(intent);
    expect(intent.form_type).toBe("search");
    expect(action.intent_strength).toBe("low");
    expect(buyerSafeFormTimelineLabel("search")).toBe("Submitted a search");
  });

  it("updates memory with form_type_counts without raw values", () => {
    const p = minimalProfile({
      site_context: { ...minimalProfile().site_context, vertical: "auto_retail", vertical_confidence: 90 },
    });
    document.body.innerHTML = `<form><button type="submit">Book test drive</button></form>`;
    const intent = classifyFormIntent(document.querySelector("form")! as HTMLFormElement);
    p.commercial_intent = updateCommercialIntentFromForm(p, intent);
    expect(p.commercial_intent?.form_type_counts?.appointment).toBe(1);
    expect(p.commercial_intent?.strongest_action_family).toBe("schedule_test_drive");
    expect(JSON.stringify(p.commercial_intent)).not.toMatch(/evenings only|notes/i);
    const lines = buildBuyerCommercialIntentRead(p);
    expect(lines.join(" ")).toMatch(/scheduling|in-person/i);
    expect(isBuyerUnsafeString(lines.join(" "))).toBe(false);
  });

  it("does not use input.value in classifyFormIntent", () => {
    const src = classifyFormIntent.toString();
    expect(src).not.toMatch(/\.value/);
  });
});
