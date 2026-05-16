import type { SiteVertical } from "./index";
import actionTaxonomy from "./context-packs/commercial-intent/action-taxonomy.json";
import blockerTaxonomy from "./context-packs/commercial-intent/blocker-taxonomy.json";
import multilingualPhrases from "./context-packs/commercial-intent/multilingual-phrases.json";
import pageRoleTaxonomy from "./context-packs/commercial-intent/page-role-taxonomy.json";

export interface ActionTaxonomyEntry {
  id: string;
  label?: string;
  commercial_stage: string;
  intent_strength: string;
  friction_level: string;
  commitment_level: string;
  verbs?: string[];
  nouns?: string[];
  phrases?: string[];
  negative_context?: string[];
  blocker_category?: string;
  vertical_overrides?: Record<string, { id?: string; phrases?: string[] }>;
}

export interface BlockerTaxonomyEntry {
  id: string;
  label: string;
  suggested_response_family: string;
  path_hints: string[];
  phrase_hints: string[];
}

export interface PageRoleTaxonomyEntry {
  page_role: string;
  path_hints: string[];
  title_hints: string[];
}

export type MultilingualPhraseMap = Record<string, Record<string, string[]>>;

export const COMMERCIAL_ACTION_TAXONOMY: ActionTaxonomyEntry[] = actionTaxonomy.actions;
export const COMMERCIAL_BLOCKER_TAXONOMY: BlockerTaxonomyEntry[] = blockerTaxonomy.blockers;
export const COMMERCIAL_PAGE_ROLE_TAXONOMY: PageRoleTaxonomyEntry[] = pageRoleTaxonomy.roles;
export const COMMERCIAL_MULTILINGUAL_PHRASES: MultilingualPhraseMap = multilingualPhrases;

export function getActionTaxonomyEntry(id: string): ActionTaxonomyEntry | undefined {
  return COMMERCIAL_ACTION_TAXONOMY.find((a) => a.id === id);
}

export function phrasesForAction(actionId: string, vertical?: SiteVertical): string[] {
  const entry = getActionTaxonomyEntry(actionId);
  if (!entry) return [];
  const phrases = new Set<string>();
  for (const p of entry.phrases ?? []) phrases.add(p);
  if (vertical && entry.vertical_overrides?.[vertical]?.phrases) {
    for (const p of entry.vertical_overrides[vertical]!.phrases!) phrases.add(p);
  }
  const ml = COMMERCIAL_MULTILINGUAL_PHRASES[actionId];
  if (ml) {
    for (const lang of Object.keys(ml)) {
      for (const p of ml[lang] ?? []) phrases.add(p);
    }
  }
  return [...phrases];
}
