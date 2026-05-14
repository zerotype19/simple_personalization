import { describe, expect, it } from "vitest";
import { marketerFriendlyArrivalSource, marketerLikelyVisitorMindset } from "./acquisitionPanelCopy";

describe("acquisitionPanelCopy", () => {
  it("uses marketer-facing arrival labels, not enum slugs", () => {
    expect(marketerFriendlyArrivalSource("answer_engine_referral")).toBe("AI answer engine referral");
    expect(marketerFriendlyArrivalSource("llm_referral")).toBe("Conversational AI referral");
  });

  it("keeps AI channel mindset in plain language", () => {
    expect(
      marketerLikelyVisitorMindset({ channel: "answer_engine_referral", acquisition_interpretation: null }),
    ).toMatch(/AI-generated answer/i);
  });
});
