import { describe, expect, it } from "vitest";
import {
  marketerArrivalSourceHeadline,
  marketerFriendlyArrivalSource,
  marketerLikelyVisitorMindset,
} from "./acquisitionPanelCopy";

describe("acquisitionPanelCopy", () => {
  it("uses marketer-facing arrival labels, not enum slugs", () => {
    expect(marketerFriendlyArrivalSource("answer_engine_referral")).toBe("AI answer engine referral");
    expect(marketerFriendlyArrivalSource("llm_referral")).toBe("Conversational AI referral");
  });

  it("softens organic headline when arrival confidence is below 70%", () => {
    expect(marketerArrivalSourceHeadline("organic_search", 72)).toBe("Organic search");
    expect(marketerArrivalSourceHeadline("organic_search", 46)).toBe("Likely organic search");
    expect(marketerArrivalSourceHeadline("organic_search", 32)).toBe("Possibly organic search");
  });

  it("keeps AI channel mindset in plain language", () => {
    expect(
      marketerLikelyVisitorMindset({ channel: "answer_engine_referral", acquisition_interpretation: null }),
    ).toMatch(/AI-generated answer/i);
  });
});
