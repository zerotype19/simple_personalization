/** Commercial interpretation types (deterministic, session-local, anonymous). */

export type CommercialStage =
  | "awareness"
  | "exploration"
  | "evaluation"
  | "comparison"
  | "qualification"
  | "objection_resolution"
  | "commitment"
  | "human_escalation";

export type IntentStrength = "passive" | "low" | "medium" | "high" | "very_high";

export type FrictionLevel = "passive" | "low" | "medium" | "high";

export type CommitmentLevel =
  | "none"
  | "content"
  | "evaluation"
  | "tool_use"
  | "account_or_cart"
  | "lead"
  | "purchase"
  | "human_contact";

export type PageRole =
  | "awareness"
  | "exploration"
  | "comparison"
  | "qualification"
  | "objection_resolution"
  | "implementation"
  | "configuration"
  | "conversion"
  | "support"
  | "trust_validation";

export type MomentumDirection =
  | "increasing"
  | "stable"
  | "hesitating"
  | "regressing"
  | "validating";

export interface CommercialActionInterpretation {
  action_family: string;
  matched_phrase: string;
  confidence: number;
  commercial_stage: CommercialStage;
  intent_strength: IntentStrength;
  friction_level: FrictionLevel;
  commitment_level: CommitmentLevel;
  blocker_category?: string;
  evidence: string[];
}

export type CtaElementRole =
  | "header_nav"
  | "hero"
  | "inline_content"
  | "pricing_section"
  | "product_card"
  | "form_submit"
  | "modal"
  | "footer"
  | "unknown";

export interface CtaElementInterpretation {
  action: CommercialActionInterpretation;
  element_role: CtaElementRole;
  is_primary_visual_cta: boolean;
  is_repeated_chrome_cta: boolean;
  should_count_as_cta_click: boolean;
  should_count_as_high_intent: boolean;
  timeline_label: string;
}

export type FormIntentType =
  | "lead"
  | "newsletter"
  | "search"
  | "checkout"
  | "application"
  | "quote"
  | "appointment"
  | "eligibility"
  | "login"
  | "support"
  | "unknown";

export interface FormIntent {
  form_type: FormIntentType;
  friction_level: FrictionLevel;
  commitment_level: CommitmentLevel;
  commercial_stage: CommercialStage;
  evidence: string[];
}

export interface PageRoleInterpretation {
  page_role: PageRole;
  confidence: number;
  evidence: string[];
  blocker_categories: string[];
}

export interface CommercialBlocker {
  id: string;
  confidence: number;
  evidence: string[];
  suggested_response_family: string;
}

export interface CommercialBlockerInference {
  blockers: CommercialBlocker[];
}

export interface CommercialMomentum {
  direction: MomentumDirection;
  confidence: number;
  evidence: string[];
  latest_stage?: CommercialStage;
  prior_stage?: CommercialStage;
  stage_sequence: CommercialStage[];
}

/** Session-scoped commercial interpretation memory (no raw text, no PII). */
export interface CommercialIntentMemory {
  action_counts: Record<string, number>;
  /** Count of classified form submissions by {@link FormIntentType} (structure only). */
  form_type_counts?: Record<string, number>;
  strongest_action_family: string | null;
  stage_sequence: CommercialStage[];
  blockers: CommercialBlocker[];
  momentum: CommercialMomentum;
  last_interaction_label: string | null;
  high_intent_interactions: number;
  human_escalation_interactions: number;
  qualification_interactions: number;
  trust_validation_interactions: number;
  validated_topics: string[];
}
