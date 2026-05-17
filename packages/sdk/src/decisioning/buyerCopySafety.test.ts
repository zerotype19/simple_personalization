import { describe, expect, it } from "vitest";
import {
  BUYER_RUNTIME_SIGNAL_STILL_GATHERING,
  buyerSafeLineOrNull,
  filterBuyerSafeLines,
  isBuyerUnsafeString,
  mapProgressionNoteForBuyer,
  sanitizeBuyerVisibleString,
} from "./buyerCopySafety";

describe("buyerCopySafety", () => {
  it("flags progression machinery and operator jargon", () => {
    expect(isBuyerUnsafeString("Progression held x (progression_surface_cooldown)")).toBe(true);
    expect(isBuyerUnsafeString("route ticks counted")).toBe(true);
    expect(isBuyerUnsafeString("activation readiness crossed")).toBe(true);
    expect(isBuyerUnsafeString("Activation readiness moved up")).toBe(true);
    expect(isBuyerUnsafeString('data-si-surface="surface_id"')).toBe(true);
    expect(isBuyerUnsafeString("Finance Payment Assist")).toBe(false);
    expect(isBuyerUnsafeString("primary slot")).toBe(true);
    expect(isBuyerUnsafeString("cooldown active")).toBe(true);
    expect(isBuyerUnsafeString("ladder level 3")).toBe(true);
    expect(isBuyerUnsafeString("readiness score")).toBe(true);
    expect(isBuyerUnsafeString("engagement score")).toBe(true);
    expect(isBuyerUnsafeString("model confidence")).toBe(true);
    expect(isBuyerUnsafeString("72%")).toBe(true);
    expect(isBuyerUnsafeString("route tick")).toBe(true);
    expect(isBuyerUnsafeString("candidates cleared gates")).toBe(true);
  });

  it("mapProgressionNoteForBuyer never returns raw runtime notes", () => {
    expect(
      mapProgressionNoteForBuyer(
        "Progression held integration_requirements_summary (progression_surface_cooldown)",
      ),
    ).toBeNull();
  });

  it("sanitizeBuyerVisibleString uses fallback when input is unsafe", () => {
    expect(sanitizeBuyerVisibleString("readiness score", BUYER_RUNTIME_SIGNAL_STILL_GATHERING)).toBe(
      BUYER_RUNTIME_SIGNAL_STILL_GATHERING,
    );
  });

  it("allows ordinary buyer reassurance copy", () => {
    expect(isBuyerUnsafeString("Interest is firming up before a stronger ask.")).toBe(false);
    expect(isBuyerUnsafeString("Soft guidance fits this moment in the visit.")).toBe(false);
  });

  it("filterBuyerSafeLines drops unsafe rows", () => {
    expect(filterBuyerSafeLines(["ok", "readiness score", "also ok"])).toEqual(["ok", "also ok"]);
  });

  it("buyerSafeLineOrNull returns null for unsafe strings", () => {
    expect(buyerSafeLineOrNull("  progression_gate blocked  ")).toBeNull();
    expect(buyerSafeLineOrNull("  Safe line.  ")).toBe("Safe line.");
  });

  it("canonical insufficient-signal copy is itself safe", () => {
    expect(isBuyerUnsafeString(BUYER_RUNTIME_SIGNAL_STILL_GATHERING)).toBe(false);
  });
});
