import type {
  AcquisitionStage,
  CampaignIntentRead,
  GenericPageKind,
  NavigationPatternRead,
  ReferrerIntelligenceRead,
  SessionSignals,
  TrafficAcquisitionRead,
  TrafficChannelGuess,
  TrafficReferralModel,
} from "@si/shared";
import type { LandingPatternRead } from "./landingPatternAnalyzer";
import {
  acquisitionPostureLine,
  mapAcquisitionThemes,
  personalizationHintForAcquisition,
} from "./acquisitionThemeMapper";

function stageFromContext(
  channel: TrafficChannelGuess,
  entryKind: GenericPageKind | null,
  themes: string[],
): AcquisitionStage {
  if (themes.includes("retargeting")) return "retargeting";
  if (
    (channel === "paid_search" || channel === "paid_social" || channel === "display") &&
    (entryKind === "pricing_page" || entryKind === "lead_form_page" || entryKind === "checkout_page")
  )
    return "high_intent_conversion";
  if (channel === "organic_search" && entryKind === "article_page") return "research";
  if (channel === "organic_search" && (entryKind === "product_detail_page" || entryKind === "category_page"))
    return "comparison";
  if (channel === "community_referral") return "comparison";
  if ((channel === "paid_social" || channel === "display") && entryKind === "homepage") return "awareness";
  if (channel === "organic_social" && entryKind === "homepage") return "awareness";
  if (channel === "paid_social" && themes.includes("offer_sensitive")) return "evaluation";
  return "unknown";
}

function arrivalTypeFrom(channel: TrafficChannelGuess, referrer: ReferrerIntelligenceRead, themes: string[]): string {
  if (channel === "community_referral") return "skeptical_evaluator";
  if (channel === "answer_engine_referral") return "answer_engine_discovery";
  if (channel === "ai_search_referral") return "ai_search_assisted";
  if (channel === "llm_referral") return "ai_assisted_research";
  if (channel === "organic_search" && themes.includes("comparison_mindset")) return "comparison_oriented";
  if (channel === "organic_search") return "research_oriented";
  if (channel === "paid_search") return "conversion_oriented";
  const h = (referrer.host ?? "").toLowerCase();
  if (h.includes("tiktok")) return "trend_discovery";
  return "context_forming";
}

function strategyFrom(channel: TrafficChannelGuess, stage: AcquisitionStage, entryKind: GenericPageKind | null): string {
  if (stage === "retargeting") return "retargeting_reactivation";
  if (stage === "high_intent_conversion") return "high_intent_conversion";
  if (channel === "organic_search" && (entryKind === "article_page" || entryKind === "support_page"))
    return "education_then_soft_conversion";
  if (channel === "organic_search") return "mid_funnel_comparison";
  if (channel === "community_referral") return "trust_building_proof_first";
  if (channel === "llm_referral" || channel === "answer_engine_referral" || channel === "ai_search_referral")
    return "answer_led_onboarding";
  if (channel === "affiliate") return "incentive_aligned_conversion";
  if (channel === "paid_social" || channel === "paid_search" || channel === "display") return "paid_performance_alignment";
  return "balanced_explore";
}

function subchannelFrom(referrer: ReferrerIntelligenceRead, channel: TrafficChannelGuess): string {
  const h = (referrer.host ?? "").toLowerCase();
  if (h.includes("google")) return "google";
  if (h.includes("bing")) return "bing";
  if (h.includes("facebook")) return "meta";
  if (h.includes("instagram")) return "instagram";
  if (h.includes("tiktok")) return "tiktok";
  if (h.includes("linkedin")) return "linkedin";
  if (h.includes("reddit")) return "reddit";
  if (h.includes("youtube") || h.includes("youtu.be")) return "youtube";
  if (h.includes("chatgpt")) return "chatgpt";
  if (h.includes("perplexity")) return "perplexity";
  if (h.includes("claude") || h.includes("anthropic")) return "claude";
  if (h.includes("copilot")) return "copilot";
  if (h.includes("gemini")) return "gemini";
  if (h.includes("you.com")) return "you";
  if (h.includes("phind")) return "phind";
  if (channel === "paid_search") return "search_ads";
  return "unknown";
}

function fallbackModel(t: TrafficAcquisitionRead): TrafficReferralModel {
  return {
    arrival_channel: t.channel_guess,
    arrival_subchannel: "unknown",
    arrival_type: "unknown",
    campaign_detected: false,
    campaign_confidence_0_1: 0,
    acquisition_strategy: "balanced_explore",
    acquisition_themes: [...t.query_themes],
    acquisition_posture: null,
    creative_interpretation: null,
    commerce_mindset: [],
    personalization_hint: null,
    acquisition_stage: "unknown",
    evidence: [...t.acquisition_evidence],
    confidence_0_1: Math.round(t.arrival_confidence_0_100) / 100,
  };
}

export function buildTrafficReferralModel(input: {
  urlString: string;
  traffic: TrafficAcquisitionRead;
  referrer: ReferrerIntelligenceRead;
  navigation: NavigationPatternRead;
  campaign_intent: CampaignIntentRead;
  signals: SessionSignals;
  landingPattern: LandingPatternRead;
}): TrafficReferralModel {
  let url: URL;
  try {
    url = new URL(input.urlString, "https://placeholder.local");
  } catch {
    return fallbackModel(input.traffic);
  }

  const { traffic, referrer, campaign_intent, landingPattern } = input;

  const themeBlock = mapAcquisitionThemes({ url, traffic, referrer, campaign_intent });
  const entryKind = traffic.entry_page_kind;
  const stage = stageFromContext(traffic.channel_guess, entryKind, themeBlock.themes);
  const strategy = strategyFrom(traffic.channel_guess, stage, entryKind);
  const arrival_type = arrivalTypeFrom(traffic.channel_guess, referrer, themeBlock.themes);
  const posture = acquisitionPostureLine(traffic.channel_guess, referrer, themeBlock);
  const hint = personalizationHintForAcquisition(
    traffic.channel_guess,
    stage,
    themeBlock.themes,
    referrer.host,
  );

  const evidence = [
    ...traffic.acquisition_evidence,
    ...themeBlock.affiliate_evidence.map((e) => `Affiliate signal: ${e}`),
  ];
  if (landingPattern.organic_research_shape && !evidence.some((e) => /research-shaped/i.test(e)))
    evidence.push("Research-shaped landing pattern corroborates arrival read");
  const evidenceCapped = evidence.slice(0, 14);

  const campaign_detected = !!(
    traffic.utm_campaign ||
    traffic.utm_content ||
    traffic.utm_term ||
    traffic.utm_medium ||
    traffic.utm_source
  );
  const campaign_confidence_0_1 = campaign_detected ? Math.min(0.95, campaign_intent.confidence_0_100 / 100) : 0;

  return {
    arrival_channel: traffic.channel_guess,
    arrival_subchannel: subchannelFrom(referrer, traffic.channel_guess),
    arrival_type,
    campaign_detected,
    campaign_confidence_0_1,
    acquisition_strategy: strategy,
    acquisition_themes: themeBlock.themes,
    acquisition_posture: posture,
    creative_interpretation: themeBlock.creative_interpretation,
    commerce_mindset: themeBlock.commerce_mindset,
    personalization_hint: hint,
    acquisition_stage: stage,
    evidence: evidenceCapped,
    confidence_0_1: Math.round(traffic.arrival_confidence_0_100) / 100,
  };
}
