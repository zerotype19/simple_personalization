import type { SiteVertical } from "@si/shared";
import { isAutoSiteVertical } from "@si/shared";
import {
  COMMERCIAL_ACTION_TAXONOMY,
  phrasesForAction,
  type ActionTaxonomyEntry,
} from "@si/shared";
import type {
  CommercialActionInterpretation,
  CommercialStage,
  CommitmentLevel,
  FrictionLevel,
  IntentStrength,
} from "@si/shared";
import { normalizeActionText } from "./normalizeActionText";

export interface ClassifyCommercialActionInput {
  text: string;
  href?: string;
  ariaLabel?: string;
  title?: string;
  vertical?: SiteVertical;
}

interface PhraseRule {
  actionId: string;
  phrase: string;
  normalized: string;
  entry: ActionTaxonomyEntry;
  negative: string[];
}

let phraseRulesCache: PhraseRule[] | null = null;

function buildPhraseRules(): PhraseRule[] {
  if (phraseRulesCache) return phraseRulesCache;
  const rules: PhraseRule[] = [];
  for (const entry of COMMERCIAL_ACTION_TAXONOMY) {
    const phrases = phrasesForAction(entry.id);
    for (const p of entry.phrases ?? []) {
      if (!phrases.includes(p)) phrases.push(p);
    }
    for (const phrase of phrases) {
      const normalized = normalizeActionText(phrase);
      if (normalized.length < 2) continue;
      rules.push({
        actionId: entry.id,
        phrase,
        normalized,
        entry,
        negative: (entry.negative_context ?? []).map(normalizeActionText),
      });
    }
  }
  rules.sort((a, b) => b.normalized.length - a.normalized.length);
  phraseRulesCache = rules;
  return rules;
}

function pathHintAction(href: string | undefined, vertical?: SiteVertical): string | null {
  if (!href) return null;
  const path = href.split("?")[0]!.toLowerCase();
  if (/pricing|plans|rates|fees/.test(path)) return "view_pricing";
  if (/compare|vs\b/.test(path)) return "compare";
  if (/test-?drive|testdrive/.test(path)) return "schedule_test_drive";
  if (/demo|schedule|book/.test(path)) return "schedule_demo";
  if (/trial|signup|register/.test(path)) return "start_trial";
  if (/checkout|cart/.test(path)) return "begin_checkout";
  if (/apply|application/.test(path)) return "apply";
  if (/finance|payment|calculator|apr|lease/.test(path)) return "view_financing";
  if (/dealer|locator|store/.test(path)) return "contact_dealer";
  if (/security|privacy|compliance/.test(path)) return "view_security";
  if (/return|shipping|warranty/.test(path)) return "view_returns";
  if (/review/.test(path)) return "read_reviews";
  if (/eligib|coverage|qualify/.test(path)) return "check_eligibility";
  if (/quote/.test(path)) return "request_quote";
  if (/build|configure|customize/.test(path)) return "configure";
  return null;
}

function preferAutoRetailActionFamily(
  family: string,
  normalized: string,
  vertical?: SiteVertical,
): string {
  if (!isAutoSiteVertical(vertical ?? "unknown")) return family;
  if (family === "schedule_demo" && /test[\s-]?drive|testdrive/.test(normalized)) {
    return "schedule_test_drive";
  }
  if (family === "schedule_demo" && /\b(dealer|dealership|appointment|test\s*drive)\b/.test(normalized)) {
    return "schedule_test_drive";
  }
  return family;
}

function verbNounMatch(normalized: string, entry: ActionTaxonomyEntry): boolean {
  const tokens = normalized.split(/\s+/);
  const verbs = entry.verbs ?? [];
  const nouns = entry.nouns ?? [];
  const hasVerb = verbs.some((v) => tokens.includes(v) || normalized.includes(v));
  const hasNoun = nouns.some((n) => tokens.includes(n) || normalized.includes(n));
  return hasVerb && hasNoun;
}

function toInterpretation(
  entry: ActionTaxonomyEntry,
  matched_phrase: string,
  confidence: number,
  evidence: string[],
): CommercialActionInterpretation {
  return {
    action_family: entry.id,
    matched_phrase,
    confidence,
    commercial_stage: entry.commercial_stage as CommercialStage,
    intent_strength: entry.intent_strength as IntentStrength,
    friction_level: entry.friction_level as FrictionLevel,
    commitment_level: entry.commitment_level as CommitmentLevel,
    blocker_category: entry.blocker_category,
    evidence,
  };
}

const FALLBACK: CommercialActionInterpretation = {
  action_family: "explore",
  matched_phrase: "",
  confidence: 0.35,
  commercial_stage: "exploration",
  intent_strength: "low",
  friction_level: "low",
  commitment_level: "content",
  evidence: ["generic_interactive_element"],
};

export function classifyCommercialAction(input: ClassifyCommercialActionInput): CommercialActionInterpretation {
  const parts = [input.text, input.ariaLabel, input.title].filter(Boolean) as string[];
  const combined = normalizeActionText(parts.join(" "));
  if (!combined || combined.length < 2) {
    const pathId = pathHintAction(input.href, input.vertical);
    if (pathId) {
      const entry = COMMERCIAL_ACTION_TAXONOMY.find((a) => a.id === pathId);
      if (entry) return toInterpretation(entry, `href:${pathId}`, 0.62, ["path_semantic_hint"]);
    }
    return { ...FALLBACK, evidence: ["empty_label"] };
  }

  for (const rule of buildPhraseRules()) {
    if (rule.normalized.length > combined.length + 4) continue;
    if (!combined.includes(rule.normalized)) continue;
    if (rule.negative.some((n) => n && combined.includes(n))) continue;
    const family = preferAutoRetailActionFamily(rule.actionId, combined, input.vertical);
    const entry =
      family === rule.actionId
        ? rule.entry
        : COMMERCIAL_ACTION_TAXONOMY.find((a) => a.id === family) ?? rule.entry;
    return toInterpretation(entry, rule.phrase, 0.88, ["exact_phrase_match"]);
  }

  for (const entry of COMMERCIAL_ACTION_TAXONOMY) {
    if (verbNounMatch(combined, entry)) {
      const negatives = (entry.negative_context ?? []).map(normalizeActionText);
      if (negatives.some((n) => combined.includes(n))) continue;
      const family = preferAutoRetailActionFamily(entry.id, combined, input.vertical);
      const resolved =
        family === entry.id ? entry : (COMMERCIAL_ACTION_TAXONOMY.find((a) => a.id === family) ?? entry);
      return toInterpretation(resolved, combined, 0.72, ["verb_noun_match"]);
    }
  }

  const pathId = pathHintAction(input.href, input.vertical);
  if (pathId) {
    const entry = COMMERCIAL_ACTION_TAXONOMY.find((a) => a.id === pathId);
    if (entry) return toInterpretation(entry, `href:${pathId}`, 0.65, ["path_semantic_hint"]);
  }

  if (/\b(learn|read|more|details)\b/.test(combined)) {
    const e = COMMERCIAL_ACTION_TAXONOMY.find((a) => a.id === "learn_more")!;
    return toInterpretation(e, combined, 0.55, ["weak_learn_pattern"]);
  }

  if (/\b(try|demo|trial|lab|playground|sandbox)\b/.test(combined)) {
    const e = COMMERCIAL_ACTION_TAXONOMY.find((a) => a.id === "start_trial")!;
    return toInterpretation(e, combined, 0.68, ["trial_exploration_pattern"]);
  }

  return { ...FALLBACK, matched_phrase: combined.slice(0, 40), evidence: ["unclassified_interaction"] };
}
