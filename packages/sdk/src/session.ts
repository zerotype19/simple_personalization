import type {
  JourneyStage,
  PageType,
  SessionProfile,
  SessionSignals,
} from "@si/shared";
import { detectReturnVisit, safeGetJSON, safeSetJSON } from "./storage";

const SESSION_KEY = "si:session";

function generateId(): string {
  // RFC4122-ish v4 without crypto.subtle dependency.
  const a = Math.random().toString(36).slice(2, 10);
  const b = Math.random().toString(36).slice(2, 10);
  return `${a}-${b}-${Date.now().toString(36)}`;
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
  };
}

export function loadOrCreateProfile(initialPageType: PageType): SessionProfile {
  const existing = safeGetJSON<SessionProfile>(SESSION_KEY);
  if (existing) {
    existing.updated_at = Date.now();
    existing.page_type = initialPageType;
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
    page_type: initialPageType,
    signals: { ...createBlankSignals(), return_visit: detectReturnVisit() },
    experiment_assignment: null,
    active_treatments: [],
    next_best_action: null,
    persona: null,
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
