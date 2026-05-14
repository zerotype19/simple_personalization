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
  require_return_visit: boolean;
  max_cta_clicks: number;
  min_scroll_depth: number;
  min_pages_viewed: number;
  scroll_or_pages_either: boolean;
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

/**
 * First shipped playbook: high-engagement returning B2B visitor with planning/implementation
 * signals and no CTA clicks — recommend low-friction activation (guide/checklist).
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
  if (w.require_return_visit && !profile.signals.return_visit) return null;
  if (profile.signals.cta_clicks > w.max_cta_clicks) return null;

  const scrollOk = profile.signals.max_scroll_depth >= w.min_scroll_depth;
  const pagesOk = profile.signals.pages_viewed >= w.min_pages_viewed;
  if (w.scroll_or_pages_either) {
    if (!scrollOk && !pagesOk) return null;
  } else if (!scrollOk || !pagesOk) return null;

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
