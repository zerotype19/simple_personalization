import type {
  JourneyStage,
  PageType,
  SessionProfile,
  SessionSignals,
  SiteContext,
  SiteScanSummary,
} from "@si/shared";
import { detectReturnVisit, safeGetJSON, safeSetJSON } from "./storage";
import { emptySiteEnvironmentSnapshot } from "./siteEnvironment";
import {
  emptyActivationOpportunity,
  emptyActivationPayload,
  emptyPageSemantics,
  emptyPersonalizationSignal,
} from "./siteSemantics/defaults";
import { normalizeReadableText } from "./siteSemantics/normalizeText";

/** sessionStorage key for the persisted SessionProfile (not a cookie). */
export const SI_SESSION_STORAGE_KEY = "si:session";

const SESSION_KEY = SI_SESSION_STORAGE_KEY;

function generateId(): string {
  // RFC4122-ish v4 without crypto.subtle dependency.
  const a = Math.random().toString(36).slice(2, 10);
  const b = Math.random().toString(36).slice(2, 10);
  return `${a}-${b}-${Date.now().toString(36)}`;
}

function emptySiteScan(): SiteScanSummary {
  return {
    domain: typeof window !== "undefined" ? window.location.hostname : "",
    site_name: null,
    page_title: typeof document !== "undefined" ? normalizeReadableText(document.title) : "",
    top_terms: [],
    primary_ctas: [],
    content_themes: [],
  };
}

export function defaultSiteContext(): SiteContext {
  const scan = emptySiteScan();
  return {
    domain: scan.domain,
    site_name: scan.site_name,
    vertical: "unknown",
    vertical_confidence: 0,
    page_kind: "Unknown",
    scan,
  };
}

export function createBlankSignals(): SessionSignals {
  return {
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
    landing_href: typeof window !== "undefined" ? window.location.href : "",
    initial_referrer: typeof document !== "undefined" ? document.referrer || null : null,
    path_sequence: typeof window !== "undefined" ? [window.location.pathname] : [],
    tab_visible_ms: 0,
    tab_hidden_ms: 0,
    cta_hover_events: 0,
    offer_surface_clicks: 0,
    form_field_focus_events: 0,
    onsite_search_events: 0,
  };
}

function migrateSessionSignals(s: SessionSignals): void {
  if (!s.landing_href && typeof window !== "undefined") s.landing_href = window.location.href;
  if (s.initial_referrer === undefined && typeof document !== "undefined") s.initial_referrer = document.referrer || null;
  if (!Array.isArray(s.path_sequence)) {
    s.path_sequence = typeof window !== "undefined" ? [window.location.pathname] : [];
  }
  s.tab_visible_ms ??= 0;
  s.tab_hidden_ms ??= 0;
  s.cta_hover_events ??= 0;
  s.offer_surface_clicks ??= 0;
  s.form_field_focus_events ??= 0;
  s.onsite_search_events ??= 0;
}

export function loadOrCreateProfile(initialPageType: PageType): SessionProfile {
  const existing = safeGetJSON<SessionProfile>(SESSION_KEY);
  if (existing) {
    existing.updated_at = Date.now();
    existing.page_type = initialPageType;
    if (!existing.site_context) existing.site_context = defaultSiteContext();
    if (!existing.dynamic_signals) existing.dynamic_signals = {};
    if (!existing.site_environment) existing.site_environment = emptySiteEnvironmentSnapshot();
    if (!existing.concept_affinity) existing.concept_affinity = {};
    if (!existing.concept_evidence) existing.concept_evidence = {};
    if (!existing.page_semantics) existing.page_semantics = emptyPageSemantics();
    if (!existing.activation_opportunity) existing.activation_opportunity = emptyActivationOpportunity();
    else if (existing.activation_opportunity.playbook === undefined)
      existing.activation_opportunity.playbook = null;
    if (!existing.personalization_signal) existing.personalization_signal = emptyPersonalizationSignal();
    if (!existing.activation_payload) existing.activation_payload = emptyActivationPayload();
    if (!existing.intel_timeline) existing.intel_timeline = [];
    if (!existing.intel_timeline_meta) existing.intel_timeline_meta = {};
    if (existing.signals.session_duration_ms > 8000 || existing.signals.pages_viewed > 1) {
      existing.intel_timeline_meta.arrival_logged = true;
    }
    migrateSessionSignals(existing.signals);
    return existing;
  }
  const session_id = generateId();
  const stage: JourneyStage = "discovery";
  const profile: SessionProfile = {
    session_id,
    started_at: Date.now(),
    updated_at: Date.now(),
    intent_score: 0,
    urgency_score: 0,
    engagement_score: 0,
    journey_stage: stage,
    category_affinity: {},
    concept_affinity: {},
    concept_evidence: {},
    page_type: initialPageType,
    signals: { ...createBlankSignals(), return_visit: detectReturnVisit() },
    experiment_assignment: null,
    active_treatments: [],
    next_best_action: null,
    persona: null,
    site_context: defaultSiteContext(),
    dynamic_signals: {},
    site_environment: emptySiteEnvironmentSnapshot(),
    page_semantics: emptyPageSemantics(),
    activation_opportunity: emptyActivationOpportunity(),
    personalization_signal: emptyPersonalizationSignal(),
    activation_payload: emptyActivationPayload(),
    intel_timeline: [],
    intel_timeline_meta: {},
  };
  safeSetJSON(SESSION_KEY, profile);
  return profile;
}

export function persistProfile(profile: SessionProfile): void {
  profile.updated_at = Date.now();
  safeSetJSON(SESSION_KEY, profile);
}

export function resetProfile(): void {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
