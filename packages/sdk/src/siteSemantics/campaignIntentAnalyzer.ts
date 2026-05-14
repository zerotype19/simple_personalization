import type { CampaignIntentRead } from "@si/shared";

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "your",
  "this",
  "that",
  "you",
  "our",
  "are",
  "was",
  "has",
  "have",
  "will",
  "not",
  "but",
  "all",
  "any",
  "can",
  "get",
  "more",
]);

function tokens(s: string | null): string[] {
  if (!s) return [];
  return s
    .toLowerCase()
    .replace(/\+/g, " ")
    .split(/[^a-z0-9]+/i)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOP.has(w))
    .slice(0, 24);
}

/**
 * Derive campaign / keyword themes from UTM fields (no identity; session-local only).
 */
export function analyzeCampaignIntent(
  utm_term: string | null,
  utm_campaign: string | null,
  utm_content: string | null,
): CampaignIntentRead {
  const blob = [utm_term, utm_campaign, utm_content].filter(Boolean).join(" ");
  const kw = tokens(utm_term);
  const camp = tokens(utm_campaign);
  const creative = tokens(utm_content);
  const merged = [...new Set([...kw, ...camp, ...creative])];

  const commercial_clues: string[] = [];
  if (/financ|lease|apr|payment|rate|promo|sale|discount|coupon/i.test(blob))
    commercial_clues.push("offer_or_financing_sensitivity");
  if (/compare|vs|versus|benchmark|best|top|review/i.test(blob)) commercial_clues.push("comparison_or_evaluation");
  if (/demo|trial|quote|book|contact|apply/i.test(blob)) commercial_clues.push("conversion_or_demo_intent");
  if (/brand|aware|launch|summer|winter|event/i.test(blob)) commercial_clues.push("campaign_or_seasonal_story");

  let campaign_angle: string | null = null;
  if (commercial_clues.includes("comparison_or_evaluation")) campaign_angle = "Comparison / evaluation";
  else if (commercial_clues.includes("offer_or_financing_sensitivity")) campaign_angle = "Offer / financing";
  else if (commercial_clues.includes("conversion_or_demo_intent")) campaign_angle = "Direct response";
  else if (merged.length) campaign_angle = "Generic paid / tagged traffic";

  const confidence_0_100 = Math.min(
    92,
    28 + merged.length * 6 + (utm_term ? 18 : 0) + (utm_campaign ? 12 : 0),
  );

  return {
    keyword_themes: merged.slice(0, 12),
    campaign_angle,
    commercial_clues: [...new Set(commercial_clues)],
    confidence_0_100,
  };
}
