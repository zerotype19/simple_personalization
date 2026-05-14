import type {
  ActivationPlaybookMatch,
  SessionProfile,
  SiteEnvironmentSnapshot,
  SiteScanSummary,
  SiteVertical,
} from "@si/shared";
import b2bJson from "../../../shared/src/context-packs/playbooks/b2b-marketing-ops.json";
import genDeepJson from "../../../shared/src/context-packs/playbooks/generic-deep-content-no-signup.json";
import genHighJson from "../../../shared/src/context-packs/playbooks/generic-high-engagement-no-cta.json";
import genLeadJson from "../../../shared/src/context-packs/playbooks/generic-lead-intent-no-form-submit.json";
import genProductJson from "../../../shared/src/context-packs/playbooks/generic-product-interest-no-cart.json";
import genReturnJson from "../../../shared/src/context-packs/playbooks/generic-return-visit-no-conversion.json";

interface PlaybookWhen {
  verticals: string[];
  exclude_verticals?: string[];
  min_engagement_score: number;
  max_cta_clicks: number;
  min_pages_viewed: number;
  min_scroll_depth: number;
  momentum_match: "any_of_return_pages_or_scroll";
  concept_labels_any?: string[];
  min_concept_affinity_for_any?: number;
  requires_return_visit?: boolean;
  generic_page_kinds?: string[];
  min_hard_ctas_on_scan?: number;
}

interface PlaybookOutput {
  inferred_need: string;
  message_angle: string;
  offer_type: string;
  surface: string;
  timing: string;
  friction: "low" | "medium" | "high";
  recommended_activation_summary: string;
}

interface PlaybookRoot {
  id: string;
  label: string;
  when: PlaybookWhen;
  output: PlaybookOutput;
}

const PLAYBOOKS: PlaybookRoot[] = [
  b2bJson as PlaybookRoot,
  genProductJson as PlaybookRoot,
  genDeepJson as PlaybookRoot,
  genLeadJson as PlaybookRoot,
  genReturnJson as PlaybookRoot,
  genHighJson as PlaybookRoot,
];

export interface ActivationPlaybookMatchResult {
  match: ActivationPlaybookMatch;
  output: PlaybookOutput;
}

function sessionMomentumOk(profile: SessionProfile, w: PlaybookWhen): boolean {
  if (w.momentum_match !== "any_of_return_pages_or_scroll") return false;
  return (
    profile.signals.return_visit ||
    profile.signals.pages_viewed >= w.min_pages_viewed ||
    profile.signals.max_scroll_depth >= w.min_scroll_depth
  );
}

function verticalsOk(v: SiteVertical, w: PlaybookWhen): boolean {
  if (w.exclude_verticals?.includes(v)) return false;
  if (w.verticals.includes("*")) return true;
  return w.verticals.includes(v);
}

function genericPageKindOk(
  env: SiteEnvironmentSnapshot,
  w: PlaybookWhen,
): boolean {
  if (!w.generic_page_kinds?.length) return true;
  const pk = env.page.generic_kind;
  return w.generic_page_kinds.includes(pk);
}

function tryMatchOne(
  playbook: PlaybookRoot,
  profile: SessionProfile,
  env: SiteEnvironmentSnapshot,
  scan: SiteScanSummary,
): ActivationPlaybookMatchResult | null {
  const w = playbook.when;
  const v = profile.site_context.vertical;
  if (!verticalsOk(v, w)) return null;
  if (!genericPageKindOk(env, w)) return null;
  if (w.requires_return_visit && !profile.signals.return_visit) return null;
  if (profile.engagement_score < w.min_engagement_score) return null;
  if (profile.signals.cta_clicks > w.max_cta_clicks) return null;
  if (!sessionMomentumOk(profile, w)) return null;

  if (w.min_hard_ctas_on_scan != null && (scan.cta_text_hard?.length ?? 0) < w.min_hard_ctas_on_scan) {
    return null;
  }

  const labels = w.concept_labels_any ?? [];
  const minAff = w.min_concept_affinity_for_any ?? 0.17;

  let bestLabel: string | null = null;
  let bestScore = 0;
  if (labels.length > 0) {
    const aff = profile.concept_affinity;
    for (const label of labels) {
      const s = aff[label];
      if (s != null && s >= minAff && s > bestScore) {
        bestScore = s;
        bestLabel = label;
      }
    }
    if (!bestLabel) return null;
  }

  const why: string[] = [];
  if (profile.signals.return_visit) why.push("Return visitor — likely comparing or going deeper");
  if (profile.signals.pages_viewed >= w.min_pages_viewed)
    why.push(`Multiple pages viewed (${profile.signals.pages_viewed}) — sustained interest`);
  if (profile.signals.max_scroll_depth >= w.min_scroll_depth)
    why.push(`Deep scroll (${profile.signals.max_scroll_depth}%) — reading in depth on this page`);
  if (profile.engagement_score >= w.min_engagement_score)
    why.push(`Meaningful engagement (score ${profile.engagement_score})`);
  if (bestLabel) why.push(`Strong “${bestLabel}” concept signal on this session`);
  if (profile.signals.cta_clicks === 0) why.push("No CTA click yet — good moment for a low-friction offer");

  const match: ActivationPlaybookMatch = {
    id: playbook.id,
    label: playbook.label,
    why,
    recommended_activation_summary: playbook.output.recommended_activation_summary,
  };

  return { match, output: playbook.output };
}

/**
 * Deterministic playbooks: B2B-specific first, then cross-vertical activation patterns.
 */
export function tryMatchActivationPlaybook(
  profile: SessionProfile,
  env: SiteEnvironmentSnapshot,
  scan: SiteScanSummary,
): ActivationPlaybookMatchResult | null {
  for (const pb of PLAYBOOKS) {
    const hit = tryMatchOne(pb, profile, env, scan);
    if (hit) return hit;
  }
  return null;
}
