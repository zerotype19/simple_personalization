import type {
  GenericPageKind,
  NavigationPatternRead,
  ReferrerIntelligenceRead,
  SessionSignals,
  TrafficAcquisitionRead,
  TrafficChannelGuess,
} from "@si/shared";
import { analyzeReferrer } from "./referrerAnalyzer";
import type { LandingPatternRead } from "./landingPatternAnalyzer";
import { analyzeLandingAcquisitionPattern } from "./landingPatternAnalyzer";
import { extractQueryThemes } from "./queryThemeExtractor";

const CLICK_IDS = ["gclid", "fbclid", "msclkid", "ttclid", "li_fat_id", "wbraid", "gbraid", "rdt_cid", "epik"] as const;

const AFFILIATE_PARAM_KEYS = [
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

function detectAffiliateParams(sp: URLSearchParams): { detected: boolean; keys: string[] } {
  const keys: string[] = [];
  for (const k of AFFILIATE_PARAM_KEYS) {
    if (sp.has(k)) keys.push(k);
  }
  return { detected: keys.length > 0, keys };
}

function inferPaidChannelFromClickIds(sp: URLSearchParams): TrafficChannelGuess {
  if (sp.get("gclid") || sp.get("gbraid") || sp.get("wbraid") || sp.get("msclkid")) return "paid_search";
  if (sp.get("fbclid") || sp.get("ttclid") || sp.get("li_fat_id") || sp.get("rdt_cid") || sp.get("epik")) return "paid_social";
  return "display";
}

function norm(s: string | null): string | null {
  if (!s) return null;
  const t = s.trim();
  if (!t || t.length > 200) return t.slice(0, 200);
  return t;
}

function sanitizeLandingPath(url: URL): string {
  const sp = new URLSearchParams(url.search);
  for (const k of ["q", "query", "text", "s", "search", "keyword", "keywords"]) {
    if (sp.has(k)) sp.set(k, "*");
  }
  const q = sp.toString();
  return `${url.pathname}${q ? `?${q}` : ""}`.slice(0, 500);
}

export interface TrafficInferenceContext {
  href: string;
  documentReferrer: string | null;
  siteHostname: string | null;
  referrerRead: ReferrerIntelligenceRead;
  navigation: NavigationPatternRead;
  signals: SessionSignals;
  firstJourneyEntry: { generic_kind: GenericPageKind; path: string } | null;
  currentGenericKind: GenericPageKind;
  /** When provided, skips recomputing landing pattern inside infer. */
  landingPattern?: LandingPatternRead | null;
}

function buildInterpretation(
  channel: TrafficChannelGuess,
  entryKind: GenericPageKind | null,
  landingPatternOrganic: boolean,
): string | null {
  if (channel === "organic_search") {
    if (entryKind === "article_page")
      return "Research-heavy organic visitor consuming depth content before harder asks.";
    if (entryKind === "product_detail_page")
      return "High-intent organic evaluation on a detail surface — specs, comparison, and trust matter.";
    if (entryKind === "pricing_page" || entryKind === "lead_form_page")
      return "Commercial-intent organic visitor landing on evaluation or conversion surfaces.";
    if (landingPatternOrganic) return "Mid-funnel research-oriented organic visitor.";
    return "Organic search visitor — intent still forming from on-site behavior.";
  }
  if (channel === "llm_referral")
    return "Conversational LLM referral — framework or decision support; lead with proof and fast clarity.";
  if (channel === "answer_engine_referral")
    return "Answer-engine referral — scannable proof, citations, and tight topical relevance.";
  if (channel === "ai_search_referral")
    return "AI-assisted search referral — reconcile AI summary with authoritative on-page depth.";
  if (channel === "community_referral") return "Community-sourced visitor — peer context and skepticism are elevated.";
  if (channel === "review_site") return "Review- or video-led discovery — demonstration and credibility carry extra weight.";
  if (channel === "organic_social") return "Social-driven research visitor — professional or peer-influenced evaluation.";
  if (channel === "paid_search") return "Paid search visitor — align to keyword / offer continuity and post-click relevance.";
  if (channel === "paid_social") return "Paid social visitor — creative-message match and lightweight first steps win.";
  if (channel === "direct_or_unknown") return null;
  return null;
}

/**
 * Probabilistic acquisition inference: paid markers → UTMs → referrer intelligence → landing/session shape.
 */
export function inferTrafficAcquisition(ctx: TrafficInferenceContext): TrafficAcquisitionRead {
  let url: URL;
  try {
    url = new URL(ctx.href, "https://placeholder.local");
  } catch {
    return {
      channel_guess: "direct_or_unknown",
      landing_path: "/",
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_term: null,
      utm_content: null,
      has_click_id: false,
      arrival_confidence_0_100: 22,
      acquisition_evidence: ["Landing URL could not be parsed — acquisition read is weak."],
      acquisition_narrative: "Arrival source unclear",
      acquisition_interpretation: null,
      entry_page_kind: ctx.firstJourneyEntry?.generic_kind ?? ctx.currentGenericKind,
      landing_pattern_summary: null,
      query_themes: [],
    };
  }

  const entryKindEarly = ctx.firstJourneyEntry?.generic_kind ?? ctx.currentGenericKind;
  const landingPattern =
    ctx.landingPattern ??
    analyzeLandingAcquisitionPattern({
      entryKind: ctx.firstJourneyEntry?.generic_kind ?? entryKindEarly,
      signals: ctx.signals,
      navigation: ctx.navigation,
    });

  const sp = url.searchParams;
  const utm_source = norm(sp.get("utm_source"));
  const utm_medium = norm(sp.get("utm_medium"));
  const utm_campaign = norm(sp.get("utm_campaign"));
  const utm_term = norm(sp.get("utm_term"));
  const utm_content = norm(sp.get("utm_content"));

  let has_click_id = false;
  for (const k of CLICK_IDS) {
    if (sp.get(k)) {
      has_click_id = true;
      break;
    }
  }

  const ms = (utm_medium ?? "").toLowerCase();
  const src = (utm_source ?? "").toLowerCase();
  const query_themes = extractQueryThemes(ctx.href);
  const landing_path = sanitizeLandingPath(url);

  const entryKind = ctx.firstJourneyEntry?.generic_kind ?? ctx.currentGenericKind;

  const evidence: string[] = [];
  let channel: TrafficChannelGuess = "direct_or_unknown";
  let confidence = 28;

  const push = (e: string) => {
    if (!evidence.includes(e)) evidence.push(e);
  };

  // 1) Paid click IDs
  if (has_click_id) {
    channel = inferPaidChannelFromClickIds(sp);
    if (channel === "paid_search") {
      confidence = 88;
      push("Paid search click ID on landing URL (e.g. gclid / msclkid)");
    } else if (channel === "paid_social") {
      confidence = 86;
      push("Paid social click ID on landing URL (e.g. fbclid / ttclid / rdt_cid)");
    } else {
      confidence = 78;
      push("Paid ad click parameter — programmatic / display-class when platform ID is ambiguous");
    }
    if (utm_medium || utm_source) push("UTM tags present alongside click ID");
    return finalize(
      channel,
      confidence,
      evidence,
      {
        landing_path,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        has_click_id,
        entryKind,
        landingPattern,
        query_themes,
      },
    );
  }

  // 2) UTMs without click id
  if (utm_medium || utm_source) {
    if (/cpc|ppc|paidsearch|paid-search|paid_search/i.test(ms)) {
      channel = "paid_search";
      confidence = 82;
      push("UTM medium indicates paid search");
    } else if (/paidsocial|paid-social|paid_social/i.test(ms)) {
      channel = "paid_social";
      confidence = 80;
      push("UTM medium indicates paid social");
    } else if (/cpm|display|programmatic|banner/i.test(ms)) {
      channel = "display";
      confidence = 76;
      push("UTM medium indicates display / programmatic");
    } else if (/email|newsletter|nurture/i.test(ms)) {
      channel = "email";
      confidence = 74;
      push("UTM medium indicates email or newsletter");
    } else if (/crm|salesforce|hubspot|iterable|customer\.io/i.test(ms)) {
      channel = "crm";
      confidence = 72;
      push("UTM medium indicates CRM / lifecycle");
    } else if (/affiliate|partner|revshare/i.test(ms)) {
      channel = /affiliate/i.test(ms) ? "affiliate" : "partner_referral";
      confidence = 70;
      push("UTM medium indicates affiliate or partner program");
    } else if (
      (/organic|seo/i.test(ms) || ms === "organic") &&
      /(google|bing|duckduckgo|yahoo|baidu|yandex|ecosia)\b/i.test(src)
    ) {
      channel = "organic_search";
      confidence = 68;
      push("UTM tagged as organic search");
    } else if (
      /social|social-network|social_network|community/i.test(ms) ||
      /facebook|instagram|tiktok|linkedin|twitter|t\.co|reddit|youtube|pinterest/i.test(src)
    ) {
      channel = "organic_social";
      confidence = 66;
      push("UTM tagged as organic social");
    } else if (/organic|seo|search/i.test(ms)) {
      channel = "organic_search";
      confidence = 58;
      push("UTM suggests organic search without explicit engine source");
    } else if (/referral|web|site/i.test(ms)) {
      channel = "partner_referral";
      confidence = 55;
      push("UTM tagged as referral / partner web traffic");
    } else {
      channel = "partner_referral";
      confidence = 48;
      push("UTM present — acquisition channel inferred as referral-class");
    }
    if (query_themes.length) push(`Query themes (privacy-safe): ${query_themes.join(", ")}`);
    return finalize(channel, confidence, evidence, {
      landing_path,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      has_click_id,
      entryKind,
      landingPattern,
      query_themes,
    });
  }

  // Same-site navigation — not a new acquisition source
  if (ctx.referrerRead.category === "internal") {
    return finalize(
      "direct_or_unknown",
      30,
      ["Same-site referrer — acquisition channel not applicable for this hop"],
      {
        landing_path,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        has_click_id,
        entryKind,
        landingPattern,
        query_themes,
      },
    );
  }

  const aff = detectAffiliateParams(sp);
  if (!has_click_id && !(utm_medium || utm_source) && aff.detected) {
    channel = "affiliate";
    confidence = 71;
    for (const k of aff.keys) push(`Affiliate or partner URL param: ${k}`);
    if (query_themes.length) push(`Query themes (privacy-safe): ${query_themes.join(", ")}`);
    return finalize(channel, confidence, evidence, {
      landing_path,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      has_click_id,
      entryKind,
      landingPattern,
      query_themes,
    });
  }

  // 3) Referrer + host hints (no UTMs / click ids)
  const hint = ctx.referrerRead.channel_hint;
  if (ctx.documentReferrer && hint) {
    channel = hint;
    if (hint === "organic_search") {
      confidence = ctx.referrerRead.category === "search" ? 78 : 62;
      push("Search-class referrer host with no paid campaign markers on the landing URL");
      if (landingPattern.organic_research_shape) {
        confidence = Math.min(92, confidence + 10);
        push("Research-shaped landing and early journey reinforce organic search");
      }
    } else if (hint === "llm_referral") {
      confidence = 90;
      push("Conversational LLM referrer host");
    } else if (hint === "answer_engine_referral") {
      confidence = 90;
      push("Answer-engine referrer host");
    } else if (hint === "ai_search_referral") {
      confidence = 88;
      push("AI-assisted search referrer host");
    } else if (hint === "community_referral") {
      confidence = 86;
      push("Community platform referrer (e.g. Reddit-style discussion traffic)");
    } else if (hint === "review_site") {
      confidence = 84;
      push("Video / review platform referrer");
    } else if (hint === "organic_social") {
      confidence = 72;
      push("Social or professional network referrer without paid click IDs");
    } else if (hint === "partner_referral" || hint === "display") {
      confidence = 66;
      push("Third-party or syndication referrer");
    }
    if (query_themes.length) push(`Query themes (privacy-safe): ${query_themes.join(", ")}`);
    return finalize(channel, confidence, evidence, {
      landing_path,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      has_click_id,
      entryKind,
      landingPattern,
      query_themes,
    });
  }

  // 4) Stripped referrer — infer organic-style when session shape matches
  const noReferrer = !ctx.documentReferrer || ctx.referrerRead.category === "unknown";
  if (noReferrer && !has_click_id && !(utm_medium || utm_source)) {
    if (landingPattern.organic_research_shape) {
      channel = "organic_search";
      confidence = landingPattern.evidence.length >= 3 ? 58 : 46;
      push("Referrer missing or stripped (common on HTTPS / privacy browsers)");
      push("Landing and engagement resemble organic research traffic");
      for (const e of landingPattern.evidence) push(e);
    } else if (entryKind === "homepage" && ctx.signals.pages_viewed <= 1 && ctx.signals.max_scroll_depth < 40) {
      channel = "direct_or_unknown";
      confidence = 34;
      push("Homepage entry with thin engagement — true direct or lightweight discovery");
    } else {
      channel = "direct_or_unknown";
      confidence = 40;
      push("No referrer, UTMs, or click IDs — limited acquisition context");
    }
    if (query_themes.length) push(`Query themes (privacy-safe): ${query_themes.join(", ")}`);
    return finalize(channel, confidence, evidence, {
      landing_path,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      has_click_id,
      entryKind,
      landingPattern,
      query_themes,
    });
  }

  // 5) Referrer present but no channel_hint (parse edge)
  if (ctx.documentReferrer) {
    channel = "partner_referral";
    confidence = 52;
    push("External referrer without a stronger channel classifier — treating as generic referral");
  }

  if (query_themes.length) push(`Query themes (privacy-safe): ${query_themes.join(", ")}`);
  return finalize(channel, confidence, evidence, {
    landing_path,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    has_click_id,
    entryKind,
    landingPattern,
    query_themes,
  });
}

function finalize(
  channel: TrafficChannelGuess,
  confidence: number,
  evidence: string[],
  parts: {
    landing_path: string;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    utm_term: string | null;
    utm_content: string | null;
    has_click_id: boolean;
    entryKind: GenericPageKind;
    landingPattern: ReturnType<typeof analyzeLandingAcquisitionPattern>;
    query_themes: string[];
  },
): TrafficAcquisitionRead {
  const {
    landing_path,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    has_click_id,
    entryKind,
    landingPattern,
    query_themes,
  } = parts;

  const narrative = buildNarrative(channel, confidence, entryKind);
  const interpretation = buildInterpretation(channel, entryKind, landingPattern.organic_research_shape);

  return {
    channel_guess: channel,
    landing_path,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    has_click_id,
    arrival_confidence_0_100: Math.max(0, Math.min(100, Math.round(confidence))),
    acquisition_evidence: evidence.slice(0, 10),
    acquisition_narrative: narrative,
    acquisition_interpretation: interpretation,
    entry_page_kind: entryKind,
    landing_pattern_summary: landingPattern.summary,
    query_themes,
  };
}

function buildNarrative(channel: TrafficChannelGuess, confidence: number, entryKind: GenericPageKind): string {
  const strength = confidence >= 72 ? "Likely" : confidence >= 52 ? "Probably" : "Possibly";
  const weak = confidence < 52 ? " (limited acquisition signals)" : "";

  const label: Record<TrafficChannelGuess, string> = {
    organic_search: "organic search",
    paid_search: "paid search",
    organic_social: "organic social",
    paid_social: "paid social",
    email: "email / newsletter",
    crm: "CRM or lifecycle",
    display: "display / programmatic",
    affiliate: "affiliate",
    partner_referral: "partner or web referral",
    review_site: "review- or video-led discovery",
    community_referral: "community referral",
    llm_referral: "conversational LLM referral",
    answer_engine_referral: "answer-engine referral",
    ai_search_referral: "AI-assisted search referral",
    direct_or_unknown: "direct or ambiguous arrival",
  };

  const entryNote =
    entryKind && entryKind !== "homepage"
      ? ` — first touch: ${entryKind.replace(/_/g, " ")}`
      : entryKind === "homepage"
        ? " — first touch: homepage"
        : "";

  return `${strength} ${label[channel]}${entryNote}${weak}`;
}

/**
 * URL + referrer only (used in unit tests). Prefer {@link inferTrafficAcquisition} with full session context in runtime.
 */
export function analyzeTrafficAcquisition(href: string, documentReferrer: string | null): TrafficAcquisitionRead {
  const noopNav: NavigationPatternRead = {
    journey_pattern: "explore",
    journey_velocity: "deliberate",
    comparison_behavior: false,
    high_intent_transition: false,
    path_summary: "—",
  };
  const noopSignals: SessionSignals = {
    pages_viewed: 0,
    vdp_views: 0,
    pricing_views: 0,
    finance_interactions: 0,
    compare_interactions: 0,
    cta_clicks: 0,
    max_scroll_depth: 0,
    return_visit: false,
    session_duration_ms: 0,
    category_hits: {},
    landing_href: href,
    initial_referrer: documentReferrer,
    path_sequence: [],
    tab_visible_ms: 0,
    tab_hidden_ms: 0,
    cta_hover_events: 0,
    offer_surface_clicks: 0,
    form_field_focus_events: 0,
    onsite_search_events: 0,
  };
  const referrerRead = analyzeReferrer(documentReferrer, null);
  return inferTrafficAcquisition({
    href,
    documentReferrer,
    siteHostname: null,
    referrerRead,
    navigation: noopNav,
    signals: noopSignals,
    firstJourneyEntry: null,
    currentGenericKind: "unknown",
  });
}
