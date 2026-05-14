import type { TrafficChannelGuess } from "@si/shared";

/** Inspector / operator copy — not sent on activation payloads (those keep enum slugs). */
export function marketerFriendlyArrivalSource(channel: TrafficChannelGuess): string {
  const labels: Record<TrafficChannelGuess, string> = {
    organic_search: "Organic search",
    paid_search: "Paid search",
    organic_social: "Organic social",
    paid_social: "Paid social",
    email: "Email or newsletter",
    crm: "CRM or lifecycle",
    display: "Display or programmatic",
    affiliate: "Partner, affiliate, or incentive link",
    partner_referral: "Partner or third-party referral",
    review_site: "Review or video-led discovery",
    community_referral: "Community or forum referral",
    llm_referral: "Conversational AI referral",
    answer_engine_referral: "AI answer engine referral",
    ai_search_referral: "AI-assisted search referral",
    direct_or_unknown: "Direct or unclear arrival",
  };
  return labels[channel] ?? channel.replace(/_/g, " ");
}

const mindsetByChannel: Record<TrafficChannelGuess, string> = {
  organic_search: "Probably researching or comparing before they commit — education and trust come first.",
  paid_search: "Likely arrived from a keyword or offer ad — they expect the landing story to match what they clicked.",
  organic_social: "Likely discovered you in-feed or through a peer network — lightweight first steps and social proof help.",
  paid_social: "Likely driven by creative or retargeting — continuity from the ad matters as much as the headline.",
  email: "Likely following a nurture or campaign link — they may already know your brand; respect the promised next step.",
  crm: "Likely from a lifecycle or sales touch — align tone to the stage they were nudged from.",
  display: "Likely from a display or syndication touch — assume loose intent until on-site behavior confirms interest.",
  affiliate: "Likely influenced by a partner, creator, or offer — honor incentives and the referring context.",
  partner_referral: "Likely sent from another site or publisher — credibility and topical relevance carry extra weight.",
  review_site: "Likely coming off a review, demo, or long-form video — they want proof, specifics, and comparisons.",
  community_referral: "Likely from a discussion thread — assume healthy skepticism and a preference for transparent detail.",
  llm_referral: "Likely exploring a recommendation or checklist from a chat assistant — framework clarity and evidence win.",
  answer_engine_referral: "Researching options from an AI-generated answer.",
  ai_search_referral: "Likely bridging an AI search summary with deeper evaluation — reconcile the AI framing with on-page depth.",
  direct_or_unknown: "Arrival context is thin — let on-site behavior and page semantics do most of the talking.",
};

const implicationByChannel: Record<TrafficChannelGuess, string> = {
  organic_search: "Lead with comparison-friendly education, FAQs, and credibility before aggressive promos.",
  paid_search: "Tight message match to the ad, clear next step, and low friction toward the promised outcome.",
  organic_social: "Social proof, scroll-friendly clarity, and a soft first ask before heavy conversion pressure.",
  paid_social: "Creative-message match, visual continuity, and a lightweight first step that earns the next click.",
  email: "Deliver the specific promise of the email; reduce repetition and make the next action obvious.",
  crm: "Lifecycle-appropriate tone — avoid generic acquisition hype if they are mid-journey.",
  display: "Assume browsing mode until they deepen; use progressive disclosure and clear value above the fold.",
  affiliate: "Honor partner or coupon continuity; make redemption and trust cues obvious.",
  partner_referral: "Editorial tone, topical relevance, and third-party validation before hard asks.",
  review_site: "Demonstration, specs, and comparison blocks — they showed up ready to evaluate.",
  community_referral: "Trust-building, proof-heavy, and specific trade-offs beat marketing gloss.",
  llm_referral: "Use educational proof, comparison, or implementation guidance before a hard CTA.",
  answer_engine_referral: "Use educational proof, comparison, or implementation guidance before a hard CTA.",
  ai_search_referral: "Use educational proof, comparison, or implementation guidance before a hard CTA.",
  direct_or_unknown: "Keep surfaces adaptive until intent clarifies; favor observe-first personalization.",
};

function sentenceCaseHint(hint: string): string {
  const t = hint.trim();
  if (!t) return "";
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

/** Primary “mindset” line for the inspector — marketer voice. */
export function marketerLikelyVisitorMindset(input: {
  channel: TrafficChannelGuess;
  /** When set, refines organic / paid nuance (still operator-safe). */
  acquisition_interpretation: string | null;
}): string {
  const { channel, acquisition_interpretation } = input;
  if (
    acquisition_interpretation &&
    (channel === "organic_search" || channel === "paid_search" || channel === "paid_social" || channel === "direct_or_unknown")
  ) {
    return acquisition_interpretation;
  }
  return mindsetByChannel[channel] ?? mindsetByChannel.direct_or_unknown;
}

/** Action-oriented personalization implication for the inspector. */
export function marketerPersonalizationImplication(
  channel: TrafficChannelGuess,
  personalization_hint: string | null,
): string {
  if (personalization_hint) return sentenceCaseHint(personalization_hint);
  return implicationByChannel[channel] ?? implicationByChannel.direct_or_unknown;
}
