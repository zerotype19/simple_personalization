import type { TrafficChannelGuess } from "@si/shared";

export interface GenerativeReferrerRead {
  channel: TrafficChannelGuess;
  subchannel: string;
  arrival_type: string;
  context_line: string;
}

/**
 * Classify AI / answer-engine / AI-search referrers (AEO/GEO) — host only, no PII.
 */
export function classifyGenerativeReferrer(host: string): GenerativeReferrerRead | null {
  const h = host.replace(/^www\./, "").toLowerCase();

  if (/(^|\.)perplexity\.ai$/.test(h) || h === "you.com" || /(^|\.)you\.com$/.test(h) || /(^|\.)phind\.com$/.test(h)) {
    return {
      channel: "answer_engine_referral",
      subchannel: h.includes("perplexity") ? "perplexity" : h.includes("phind") ? "phind" : "you",
      arrival_type: "answer_engine_discovery",
      context_line: "Answer-engine discovery — concise proof, citations, and scannable takeaways.",
    };
  }

  if (/(^|\.)gemini\.google\.com$/.test(h)) {
    return {
      channel: "ai_search_referral",
      subchannel: "gemini",
      arrival_type: "ai_search_assisted",
      context_line: "AI-assisted search / workspace referral — bridge from AI summary to on-site depth.",
    };
  }

  if (
    /(^|\.)chatgpt\.com$/.test(h) ||
    /(^|\.)openai\.com$/.test(h) ||
    /(^|\.)claude\.ai$/.test(h) ||
    /(^|\.)anthropic\.com$/.test(h) ||
    /(^|\.)copilot\.microsoft\.com$/.test(h)
  ) {
    const sub = h.includes("claude") || h.includes("anthropic") ? "claude" : h.includes("copilot") ? "copilot" : "chatgpt";
    return {
      channel: "llm_referral",
      subchannel: sub,
      arrival_type: "ai_assisted_research",
      context_line: "Conversational LLM referral — framework / decision support; lead with clarity and evidence.",
    };
  }

  return null;
}
