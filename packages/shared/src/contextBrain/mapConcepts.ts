import type { CategoryAffinity, SiteScanSummary, SiteVertical } from "../index";
import contentEngagement from "../context-packs/concepts/content-engagement.json";
import commerceShopping from "../context-packs/concepts/commerce-shopping.json";
import leadGeneration from "../context-packs/concepts/lead-generation.json";
import marketingOperations from "../context-packs/concepts/marketing-operations.json";
import globalStop from "../context-packs/stopwords/global.json";
import siteBoilerplate from "../context-packs/stopwords/site-boilerplate.json";
import verticalAuto from "../context-packs/verticals/auto-retail.json";
import verticalB2b from "../context-packs/verticals/b2b-saas.json";
import verticalEcomB2c from "../context-packs/verticals/ecommerce-b2c.json";
import verticalProf from "../context-packs/verticals/professional-services.json";
import verticalPublisher from "../context-packs/verticals/publisher.json";

export interface ConceptDef {
  id: string;
  label: string;
  terms: string[];
}

export interface ConceptPackFile {
  id: string;
  label?: string;
  concepts: ConceptDef[];
}

export interface VerticalPackFile {
  id: string;
  concept_pack_ids: string[];
}

const PACK_BY_ID: Record<string, ConceptPackFile> = {
  marketing_operations: marketingOperations as ConceptPackFile,
  commerce_shopping: commerceShopping as ConceptPackFile,
  lead_generation: leadGeneration as ConceptPackFile,
  content_engagement: contentEngagement as ConceptPackFile,
};

const VERTICAL_META: Partial<Record<SiteVertical, VerticalPackFile>> = {
  auto_retail: verticalAuto as VerticalPackFile,
  b2b_saas: verticalB2b as VerticalPackFile,
  ecommerce: verticalEcomB2c as VerticalPackFile,
  publisher_content: verticalPublisher as VerticalPackFile,
  professional_services: verticalProf as VerticalPackFile,
  lead_generation: verticalB2b as VerticalPackFile,
  nonprofit: verticalPublisher as VerticalPackFile,
  unknown: verticalB2b as VerticalPackFile,
};

function verticalPlaybook(vertical: SiteVertical): VerticalPackFile {
  if (vertical === "ecommerce") return verticalEcomB2c as VerticalPackFile;
  return VERTICAL_META[vertical] ?? (verticalB2b as VerticalPackFile);
}

function collectPackIds(vertical: SiteVertical): string[] {
  const pb = verticalPlaybook(vertical);
  return [...(pb?.concept_pack_ids ?? ["marketing_operations", "content_engagement"])];
}

function tokenizeBrandAndDomain(domain: string, siteName: string | null): Set<string> {
  const s = new Set<string>();
  const dom = domain.toLowerCase().replace(/^www\./, "");
  const root = dom.split(".")[0] ?? "";
  if (root.length >= 3) {
    s.add(root);
    s.add(root.replace(/-/g, ""));
    root.split("-").forEach((p) => {
      if (p.length >= 3) s.add(p);
    });
  }
  if (siteName) {
    siteName
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .forEach((w) => {
        if (w.length >= 3) s.add(w);
      });
  }
  return s;
}

function buildStopwordSet(): Set<string> {
  const out = new Set<string>();
  for (const w of globalStop as string[]) out.add(w.toLowerCase());
  for (const w of siteBoilerplate as string[]) out.add(w.toLowerCase());
  return out;
}

const STOP = buildStopwordSet();

function normalizeToken(raw: string): string | null {
  const t = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  if (t.length < 3 || t.length > 48) return null;
  if (STOP.has(t)) return null;
  return t;
}

function collectCandidatePhrases(
  scan: SiteScanSummary,
  categoryAffinity: CategoryAffinity,
  brandBlock: Set<string>,
): string[] {
  const phrases: string[] = [];
  for (const term of scan.top_terms) {
    const n = normalizeToken(term);
    if (!n || brandBlock.has(n) || [...brandBlock].some((b) => b.length >= 4 && n.includes(b))) continue;
    phrases.push(n);
  }
  for (const th of scan.content_themes) {
    phrases.push(th.toLowerCase());
  }
  for (const k of Object.keys(categoryAffinity)) {
    const n = normalizeToken(k.replace(/_/g, " "));
    if (!n || brandBlock.has(n)) continue;
    phrases.push(n);
  }
  const title = scan.page_title.toLowerCase();
  if (title.length > 8) phrases.push(title);
  return phrases;
}

function phraseMatchesTerm(phrase: string, term: string): boolean {
  if (term.length < 3) return false;
  if (phrase === term) return true;
  const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return re.test(phrase) || phrase.includes(term);
}

/**
 * Map noisy session tokens into normalized business concept scores (0–1).
 */
export function computeConceptAffinity(
  vertical: SiteVertical,
  scan: SiteScanSummary,
  categoryAffinity: CategoryAffinity,
): Record<string, number> {
  const brandBlock = tokenizeBrandAndDomain(scan.domain, scan.site_name);
  const phrases = collectCandidatePhrases(scan, categoryAffinity, brandBlock);
  const packIds = collectPackIds(vertical);
  const concepts: ConceptDef[] = [];
  const seen = new Set<string>();
  for (const pid of packIds) {
    const pack = PACK_BY_ID[pid];
    if (!pack) continue;
    for (const c of pack.concepts) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      concepts.push(c);
    }
  }

  const scores: Record<string, number> = {};
  for (const c of concepts) {
    let hit = 0;
    for (const ph of phrases) {
      for (const term of c.terms) {
        if (phraseMatchesTerm(ph, term.toLowerCase())) {
          hit += 1 + Math.min(term.length / 20, 1);
          break;
        }
      }
    }
    if (hit > 0) scores[c.label] = hit;
  }

  const max = Math.max(1, ...Object.values(scores));
  const norm: Record<string, number> = {};
  for (const [k, v] of Object.entries(scores)) {
    norm[k] = Math.min(1, v / max);
  }
  return norm;
}
