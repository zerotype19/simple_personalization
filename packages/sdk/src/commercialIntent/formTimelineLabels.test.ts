import { describe, expect, it } from "vitest";
import { buyerSafeFormTimelineLabel } from "./formTimelineLabels";

describe("buyerSafeFormTimelineLabel", () => {
  it("uses scheduling copy for appointment submits", () => {
    expect(buyerSafeFormTimelineLabel("appointment")).toBe(
      "Moved toward scheduling or an in-person visit",
    );
  });

  it("falls back to generic copy for unknown form types", () => {
    expect(buyerSafeFormTimelineLabel("unknown")).toBe("Submitted a form on the page");
  });
});
