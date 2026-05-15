export type JourneyStage = "discovery" | "browsing" | "comparison" | "conversion";

/**
 * Finer-grained commercial journey read (orthogonal to legacy {@link JourneyStage} for integrations).
 * Mapped heuristically from navigation, page roles, and engagement — not identity.
 */
export type CommercialJourneyPhase =
  | "discovery"
  | "research"
  | "comparison"
  | "evaluation"
  | "validation"
  | "conversion_ready"
  | "retention_interest"
  | "support_service";

/** Generic page archetype (orthogonal to auto `PageType`). Declared early for acquisition reads. */
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

/**
 * Inferred acquisition / traffic channel (probabilistic merge of click IDs, UTMs, referrer host,
 * landing pattern, and session shape — first-party only).
 */
export type TrafficChannelGuess =
  | "organic_search"
  | "paid_search"
  | "organic_social"
  | "paid_social"
  | "email"
  | "crm"
  | "display"
  | "affiliate"
  | "partner_referral"
  | "review_site"
  | "community_referral"
  | "llm_referral"
  | "answer_engine_referral"
  | "ai_search_referral"
  | "direct_or_unknown";

export interface TrafficAcquisitionRead {
  channel_guess: TrafficChannelGuess;
  /** Path + privacy-redacted search (raw `q` / `query` values replaced with `*`). */
  landing_path: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  has_click_id: boolean;
  /** 0–100 confidence in `channel_guess`. */
  arrival_confidence_0_100: number;
  /** Short evidence bullets for the acquisition read (no raw search queries). */
  acquisition_evidence: string[];
  /** Confidence-aware headline for panels (e.g. “Likely organic search (Google)”). */
  acquisition_narrative: string;
  /** Commercial interpretation for operators (session-local). */
  acquisition_interpretation: string | null;
  /** First landing page archetype when journey is known. */
  entry_page_kind: GenericPageKind | null;
  /** Human summary of landing + early journey shape for acquisition. */
  landing_pattern_summary: string | null;
  /** Privacy-safe themes from URL search params only (raw query text discarded after tokenization). */
  query_themes: string[];
}

/** Funnel stage implied by acquisition + first-touch context (anonymous). */
export type AcquisitionStage =
  | "awareness"
  | "research"
  | "comparison"
  | "evaluation"
  | "retargeting"
  | "high_intent_conversion"
  | "unknown";

/**
 * First-class acquisition interpretation — likely mindset/context for this visit.
 * (Interpretation, not cross-session attribution; no raw search query storage.)
 */
export interface TrafficReferralModel {
  arrival_channel: TrafficChannelGuess;
  arrival_subchannel: string;
  arrival_type: string;
  campaign_detected: boolean;
  campaign_confidence_0_1: number;
  acquisition_strategy: string;
  acquisition_themes: string[];
  acquisition_posture: string | null;
  creative_interpretation: string | null;
  commerce_mindset: string[];
  personalization_hint: string | null;
  acquisition_stage: AcquisitionStage;
  evidence: string[];
  confidence_0_1: number;
}

export interface CampaignIntentRead {
  keyword_themes: string[];
  campaign_angle: string | null;
  commercial_clues: string[];
  confidence_0_100: number;
}

export interface ReferrerIntelligenceRead {
  category:
    | "search"
    | "social"
    | "ai_chat"
    | "community"
    | "video"
    | "professional_network"
    | "news_or_media"
    | "partner_or_affiliate"
    | "internal"
    | "referral"
    | "unknown";
  host: string | null;
  narrative: string;
  /** Strong coarse channel implied by referrer host (merged with URL + landing heuristics). */
  channel_hint: TrafficChannelGuess | null;
}

export interface NavigationPatternRead {
  journey_pattern: string;
  journey_velocity: "rapid" | "deliberate" | "slow";
  comparison_behavior: boolean;
  high_intent_transition: boolean;
  path_summary: string;
}

export interface EngagementQualityRead {
  label: "deep_reader" | "skim_reader" | "rapid_scanner" | "comparison_reviewer" | "hesitant_converter" | "balanced_visitor";
  rationale: string[];
}

export interface ActivationReadinessRead {
  /** “Safe to interrupt?” — higher means softer surfaces are still appropriate. */
  score_0_100: number;
  interruption_posture: "observe_only" | "soft_cta_ready" | "hard_cta_ready" | "avoid_interrupt";
  rationale: string[];
}

/** Session-level anonymous behavioral intelligence (no fingerprinting, no cross-site graph). */
export interface BehaviorSnapshot {
  traffic: TrafficAcquisitionRead;
  referral_model: TrafficReferralModel;
  campaign_intent: CampaignIntentRead;
  referrer: ReferrerIntelligenceRead;
  navigation: NavigationPatternRead;
  engagement_quality: EngagementQualityRead;
  activation_readiness: ActivationReadinessRead;
  commercial_journey_phase: CommercialJourneyPhase;
  /** Copy-safe similarity line — pattern-based, same-session only. */
  anonymous_similarity_hint: string | null;
  device_context: {
    coarse_device: "mobile" | "tablet" | "desktop" | "unknown";
    weekday: boolean;
    hour_local: number;
    viewport_bucket: "narrow" | "medium" | "wide" | "unknown";
  };
}

export interface PageJourneyEntry {
  path: string;
  generic_kind: GenericPageKind;
  /** Short title sample for sequence explainability (not full page dump). */
  title_snippet: string | null;
  t: number;
}

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
  | "auto_oem"
  | "ecommerce"
  | "b2b_saas"
  | "publisher_content"
  | "lead_generation"
  | "professional_services"
  | "nonprofit"
  | "unknown"
  | "general_business"
  | "content_led_business"
  | "healthcare"
  | "financial_services"
  | "education"
  | "travel_hospitality"
  | "real_estate"
  | "home_services"
  | "local_services";

/** Automotive retail or OEM — shared gates for scoring, treatments, and auto-specific copy. */
export function isAutoSiteVertical(vertical: SiteVertical): boolean {
  return vertical === "auto_retail" || vertical === "auto_oem";
}

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
  /** Finer journey phase for GTM / experimentation (optional). */
  commercial_journey_phase?: CommercialJourneyPhase;
  /** “Safe to interrupt?” style readiness (optional). */
  activation_readiness_score?: number;
}

/** Browser-local experience decision (anonymous, session-scoped). */
export type ExperienceDecisionTiming =
  | "immediate"
  | "after_scroll"
  | "next_navigation"
  | "exit_intent"
  | "idle";

export type ExperienceDecisionAction =
  | "show"
  | "replace"
  | "prioritize"
  | "defer"
  | "suppress"
  | "none";

export interface ExperienceDecision {
  id: string;
  surface_id: string;
  surface_type?: string;
  action: ExperienceDecisionAction;
  message_angle: string;
  offer_type: string;
  headline: string;
  body: string;
  cta_label: string;
  target_url_hint: string;
  timing: ExperienceDecisionTiming;
  friction: "low" | "medium" | "high";
  priority: number;
  /** 0–1 confidence in this decision. */
  confidence: number;
  reason: string[];
  evidence: string[];
  source_recipe_id?: string;
  suppression_reason?: string;
  ttl_seconds: number;
  expires_at: number;
  privacy_scope: "session_only";
  visitor_status: "anonymous";
}

export interface ExperienceDecisionEnvelope {
  event: "si_experience_decision";
  generated_at: number;
  session_id: string;
  primary_decision: ExperienceDecision | null;
  secondary_decisions: ExperienceDecision[];
  suppression_summary?: string;
  /** Human-readable progression / pacing notes (inspector + QA). */
  progression_notes?: string[];
}

/**
 * Coarse taxonomy for pacing and continuity (browser-local progression memory).
 * Maps from recipes via `decision_family` or lightweight inference.
 */
export type ExperienceDecisionFamily =
  | "implementation_guidance"
  | "evaluation_support"
  | "comparison_support"
  | "trust_building"
  | "commercial_readiness"
  | "soft_conversion"
  | "high_intent_escalation"
  | "unknown";

/**
 * Session-scoped progression memory (no persistence contract beyond optional sessionStorage in the SDK).
 */
export interface ExperienceProgressionMemory {
  /** Last surfaces that were actually emitted as primary (most recent last). */
  recent_surfaces_shown: string[];
  recent_recipe_ids: string[];
  recent_decision_families: ExperienceDecisionFamily[];
  /** Recent progression suppression reasons (debug / inspector). */
  suppression_history: string[];
  /**
   * Soft “warming” counter: incremented when softer families emit as primary.
   * Used to gate `high_intent_escalation` without ML.
   */
  escalation_stage: number;
  last_decision_emit_at: number | null;
  /** Bumped when the pathname changes (SPA-aware, runtime-maintained). */
  navigation_tick: number;
  last_path_seen: string;
  last_emit_navigation_tick: number | null;
  last_modal_emit_at: number | null;
  last_modal_emit_navigation_tick: number | null;
  /** Debounces rapid rebuilds of the same primary on one navigation tick. */
  last_recorded_primary_surface?: string | null;
}

/** Partial decision payload stored on a recipe row (merged with runtime fields). */
export interface ExperienceRecipeDecisionTemplate {
  action?: ExperienceDecisionAction;
  surface_type?: string;
  message_angle: string;
  offer_type: string;
  headline: string;
  body: string;
  cta_label: string;
  target_url_hint?: string;
  timing: ExperienceDecisionTiming;
  friction?: "low" | "medium" | "high";
  ttl_seconds?: number;
}

/** Lightweight recipe row (no DSL) — shipped as JSON packs. */
export interface ExperienceRecipe {
  id: string;
  label: string;
  verticals: string[];
  surfaces: string[];
  min_engagement_score?: number;
  min_activation_readiness?: number;
  /** Concept slugs (e.g. `implementation_readiness`) matched against slugified `concept_affinity` keys. */
  required_any_concepts?: string[];
  max_cta_clicks?: number;
  allowed_phases?: CommercialJourneyPhase[];
  /** Decision family for progression / pacing (optional; inferred when absent). */
  decision_family?: ExperienceDecisionFamily;
  decision: ExperienceRecipeDecisionTemplate;
}

export interface ExperienceSurfaceCatalogEntry {
  surface_id: string;
  surface_type?: string;
  label?: string;
  /** Minimum decision confidence (0–1) to allow activation on this surface. */
  min_confidence?: number;
  max_friction?: "low" | "medium" | "high";
  allowed_timing?: ExperienceDecisionTiming[];
  safe_for_zero_config?: boolean;
}

export interface ExperienceSurfaceCatalogFile {
  surfaces: ExperienceSurfaceCatalogEntry[];
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
  /**
   * Conversion-oriented CTA samples (hard + soft). Kept for backward compatibility;
   * prefer {@link cta_text_hard} / {@link cta_text_soft} for intent reads.
   */
  primary_ctas: string[];
  /** High-intent conversion CTAs (checkout, book demo, request quote, …). */
  cta_text_hard?: string[];
  /** Softer asks (learn more, guide, newsletter). */
  cta_text_soft?: string[];
  /** Nav-only labels (products, about, blog). */
  cta_text_navigation?: string[];
  /** Support / account / login. */
  cta_text_support?: string[];
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
  /**
   * Recent page transitions with generic page roles (first-party path only).
   * Used for journey-pattern inference — not cross-site tracking.
   */
  page_journey?: PageJourneyEntry[];
  /** Finer commercial phase than legacy {@link JourneyStage} alone. */
  commercial_journey_phase?: CommercialJourneyPhase;
  /**
   * Anonymous behavioral intelligence snapshot (traffic, campaign hints, journey shape, attention proxies).
   * No fingerprinting; refreshed each SDK tick from the current session only.
   */
  behavior_snapshot?: BehaviorSnapshot | null;
  /**
   * Lightweight, human-readable session milestones for the inspector (not keystrokes / not raw queries).
   * Capped client-side; first-party only.
   */
  intel_timeline?: SessionIntelEvent[];
  /** Dedupe / baselines for timeline emission — not sent to activation payloads. */
  intel_timeline_meta?: IntelTimelineMeta;
  /**
   * Browser-local experience progression (surfaces shown, families, pacing).
   * Owned by the SDK runtime; optional on fixtures for QA.
   */
  experience_progression?: ExperienceProgressionMemory;
}

/** One row in the inspector “session timeline” (anonymous, in-session). */
export interface SessionIntelEvent {
  t: number;
  message: string;
  dedupeKey?: string;
}

export interface IntelTimelineMeta {
  arrival_logged?: boolean;
  deep_scroll_paths?: string[];
  cta_hover_friction_logged?: boolean;
  /** Last activation readiness score used to detect a meaningful jump. */
  last_readiness_pushed?: number;
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
  /** Full URL at first SDK boot (same-origin only in practice). */
  landing_href: string;
  /** `document.referrer` when the session started (may be empty). */
  initial_referrer: string | null;
  /** Recent pathnames visited this session (SPA-aware). */
  path_sequence: string[];
  /** Milliseconds document was visible (visibility API). */
  tab_visible_ms: number;
  /** Milliseconds document was hidden. */
  tab_hidden_ms: number;
  /** Pointer hovers over primary chrome CTAs (throttled). */
  cta_hover_events: number;
  /** Clicks on pricing / finance / coupon / calculator surfaces (heuristic). */
  offer_surface_clicks: number;
  /** Focus events in form fields (throttled). */
  form_field_focus_events: number;
  /** Detected onsite search submits (heuristic). */
  onsite_search_events: number;
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

/** Cloudflare Access + D1 `authorized_users.role` */
export type DashboardRole = "customer_viewer" | "tenant_admin" | "platform_admin";

export type SiDeploymentMode = "development" | "staging" | "production";

export interface DashboardSiteDTO {
  id: string;
  tenant_id: string;
  domain: string;
  snippet_key: string;
  display_name: string;
}

export interface DashboardMeResponse {
  email: string;
  role: DashboardRole;
  auth_via: "access" | "dev_bypass";
  sites: DashboardSiteDTO[];
  deployment_mode: SiDeploymentMode;
  /** True when Worker has dashboard auth bypass enabled (never in production). */
  auth_bypass_enabled: boolean;
}

/** Marketing free-access requests (admin list). */
export type SignupRequestAdminStatus = "pending" | "reviewed" | "approved" | "rejected";

export interface SignupRequestAdminRow {
  id: string;
  created_at: string;
  name: string;
  email: string;
  company: string;
  website: string;
  use_case: string;
  tools: string[];
  status: SignupRequestAdminStatus;
}

export interface DashboardAdminSignupsResponse {
  signups: SignupRequestAdminRow[];
}

export interface DashboardSessionListRow {
  session_id: string;
  origin: string | null;
  journey_stage: string | null;
  intent_score: number | null;
  converted: number;
  created_at: string;
}

export interface DashboardInsightsResponse {
  journey_stages: { stage: string; sessions: number }[];
  site_verticals: { vertical: string; sessions: number }[];
  activation_opportunity_hits: { opportunity: string; sessions: number }[];
  acquisition_sources: { source: string; sessions: number }[];
  personalization_signal_samples: { session_id: string; snippet: string }[];
}

export const DEFAULT_THRESHOLDS = {
  high_intent: 70,
  high_urgency: 60,
  high_engagement: 65,
} as const;

export { GENERIC_HOSTED_SDK_CONFIG, VELOCITY_RETAIL_DEMO_SDK_CONFIG } from "./presetConfigs";
