export type JourneyStage = "discovery" | "browsing" | "comparison" | "conversion";

export type PageType =
  | "home"
  | "inventory"
  | "vdp"
  | "finance"
  | "compare"
  | "trade_in"
  | "test_drive"
  | "other";

/** Inferred site category for generic hosted-snippet behavior (no publisher config). */
export type SiteVertical =
  | "auto_retail"
  | "ecommerce"
  | "b2b_saas"
  | "publisher_content"
  | "lead_generation"
  | "professional_services"
  | "nonprofit"
  | "unknown";

/** Generic page archetype (orthogonal to auto `PageType`). */
export type GenericPageKind =
  | "homepage"
  | "category_page"
  | "product_detail_page"
  | "article_page"
  | "pricing_page"
  | "lead_form_page"
  | "cart_page"
  | "checkout_page"
  | "account_page"
  | "search_results_page"
  | "support_page"
  | "unknown";

export type PlatformGuess = "shopify" | "wordpress" | "webflow" | "squarespace" | "unknown";

/** 1 = observe, 2 = recommend, 3 = safe personalization eligible, 4 = strong (publisher opt-in only). */
export type PersonalizationLadderLevel = 1 | 2 | 3 | 4;

export interface SiteFingerprint {
  domain: string;
  /** Composite label, e.g. `b2b_saas_content` or `ecommerce`. */
  site_type: string;
  /** 0–1 heuristic confidence in `site_type`. */
  confidence: number;
  primary_topics: string[];
  detected_ctas: string[];
  /** High-level inferred business goal for this host. */
  likely_objective: string;
  platform_guess: PlatformGuess;
}

export interface PageEnvironmentInference {
  generic_kind: GenericPageKind;
  /** 0–1 confidence in `generic_kind`. */
  confidence: number;
  signals_used: string[];
}

export interface PageObjectHint {
  object_type: string;
  object_name: string | null;
  category: string | null;
  topic_cluster: string | null;
}

export interface ConversionObjectiveInference {
  primary_objective: string;
  secondary_objective: string | null;
  detected_elements: string[];
  /** 0–1 confidence in conversion read. */
  confidence: number;
}

export interface ConfidenceLadder {
  level: PersonalizationLadderLevel;
  label: string;
  detail: string;
}

/** Probabilistic environment inference (zero-config site intelligence). */
export interface SiteEnvironmentSnapshot {
  site: SiteFingerprint;
  page: PageEnvironmentInference;
  object: PageObjectHint;
  conversion: ConversionObjectiveInference;
  ladder: ConfidenceLadder;
}

/** Rich DOM/meta read for CMO-facing copy (no raw HTML persisted). */
export interface PageSemantics {
  canonical_href: string | null;
  meta_description_snippet: string | null;
  og_title: string | null;
  og_type: string | null;
  twitter_title: string | null;
  schema_types_detected: string[];
  h1_primary: string | null;
  heading_counts: { h2: number; h3: number };
  primary_promise: string | null;
  nav_link_sample: string[];
  form_guesses: string[];
  link_intent_summary: string;
  commerce_signal_hits: string[];
  b2b_signal_hits: string[];
  cms_platform: PlatformGuess;
  /** Plain-language CTA density read for the inspector. */
  cta_layout_summary: string;
}

/** When a file-based activation playbook matches, inspector + payload can cite it. */
export interface ActivationPlaybookMatch {
  id: string;
  label: string;
  /** Evidence-style bullets (why the playbook fired). */
  why: string[];
  /** One CMO-facing line (offer + surface). */
  recommended_activation_summary: string;
}

/** Anonymous-visitor activation read (not site redesign advice). */
export interface ActivationOpportunity {
  status: "developing" | "ready" | "strong";
  confidence: number;
  visitor_read: string;
  inferred_need: string;
  message_angle: string;
  offer_type: string;
  surface: string;
  timing: string;
  friction: "low" | "medium" | "high";
  primary_path_label: string;
  secondary_path_label: string;
  soft_path_label: string;
  opportunity_note: string | null;
  evidence: string[];
  reason: string[];
  /** Optional enrichment from `context-packs/playbooks/` (deterministic, explainable). */
  playbook: ActivationPlaybookMatch | null;
}

/** Flat signal for dataLayer / Adobe / Optimizely-style tools. */
export interface PersonalizationSignal {
  visitor_status: "anonymous";
  journey_stage: JourneyStage;
  inferred_archetype: string | null;
  inferred_need: string;
  top_concepts: { id: string; label: string; score: number }[];
  intent_score: number;
  urgency_score: number;
  engagement_score: number;
  conversion_readiness: number;
  recommended_message_angle: string;
  recommended_offer_type: string;
  recommended_surface: string;
  recommended_timing: string;
  recommended_friction_level: "low" | "medium" | "high";
  confidence: number;
  reason: string[];
}

export interface ActivationPayloadEnvelope {
  event: string;
  si: Record<string, unknown>;
}

/** Lightweight scan summary (no raw page dump — derived tokens only). */
export interface SiteScanSummary {
  domain: string;
  site_name: string | null;
  page_title: string;
  top_terms: string[];
  primary_ctas: string[];
  content_themes: string[];
}

/** What the SDK believes about the host site this session. */
export interface SiteContext {
  domain: string;
  site_name: string | null;
  vertical: SiteVertical;
  /** 0–100 heuristic confidence for `vertical`. */
  vertical_confidence: number;
  page_kind: string;
  scan: SiteScanSummary;
}

export interface SessionScores {
  intent_score: number;
  urgency_score: number;
  engagement_score: number;
}

export interface CategoryAffinity {
  [category: string]: number;
}

export interface SessionProfile extends SessionScores {
  session_id: string;
  started_at: number;
  updated_at: number;
  journey_stage: JourneyStage;
  category_affinity: CategoryAffinity;
  /**
   * Normalized business-concept scores (0–1) from bundled context packs + scan tokens.
   * Keys are human labels (e.g. "Quarterly planning"), not raw keywords.
   * Weak concepts below the display threshold are omitted.
   */
  concept_affinity: Record<string, number>;
  /** Pack terms that triggered each concept label (same keys as `concept_affinity`). */
  concept_evidence: Record<string, string[]>;
  page_type: PageType;
  signals: SessionSignals;
  experiment_assignment: ExperimentAssignment | null;
  active_treatments: ActiveTreatment[];
  next_best_action: Recommendation | null;
  persona: string | null;
  /** Inferred host context (hosted tag; no config). */
  site_context: SiteContext;
  /**
   * Human-readable metrics for the inspector (labels depend on `site_context.vertical`).
   * Values are counts or short strings (e.g. "74%").
   */
  dynamic_signals: Record<string, string>;
  /**
   * Site / page / conversion inference with confidence (hosted tag; no publisher config).
   * Populated each tick from DOM + URL + scan tokens only.
   */
  site_environment: SiteEnvironmentSnapshot;
  /** Meta, headings, schema, and intent hints from the live page. */
  page_semantics: PageSemantics;
  /** What the visitor is likely ready for next (activation, not page critique). */
  activation_opportunity: ActivationOpportunity;
  /** Normalized personalization signal for integrations. */
  personalization_signal: PersonalizationSignal;
  /** dataLayer-style envelope (event + `si` object). */
  activation_payload: ActivationPayloadEnvelope;
}

export interface SessionSignals {
  pages_viewed: number;
  vdp_views: number;
  pricing_views: number;
  finance_interactions: number;
  compare_interactions: number;
  cta_clicks: number;
  max_scroll_depth: number;
  return_visit: boolean;
  session_duration_ms: number;
  category_hits: CategoryAffinity;
}

export type RecommendedTreatmentLevel = "observe" | "recommend_only" | "safe_personalization";

export type RecommendedSurface =
  | "related_content"
  | "primary_cta"
  | "lead_form"
  | "product_grid"
  | "cart"
  | "newsletter"
  | "none";

export interface Recommendation {
  next_best_action: string;
  treatment_hint: string | null;
  confidence: number;
  reason: string[];
  /** Inferred business objective this NBA optimizes toward (objective-aware path). */
  objective?: string | null;
  /** Product ladder: observe → recommend copy only → safe DOM where allowed. */
  recommended_treatment_level?: RecommendedTreatmentLevel;
  /** Suggested UI surface for messaging (no auto DOM in zero-config). */
  recommended_surface?: RecommendedSurface;
}

export interface RuleDefinition {
  id: string;
  description?: string;
  /** plain-text expression evaluated against signals/scores/affinity */
  when: string;
  /** sets values on the profile when matched */
  set?: Partial<{
    journey_stage: JourneyStage;
    persona: string;
  }>;
  /** optional recommendation produced */
  recommend?: Omit<Recommendation, "confidence"> & { confidence?: number };
}

export interface TreatmentDefinition {
  id: string;
  name: string;
  /** dot-notated target selector e.g. "hero.cta_text" or CSS-like "[data-si-slot=hero-cta]" */
  selectors: TreatmentSelector[];
  /** rules-engine match expression used to apply this treatment outside experiments */
  applies_when?: string;
}

export interface TreatmentSelector {
  slot: string;
  op: "text" | "html" | "addClass" | "removeClass" | "attr" | "hide" | "show" | "order";
  value?: string;
  attr?: string;
  order?: string[];
}

export interface ExperimentDefinition {
  id: string;
  name: string;
  status: "draft" | "running" | "paused" | "complete";
  audience_when?: string;
  variants: ExperimentVariant[];
}

export interface ExperimentVariant {
  id: string;
  name: string;
  weight: number;
  treatment_id: string | null;
}

export interface ExperimentAssignment {
  experiment_id: string;
  variant_id: string;
  treatment_id: string | null;
  is_control: boolean;
}

export interface ActiveTreatment {
  treatment_id: string;
  source: "experiment" | "rule";
  applied_slots: string[];
}

export interface SDKConfig {
  rules: RuleDefinition[];
  treatments: TreatmentDefinition[];
  experiments: ExperimentDefinition[];
  thresholds: {
    high_intent: number;
    high_urgency: number;
    high_engagement: number;
  };
  inspector_enabled: boolean;
  collect_endpoint: string | null;
  config_endpoint: string | null;
}

export interface AnalyticsPayload {
  session_id: string;
  origin: string;
  started_at: number;
  ended_at: number;
  summary: {
    pages: number;
    vdp_views: number;
    pricing_views: number;
    finance_interactions: number;
    compare_interactions: number;
    cta_clicks: number;
    max_scroll_depth: number;
    intent_score: number;
    urgency_score: number;
    engagement_score: number;
    journey_stage: JourneyStage;
    category_affinity: CategoryAffinity;
    /** Present when the SDK inferred host context (hosted tag). */
    site_vertical?: SiteVertical;
    page_kind?: string;
    inferred_site_type?: string;
    inferred_generic_page?: GenericPageKind;
    personalization_ladder?: PersonalizationLadderLevel;
  };
  experiment_assignment: ExperimentAssignment | null;
  active_treatments: ActiveTreatment[];
  converted: boolean;
  conversion_type: string | null;
}

export interface ExperimentReport {
  id: string;
  name: string;
  status: string;
  sessions: number;
  variants: VariantReport[];
}

export interface VariantReport {
  id: string;
  name: string;
  is_control: boolean;
  sessions: number;
  cta_ctr: number;
  conversion_rate: number;
  avg_engagement: number;
  lift_cta: number | null;
  lift_conversion: number | null;
}

export interface DashboardSummary {
  sessions_ingested: number;
  conversions: number;
  avg_intent: number;
  avg_engagement: number;
  updated_at: number;
}

export const DEFAULT_THRESHOLDS = {
  high_intent: 70,
  high_urgency: 60,
  high_engagement: 65,
} as const;

export { GENERIC_HOSTED_SDK_CONFIG, VELOCITY_RETAIL_DEMO_SDK_CONFIG } from "./presetConfigs";
