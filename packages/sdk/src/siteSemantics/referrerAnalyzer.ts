import type { ReferrerIntelligenceRead, TrafficChannelGuess } from "@si/shared";

/**
 * Classify inbound referrer host for intent / trust heuristics (same-origin referrer often empty).
 * `channel_hint` feeds probabilistic acquisition merge (with UTMs, click IDs, and landing pattern).
 */
export function analyzeReferrer(
  documentReferrer: string | null,
  siteHostname?: string | null,
): ReferrerIntelligenceRead {
  const empty = (extra: Partial<ReferrerIntelligenceRead> = {}): ReferrerIntelligenceRead => ({
    category: "unknown",
    host: null,
    narrative: "No referrer on landing — direct, bookmarked, or stripped referrer.",
    channel_hint: null,
    ...extra,
  });

  if (!documentReferrer) {
    return empty();
  }
  let host: string | null = null;
  try {
    host = new URL(documentReferrer).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return {
      category: "unknown",
      host: null,
      narrative: "Referrer present but not parseable.",
      channel_hint: null,
    };
  }

  const site = (siteHostname ?? "").replace(/^www\./, "").toLowerCase();
  if (site && host === site) {
    return {
      category: "internal",
      host,
      narrative: "Same-site referrer — internal navigation, not a new acquisition source.",
      channel_hint: null,
    };
  }

  const h = host;

  const searchEngine =
    /(^|\.)google\./.test(h) ||
    /(^|\.)bing\.com$/.test(h) ||
    /(^|\.)yahoo\.(com|co)/.test(h) ||
    h === "duckduckgo.com" ||
    /(^|\.)baidu\.com$/.test(h) ||
    /(^|\.)yandex\./.test(h) ||
    /(^|\.)search\.brave\.com$/.test(h) ||
    h === "ecosia.org" ||
    /(^|\.)startpage\.com$/.test(h);

  const llmHost =
    /(^|\.)chatgpt\.com$/.test(h) ||
    /(^|\.)openai\.com$/.test(h) ||
    /(^|\.)claude\.ai$/.test(h) ||
    /(^|\.)anthropic\.com$/.test(h) ||
    /(^|\.)perplexity\.ai$/.test(h) ||
    /(^|\.)gemini\.google\.com$/.test(h) ||
    /(^|\.)copilot\.microsoft\.com$/.test(h);

  if (llmHost) {
    return {
      category: "ai_chat",
      host,
      channel_hint: "llm_referral",
      narrative: "LLM / answer-engine referrer — AI-assisted discovery; lead with concise proof and sources.",
    };
  }

  if (searchEngine) {
    return {
      category: "search",
      host,
      channel_hint: "organic_search",
      narrative: "Search-engine referrer — often comparison or high-intent research (query string usually not exposed).",
    };
  }

  if (/reddit\.com$|(^|\.)old\.reddit\.com$/.test(h)) {
    return {
      category: "community",
      host,
      channel_hint: "community_referral",
      narrative: "Community (Reddit) referrer — skeptical, peer-influenced research traffic.",
    };
  }

  if (/youtube\.com$|youtu\.be$/.test(h)) {
    return {
      category: "video",
      host,
      channel_hint: "review_site",
      narrative: "Video platform referrer — review- or demo-driven discovery.",
    };
  }

  if (/linkedin\.com$/.test(h)) {
    return {
      category: "professional_network",
      host,
      channel_hint: "organic_social",
      narrative: "Professional network referrer — B2B research and credibility-sensitive evaluation.",
    };
  }

  if (/facebook\.|instagram\.|t\.co|^twitter\.|^x\.com|tiktok\.|pinterest\./.test(h)) {
    return {
      category: "social",
      host,
      channel_hint: "organic_social",
      narrative: "Social referrer — discovery or peer-influenced evaluation.",
    };
  }

  if (/news\.|cnn\.|nytimes|wsj|reuters|bbc\.|substack\.|medium\.com/.test(h)) {
    return {
      category: "news_or_media",
      host,
      channel_hint: "partner_referral",
      narrative: "Editorial / media referrer — story-led, credibility-sensitive.",
    };
  }

  if (/doubleclick|googlesyndication|taboola|outbrain|criteo/.test(h)) {
    return {
      category: "partner_or_affiliate",
      host,
      channel_hint: "display",
      narrative: "Paid distribution / partner network referrer.",
    };
  }

  return {
    category: "referral",
    host,
    channel_hint: "partner_referral",
    narrative: "Third-party site referral — intent depends on that publisher’s context.",
  };
}
