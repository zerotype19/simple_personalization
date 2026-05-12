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
