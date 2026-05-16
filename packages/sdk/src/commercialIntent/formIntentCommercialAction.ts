import type {
  CommercialActionInterpretation,
  CommercialStage,
  CommitmentLevel,
  FormIntent,
  FormIntentType,
  FrictionLevel,
  IntentStrength,
  SiteVertical,
} from "@si/shared";
import { isAutoSiteVertical } from "@si/shared";

interface FormActionSpec {
  action_family: string;
  commercial_stage: CommercialStage;
  intent_strength: IntentStrength;
  friction_level: FrictionLevel;
  commitment_level: CommitmentLevel;
  confidence: number;
}

const DEFAULT_SPECS: Record<FormIntentType, FormActionSpec> = {
  search: {
    action_family: "explore",
    commercial_stage: "exploration",
    intent_strength: "low",
    friction_level: "low",
    commitment_level: "content",
    confidence: 0.62,
  },
  newsletter: {
    action_family: "learn_more",
    commercial_stage: "exploration",
    intent_strength: "low",
    friction_level: "low",
    commitment_level: "content",
    confidence: 0.58,
  },
  lead: {
    action_family: "talk_to_sales",
    commercial_stage: "human_escalation",
    intent_strength: "high",
    friction_level: "high",
    commitment_level: "lead",
    confidence: 0.78,
  },
  checkout: {
    action_family: "begin_checkout",
    commercial_stage: "commitment",
    intent_strength: "very_high",
    friction_level: "high",
    commitment_level: "purchase",
    confidence: 0.82,
  },
  application: {
    action_family: "apply",
    commercial_stage: "commitment",
    intent_strength: "very_high",
    friction_level: "high",
    commitment_level: "lead",
    confidence: 0.85,
  },
  quote: {
    action_family: "request_quote",
    commercial_stage: "qualification",
    intent_strength: "high",
    friction_level: "medium",
    commitment_level: "evaluation",
    confidence: 0.76,
  },
  appointment: {
    action_family: "book_appointment",
    commercial_stage: "human_escalation",
    intent_strength: "very_high",
    friction_level: "high",
    commitment_level: "human_contact",
    confidence: 0.84,
  },
  eligibility: {
    action_family: "check_eligibility",
    commercial_stage: "qualification",
    intent_strength: "medium",
    friction_level: "medium",
    commitment_level: "tool_use",
    confidence: 0.74,
  },
  login: {
    action_family: "learn_more",
    commercial_stage: "exploration",
    intent_strength: "low",
    friction_level: "medium",
    commitment_level: "account_or_cart",
    confidence: 0.55,
  },
  support: {
    action_family: "view_faq",
    commercial_stage: "objection_resolution",
    intent_strength: "low",
    friction_level: "low",
    commitment_level: "content",
    confidence: 0.6,
  },
  unknown: {
    action_family: "learn_more",
    commercial_stage: "evaluation",
    intent_strength: "medium",
    friction_level: "medium",
    commitment_level: "evaluation",
    confidence: 0.5,
  },
};

function appointmentFamily(vertical?: SiteVertical): string {
  if (vertical && isAutoSiteVertical(vertical)) return "schedule_test_drive";
  return "book_appointment";
}

export function formIntentToCommercialAction(
  form: FormIntent,
  vertical?: SiteVertical,
): CommercialActionInterpretation {
  const spec = { ...DEFAULT_SPECS[form.form_type] };
  if (form.form_type === "appointment") {
    spec.action_family = appointmentFamily(vertical);
  }

  return {
    action_family: spec.action_family,
    matched_phrase: `form:${form.form_type}`,
    confidence: spec.confidence,
    commercial_stage: form.commercial_stage ?? spec.commercial_stage,
    intent_strength: spec.intent_strength,
    friction_level: form.friction_level ?? spec.friction_level,
    commitment_level: form.commitment_level ?? spec.commitment_level,
    evidence: [...form.evidence, "form_structure"],
  };
}
