import type { CommercialStage, CommitmentLevel, FormIntent, FrictionLevel } from "@si/shared";
import { normalizeActionText } from "./normalizeActionText";

function fieldHints(form: HTMLFormElement): string {
  const bits: string[] = [];
  form.querySelectorAll("label, input, textarea, select, button").forEach((n) => {
    if (n instanceof HTMLInputElement) {
      bits.push(n.name, n.placeholder, n.type, n.getAttribute("autocomplete") ?? "");
    } else if (n instanceof HTMLButtonElement) {
      bits.push(n.textContent ?? "");
    } else {
      bits.push(n.textContent ?? "");
    }
  });
  const action = form.getAttribute("action") ?? "";
  bits.push(action);
  return normalizeActionText(bits.join(" "));
}

export function classifyFormIntent(form: HTMLFormElement): FormIntent {
  const blob = fieldHints(form);
  const evidence: string[] = [];

  if (
    blob.includes("search") ||
    form.querySelector('input[type="search"], input[name="q"], input[name="query"]')
  ) {
    evidence.push("search_fields");
    return {
      form_type: "search",
      friction_level: "low",
      commitment_level: "content",
      commercial_stage: "exploration",
      evidence,
    };
  }

  if (/\b(subscribe|newsletter|email only|join our list)\b/.test(blob) && !blob.includes("company")) {
    evidence.push("newsletter_fields");
    return {
      form_type: "newsletter",
      friction_level: "low",
      commitment_level: "content",
      commercial_stage: "exploration",
      evidence,
    };
  }

  if (/\b(ssn|social security|income|loan amount|annual income)\b/.test(blob)) {
    evidence.push("financial_application_fields");
    return {
      form_type: "application",
      friction_level: "high",
      commitment_level: "lead",
      commercial_stage: "commitment",
      evidence,
    };
  }

  if (/\b(checkout|payment|card number|billing)\b/.test(blob)) {
    evidence.push("checkout_fields");
    return {
      form_type: "checkout",
      friction_level: "high",
      commitment_level: "purchase",
      commercial_stage: "commitment",
      evidence,
    };
  }

  if (/\b(date|time|appointment|schedule|provider)\b/.test(blob)) {
    evidence.push("appointment_fields");
    return {
      form_type: "appointment",
      friction_level: "high",
      commitment_level: "human_contact",
      commercial_stage: "human_escalation",
      evidence,
    };
  }

  if (/\b(zip|dealer|store locator|availability)\b/.test(blob)) {
    evidence.push("availability_fields");
    return {
      form_type: "eligibility",
      friction_level: "medium",
      commitment_level: "tool_use",
      commercial_stage: "qualification",
      evidence,
    };
  }

  if (/\b(quote|rfp|company|message|phone|business)\b/.test(blob)) {
    evidence.push("lead_fields");
    return {
      form_type: "lead",
      friction_level: "high",
      commitment_level: "lead",
      commercial_stage: "human_escalation",
      evidence,
    };
  }

  if (/\b(login|password|sign in)\b/.test(blob)) {
    evidence.push("login_fields");
    return {
      form_type: "login",
      friction_level: "medium",
      commitment_level: "account_or_cart",
      commercial_stage: "exploration",
      evidence,
    };
  }

  if (/\b(support|ticket|issue)\b/.test(blob)) {
    evidence.push("support_fields");
    return {
      form_type: "support",
      friction_level: "low",
      commitment_level: "content",
      commercial_stage: "objection_resolution",
      evidence,
    };
  }

  return {
    form_type: "unknown",
    friction_level: "medium",
    commitment_level: "evaluation",
    commercial_stage: "evaluation",
    evidence: ["unclassified_form_structure"],
  };
}
