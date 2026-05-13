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

export interface Recommendation {
  next_best_action: string;
  treatment_hint: string | null;
  confidence: number;
  reason: string[];
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
