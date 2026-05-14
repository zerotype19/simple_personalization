import type {
  ActivationPlaybookMatch,
  SessionProfile,
  SiteEnvironmentSnapshot,
  SiteScanSummary,
} from "@si/shared";
import playbookJson from "../../../shared/src/context-packs/playbooks/b2b-marketing-ops.json";

interface PlaybookWhen {
  verticals: string[];
  min_engagement_score: number;
  max_cta_clicks: number;
  /** At least one of return_visit, pages, or scroll must clear these bars (OR). */
  min_pages_viewed: number;
  min_scroll_depth: number;
  momentum_match: "any_of_return_pages_or_scroll";
  concept_labels_any: string[];
  min_concept_affinity_for_any: number;
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

const playbook = playbookJson as PlaybookRoot;

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

/**
 * B2B playbook: session momentum + planning/implementation concepts + no CTA clicks.
 * Momentum = return visit OR multi-page OR deep scroll (first-visit deep readers can qualify).
 */
export function tryMatchActivationPlaybook(
  profile: SessionProfile,
  _env: SiteEnvironmentSnapshot,
  _scan: SiteScanSummary,
): ActivationPlaybookMatchResult | null {
  const w = playbook.when;
  const v = profile.site_context.vertical;
  if (!w.verticals.includes(v)) return null;
  if (profile.engagement_score < w.min_engagement_score) return null;
  if (profile.signals.cta_clicks > w.max_cta_clicks) return null;
  if (!sessionMomentumOk(profile, w)) return null;

  const aff = profile.concept_affinity;
  let bestLabel: string | null = null;
  let bestScore = 0;
  for (const label of w.concept_labels_any) {
    const s = aff[label];
    if (s != null && s >= w.min_concept_affinity_for_any && s > bestScore) {
      bestScore = s;
      bestLabel = label;
    }
  }
  if (!bestLabel) return null;

  const why: string[] = [];
  if (profile.signals.return_visit) why.push("Return visitor — likely comparing or going deeper");
  if (profile.signals.pages_viewed >= w.min_pages_viewed)
    why.push(`Multiple pages viewed (${profile.signals.pages_viewed}) — sustained interest`);
  if (profile.signals.max_scroll_depth >= w.min_scroll_depth)
    why.push(`Deep scroll (${profile.signals.max_scroll_depth}%) — reading in depth on this page`);
  if (profile.engagement_score >= w.min_engagement_score)
    why.push(`Meaningful engagement (score ${profile.engagement_score})`);
  why.push(`Strong “${bestLabel}” concept signal on this session`);
  if (profile.signals.cta_clicks === 0) why.push("No CTA click yet — good moment for a low-friction offer");

  const match: ActivationPlaybookMatch = {
    id: playbook.id,
    label: playbook.label,
    why,
    recommended_activation_summary: playbook.output.recommended_activation_summary,
  };

  return { match, output: playbook.output };
}
