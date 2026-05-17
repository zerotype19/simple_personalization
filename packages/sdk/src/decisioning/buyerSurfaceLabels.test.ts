import { describe, expect, it } from "vitest";
import { buyerSurfaceLabel } from "./buyerSurfaceLabels";
import { isBuyerUnsafeString } from "./buyerCopySafety";

describe("buyerSurfaceLabel", () => {
  it("maps known demo and catalog surfaces to human experience labels", () => {
    expect(buyerSurfaceLabel("finance_payment_assist")).toBe("Payment reassurance");
    expect(buyerSurfaceLabel("inventory_assist_module")).toBe("Inventory availability guidance");
    expect(buyerSurfaceLabel("integration_requirements_summary")).toBe("Integration planning support");
  });

  it("never title-cases raw snake_case ids for unknown surfaces", () => {
    const label = buyerSurfaceLabel("some_unknown_surface_id");
    expect(label).not.toMatch(/Some Unknown|surface_id|_/);
    expect(label).toBe("A tailored on-site experience");
  });

  it("returns buyer-safe strings for mapped and fallback labels", () => {
    expect(isBuyerUnsafeString(buyerSurfaceLabel("finance_payment_assist"))).toBe(false);
    expect(isBuyerUnsafeString(buyerSurfaceLabel("mystery_surface"))).toBe(false);
  });
});
