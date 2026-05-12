import type {
  ActiveTreatment,
  SessionProfile,
  TreatmentDefinition,
  TreatmentSelector,
} from "@si/shared";
import { buildRuleContext, evaluateExpression } from "./rules";

interface AppliedState {
  treatmentId: string;
  slot: string;
  original: { text?: string; html?: string; display?: string; classes?: string[] };
}

const APPLIED = new WeakMap<HTMLElement, AppliedState[]>();

function findSlot(slot: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-si-slot="${slot}"]`);
}

function applySelector(
  treatmentId: string,
  sel: TreatmentSelector,
): boolean {
  const el = findSlot(sel.slot);
  if (!el) return false;
  const prev: AppliedState = {
    treatmentId,
    slot: sel.slot,
    original: { classes: el.className ? el.className.split(/\s+/) : [] },
  };

  switch (sel.op) {
    case "text":
      prev.original.text = el.textContent ?? "";
      if (typeof sel.value === "string") el.textContent = sel.value;
      break;
    case "html":
      prev.original.html = el.innerHTML;
      if (typeof sel.value === "string") el.innerHTML = sel.value;
      break;
    case "addClass":
      if (sel.value) el.classList.add(...sel.value.split(/\s+/).filter(Boolean));
      break;
    case "removeClass":
      if (sel.value) el.classList.remove(...sel.value.split(/\s+/).filter(Boolean));
      break;
    case "attr":
      if (sel.attr) {
        prev.original.text = el.getAttribute(sel.attr) ?? undefined;
        if (sel.value == null) el.removeAttribute(sel.attr);
        else el.setAttribute(sel.attr, sel.value);
      }
      break;
    case "hide":
      prev.original.display = el.style.display;
      el.style.display = "none";
      break;
    case "show":
      prev.original.display = el.style.display;
      el.style.display = "";
      break;
    case "order": {
      if (!sel.order) break;
      const parent = el;
      const map = new Map<string, HTMLElement>();
      parent.querySelectorAll<HTMLElement>("[data-si-order]").forEach((c) => {
        const key = c.getAttribute("data-si-order")!;
        map.set(key, c);
      });
      sel.order.forEach((key) => {
        const c = map.get(key);
        if (c) parent.appendChild(c);
      });
      break;
    }
  }

  const stack = APPLIED.get(el) ?? [];
  stack.push(prev);
  APPLIED.set(el, stack);
  el.setAttribute("data-si-treated", treatmentId);
  return true;
}

export function applyTreatment(
  treatment: TreatmentDefinition,
  source: "experiment" | "rule",
): ActiveTreatment {
  const applied: string[] = [];
  for (const sel of treatment.selectors) {
    if (applySelector(treatment.id, sel)) applied.push(sel.slot);
  }
  return { treatment_id: treatment.id, source, applied_slots: applied };
}

/**
 * Pick treatments to apply: priority is the active experiment assignment's
 * treatment, then any rule-applicable treatments via `applies_when`.
 */
export function selectTreatments(
  treatments: TreatmentDefinition[],
  profile: SessionProfile,
): { id: string; source: "experiment" | "rule" }[] {
  const out: { id: string; source: "experiment" | "rule" }[] = [];
  const seen = new Set<string>();

  const exp = profile.experiment_assignment;
  const inExperimentHoldout = !!exp?.is_control;

  if (exp?.treatment_id) {
    out.push({
      id: exp.treatment_id,
      source: "experiment",
    });
    seen.add(exp.treatment_id);
  }

  if (inExperimentHoldout) {
    return out;
  }

  const ctx = buildRuleContext(profile);
  for (const t of treatments) {
    if (seen.has(t.id)) continue;
    if (!t.applies_when) continue;
    if (evaluateExpression(t.applies_when, ctx)) {
      out.push({ id: t.id, source: "rule" });
      seen.add(t.id);
    }
  }
  return out;
}

export function clearTreatments(): void {
  document.querySelectorAll<HTMLElement>("[data-si-treated]").forEach((el) => {
    const stack = APPLIED.get(el);
    if (!stack) return;
    for (const a of stack.reverse()) {
      if (a.original.text !== undefined) el.textContent = a.original.text;
      if (a.original.html !== undefined) el.innerHTML = a.original.html;
      if (a.original.display !== undefined) el.style.display = a.original.display;
      if (a.original.classes) el.className = a.original.classes.join(" ");
    }
    APPLIED.delete(el);
    el.removeAttribute("data-si-treated");
  });
}
