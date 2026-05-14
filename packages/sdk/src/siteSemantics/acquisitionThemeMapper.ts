import type { CampaignIntentRead, ReferrerIntelligenceRead, TrafficAcquisitionRead, TrafficChannelGuess } from "@si/shared";

const AFF_PARAM_KEYS = [
  "ref",
  "affiliate",
  "aff",
  "partner",
  "creator",
  "influencer",
  "coupon",
  "promo",
  "promocode",
  "discountcode",
] as const;

export interface AcquisitionThemeMapResult {
  themes: string[];
  creative_interpretation: string | null;
  commerce_mindset: string[];
  affiliate_detected: boolean;
  affiliate_evidence: string[];
  social_posture: string | null;
}

function blobFromUtms(t: TrafficAcquisitionRead): string {
  return [t.utm_campaign, t.utm_content, t.utm_term, t.utm_source, t.utm_medium].filter(Boolean).join(" ").toLowerCase();
}

function mapCreativeFromBlob(blob: string): { themes: string[]; interpretation: string | null; mindset: string[] } {
  const themes: string[] = [];
  const mindset: string[] = [];
  let interpretation: string | null = null;

  if (/retarget|remarket|remarketing/i.test(blob)) {
    themes.push("retargeting");
    mindset.push("return_visitor_pressure");
  }
  if (/\bdemo\b|trial|free[_-]?trial/i.test(blob)) {
    themes.push("demo_interest");
    mindset.push("product_evaluation");
  }
  if (/offer|promo|coupon|save\d|discount|trade[_-]?in|tradein/i.test(blob)) {
    themes.push("offer_sensitive");
    mindset.push("incentive_responsive");
    if (/trade[_-]?in|tradein/i.test(blob)) mindset.push("trade_in_interest");
  }
  if (/compare|vs\b|versus|head[_-]?to[_-]?head|benchmark/i.test(blob)) {
    themes.push("comparison_mindset");
    mindset.push("evaluation_mode");
    interpretation = interpretation ?? "Creative suggests comparison / evaluation framing.";
  }
  if (/video|watch|reel/i.test(blob)) {
    themes.push("video_creative");
    interpretation = interpretation ?? "Video-led creative — visual proof and motion matter.";
  }

  return { themes: [...new Set(themes)], interpretation, mindset: [...new Set(mindset)] };
}

function socialPostureFromHost(host: string | null): string | null {
  if (!host) return null;
  const h = host.toLowerCase();
  if (h.includes("tiktok")) return "TikTok-style discovery — trend-led, fast proof, low initial friction.";
  if (h.includes("reddit")) return "Reddit-style skepticism — peer proof, specifics, and transparent trade-offs.";
  if (h.includes("youtube") || h.includes("youtu.be"))
    return "YouTube-style review traffic — deep evaluation and demonstration appetite.";
  if (h.includes("linkedin")) return "LinkedIn-style professional evaluation — credibility and industry fit.";
  if (h.includes("instagram")) return "Instagram-style aspirational / lifestyle discovery — visual polish and social proof.";
  if (h.includes("facebook") || h.includes("twitter") || h.includes("x.com")) return "Social feed discovery — scroll-stopping clarity and lightweight first asks.";
  return null;
}

export function mapAcquisitionThemes(input: {
  url: URL;
  traffic: TrafficAcquisitionRead;
  referrer: ReferrerIntelligenceRead;
  campaign_intent: CampaignIntentRead;
}): AcquisitionThemeMapResult {
  const { url, traffic, referrer, campaign_intent } = input;
  const sp = url.searchParams;
  const affiliate_evidence: string[] = [];
  const themeSet = new Set<string>([
    ...traffic.query_themes,
    ...campaign_intent.keyword_themes.filter(Boolean),
  ]);

  let affiliate_detected = false;
  for (const k of AFF_PARAM_KEYS) {
    if (sp.has(k)) {
      affiliate_detected = true;
      affiliate_evidence.push(`param:${k}`);
      if (["coupon", "promo", "promocode", "discountcode"].includes(k)) {
        themeSet.add("discount_sensitive");
        themeSet.add("offer_sensitive");
      }
      if (["creator", "influencer"].includes(k)) themeSet.add("creator_influenced");
      if (["affiliate", "partner", "ref"].includes(k)) themeSet.add("partner_or_review_driven");
    }
  }

  const blob = blobFromUtms(traffic);
  const creative = mapCreativeFromBlob(blob);
  for (const x of creative.themes) themeSet.add(x);

  const commerceMindset = new Set<string>(creative.mindset);
  if (affiliate_detected) commerceMindset.add("incentive_or_partner_influenced");

  const social_posture = socialPostureFromHost(referrer.host);

  return {
    themes: [...themeSet].slice(0, 16),
    creative_interpretation: creative.interpretation,
    commerce_mindset: [...commerceMindset].slice(0, 10),
    affiliate_detected,
    affiliate_evidence,
    social_posture,
  };
}

export function acquisitionPostureLine(
  channel: TrafficChannelGuess,
  referrer: ReferrerIntelligenceRead,
  themeMap: AcquisitionThemeMapResult,
): string | null {
  if (themeMap.social_posture) return themeMap.social_posture;
  if (channel === "answer_engine_referral") return "Answer-engine visitor — scannable proof and source-forward copy.";
  if (channel === "ai_search_referral") return "AI-search assisted visitor — reconcile AI summary with on-page depth.";
  if (channel === "llm_referral") return "LLM-assisted visitor — educational or implementation-oriented CTAs work well.";
  if (channel === "paid_search" || channel === "paid_social") return "Paid acquisition — match landing promise to ad/creative and reduce cognitive gap.";
  if (channel === "organic_search") return "Organic research visitor — comparison plus education before hard conversion.";
  if (channel === "affiliate") return "Partner or incentive-driven traffic — honor offer continuity and trust cues.";
  return null;
}

export function personalizationHintForAcquisition(
  channel: TrafficChannelGuess,
  stage: string,
  themes: string[],
  referrerHost: string | null,
): string | null {
  if (channel === "llm_referral" || channel === "answer_engine_referral" || channel === "ai_search_referral")
    return "Prefer lower-friction educational CTAs and proof blocks before hard conversion.";
  if (themes.includes("retargeting") || stage === "retargeting") return "Retargeting context — more direct conversion CTAs are appropriate if ladder allows.";
  if (channel === "organic_search") return "Lead with comparison tables, FAQs, and credibility before aggressive promos.";
  if ((referrerHost ?? "").includes("tiktok") || themes.includes("video_creative"))
    return "Fast onboarding and visual proof — compress time-to-value.";
  if (channel === "community_referral") return "Trust-building and third-party proof — skepticism is the default.";
  return null;
}
