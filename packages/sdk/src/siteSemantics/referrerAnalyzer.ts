import type { ReferrerIntelligenceRead } from "@si/shared";

/**
 * Classify inbound referrer host for intent / trust heuristics (same-origin referrer often empty).
 */
export function analyzeReferrer(
  documentReferrer: string | null,
  siteHostname?: string | null,
): ReferrerIntelligenceRead {
  if (!documentReferrer) {
    return {
      category: "unknown",
      host: null,
      narrative: "No referrer on landing — direct, bookmarked, or stripped referrer.",
    };
  }
  let host: string | null = null;
  try {
    host = new URL(documentReferrer).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return { category: "unknown", host: null, narrative: "Referrer present but not parseable." };
  }

  const site = (siteHostname ?? "").replace(/^www\./, "").toLowerCase();
  if (site && host === site) {
    return {
      category: "internal",
      host,
      narrative: "Same-site referrer — internal navigation, not a new acquisition source.",
    };
  }

  let category: ReferrerIntelligenceRead["category"] = "unknown";
  let narrative = "Inbound link from another site.";

  if (/google\.[a-z.]+|bing\.com|duckduckgo\.com|yahoo\.com|baidu\.com/i.test(host)) {
    category = "search";
    narrative = "Search-engine referrer — often high-intent or comparison-oriented.";
  } else if (/facebook\.|instagram\.|t\.co|twitter\.|x\.com|linkedin\.|tiktok\.|reddit\.|youtube\.|pinterest\./i.test(host)) {
    category = "social";
    narrative = "Social / community referrer — discovery or peer-influenced evaluation.";
  } else if (/chatgpt\.|openai\.|claude\.|perplexity\.|copilot\./i.test(host)) {
    category = "ai_chat";
    narrative = "AI assistant referrer — question-led, often skeptical, needs fast proof.";
  } else if (/news\.|cnn\.|nytimes|wsj|reuters|bbc\.|substack\.|medium\.com/i.test(host)) {
    category = "news_or_media";
    narrative = "Editorial / media referrer — story-led, credibility-sensitive.";
  } else if (/doubleclick|googlesyndication|taboola|outbrain|criteo/i.test(host)) {
    category = "partner_or_affiliate";
    narrative = "Paid distribution / partner network referrer.";
  } else {
    category = "referral";
    narrative = "Third-party site referral — intent depends on that publisher’s context.";
  }

  return { category, host, narrative };
}
