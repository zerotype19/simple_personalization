import type {
  ActivationOpportunity,
  BehaviorSnapshot,
  CommercialJourneyPhase,
  ExperienceDecision,
  ExperienceDecisionTiming,
  ExperienceProgressionMemory,
  JourneyStage,
  PageType,
  Recommendation,
  SessionSignals,
  SiteContext,
  SiteEnvironmentSnapshot,
  SiteVertical,
} from "@si/shared";

/** Root `session-input.json` for a decision fixture case. */
export interface FixtureSessionInput {
  name: string;
  vertical: SiteVertical;
  engagement_score?: number;
  intent_score?: number;
  urgency_score?: number;
  journey_stage?: JourneyStage;
  commercial_journey_phase?: CommercialJourneyPhase;
  page_type?: PageType;
  site_context?: Partial<SiteContext>;
  site_environment?: Partial<SiteEnvironmentSnapshot>;
  behavior_snapshot?: BehaviorSnapshot | null;
  activation_opportunity: Partial<ActivationOpportunity>;
  concept_affinity?: Record<string, number>;
  concept_evidence?: Record<string, string[]>;
  signals?: Partial<SessionSignals>;
  recommendation?: Recommendation | null;
  /** Surfaces to assert via slot map (same contract as `getExperienceDecision`). */
  expected_surfaces_to_query?: string[];
  /** Seed session progression memory for multi-step / pacing fixtures (merged into `SessionProfile`). */
  experience_progression?: Partial<ExperienceProgressionMemory>;
}

export interface FixtureExpectedPrimary {
  /** When true, `primary_decision` must be null. */
  primary_must_be_null?: boolean;
  /** Partial match on primary when non-null. */
  primary_decision?: Partial<ExperienceDecision> | null;
  allowed_secondary_surface_ids?: string[];
  required_reason_terms?: string[];
  forbidden_terms?: string[];
  min_confidence?: number;
  max_confidence?: number;
  expected_timing?: ExperienceDecisionTiming;
  expected_offer_type?: string;
  expected_message_angle?: string;
  expected_surface_id?: string;
  /** Per-surface slot expectations (`show` | `suppress` | `none` | `any`). */
  surface_slots?: Record<string, "show" | "suppress" | "none" | "any">;
  /** Slot `show` is forbidden for these surfaces (e.g. modals under `soft_cta_ready`). */
  hard_surfaces_must_not_show?: string[];
  /** Run vertical-specific safety regex on primary blob (headline/body/CTA/reasons/evidence). */
  regulated_vertical_safety?: "healthcare" | "financial_services";
}

export interface FixtureBadPattern {
  /** Substring that must not appear in the blob of primary copy + reasons + evidence (case-insensitive). */
  forbidden_substring: string;
}

export type FixtureBadDecisionsFile = FixtureBadPattern[];

/** CLI / report: what the fixture asserted about the primary decision. */
export interface FixtureExpectationSnapshot {
  primaryMustBeNull: boolean;
  expectedSurfaceId?: string;
  expectedOfferType?: string;
  expectedMessageAngle?: string;
  expectedTiming?: string;
}

export interface FixtureRunResult {
  ok: boolean;
  fixtureName: string;
  verticalFolder: string;
  caseId: string;
  errors: string[];
  primary: ExperienceDecision | null;
  suppression_summary?: string;
  expectation: FixtureExpectationSnapshot;
  /** Non-blocking realism hints (CLI only). */
  realism_warnings?: string[];
}
