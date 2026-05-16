import type { SessionProfile } from "@si/shared";
import { marketerArrivalSourceHeadline, marketerLikelyVisitorMindset } from "./siteSemantics/acquisitionPanelCopy";
import { timelineHumanPageLabel } from "./siteEnvironment";
import { verticalDisplayName } from "./siteIntelligence/panelLabelMapper";
import { isBuyerUnsafeString } from "./decisioning/buyerCopySafety";

/** Single operator-facing activation line — avoids repeating playbook / note / NBA prose in the inspector. */
export function synthesizedActivationRecommendation(p: SessionProfile): string {
  const ao = p.activation_opportunity;
  const pb = ao.playbook?.recommended_activation_summary?.trim();
  if (pb) return pb;
  const note = ao.opportunity_note?.replace(/^Activation opportunity:\s*/i, "").trim();
  if (note) return note;
  const parts = [ao.inferred_need, ao.offer_type, ao.surface].filter(Boolean);
  if (parts.length >= 2) return `${parts[0]} — ${parts[1]}.`;
  return parts[0] ?? ao.message_angle;
}

/**
 * Hero copy for “Anonymous visitor read”: one acquisition line, engagement without repeating
 * commercial phase (that lives under Session journey).
 */
export function buildExecutiveVisitorBriefing(p: SessionProfile): {
  lead: string;
  acquisitionLine: string | null;
  engagementLine: string;
} {
  const bs = p.behavior_snapshot;
  const rm = bs?.referral_model;
  const sc = p.site_context;
  const env = p.site_environment;
  const site = sc.scan.site_name?.trim() || sc.domain || "this site";
  const vertical = verticalDisplayName(sc.vertical);
  const arrival = bs
    ? marketerArrivalSourceHeadline(bs.traffic.channel_guess, bs.traffic.arrival_confidence_0_100)
    : "an unclear arrival path";

  let posture = "Anonymous visitor";
  if (bs) {
    if (bs.engagement_quality.label === "deep_reader" || bs.navigation.journey_velocity === "slow")
      posture = "Deliberate evaluator";
    else if (bs.navigation.comparison_behavior) posture = "Comparison-oriented researcher";
    else if (bs.engagement_quality.label === "rapid_scanner") posture = "Fast-moving explorer";
  }

  const lead = `${posture} on ${site} (${vertical}), arriving via ${arrival.charAt(0).toLowerCase() + arrival.slice(1)}.`;

  const pathRecent = p.page_journey?.[p.page_journey.length - 1]?.path ?? "/";
  const surface = timelineHumanPageLabel(env.page.generic_kind, pathRecent);
  const engage = bs ? bs.engagement_quality.label.replace(/_/g, " ") : "";

  let acquisitionLine: string | null = null;
  if (bs) {
    const postureText = rm?.acquisition_posture?.trim();
    const interp = bs.traffic.acquisition_interpretation?.trim();
    if (postureText) acquisitionLine = postureText;
    else if (interp) acquisitionLine = interp.length > 260 ? `${interp.slice(0, 257)}…` : interp;
    else {
      const mind = marketerLikelyVisitorMindset({
        channel: bs.traffic.channel_guess,
        acquisition_interpretation: bs.traffic.acquisition_interpretation,
      });
      if (mind) acquisitionLine = mind;
    }
  }

  const engagementLine = bs
    ? `Viewing ${surface}. ${engage.charAt(0).toUpperCase() + engage.slice(1)} engagement on this surface.`
    : `Viewing ${surface}. Engagement signals are still warming up.`;

  return { lead, acquisitionLine, engagementLine };
}

const SCROLL_LABEL = "Sustained deep reading on this page";

/** Curate timeline for inspector: shorter labels, compress consecutive duplicates. */
export function curateIntelTimelineForInspector(
  profile: SessionProfile,
): { t: number; message: string; displayMessage: string }[] {
  const raw = profile.intel_timeline ?? [];
  const mapped = raw.map((e) => ({
    t: e.t,
    message: e.message,
    displayMessage: shortenTimelineMessage(e.message),
  }));
  const out: typeof mapped = [];
  for (const row of mapped) {
    const prev = out[out.length - 1];
    if (prev && prev.displayMessage === row.displayMessage) {
      prev.t = row.t;
      continue;
    }
    if (isBuyerUnsafeString(row.displayMessage)) continue;
    out.push({ ...row });
  }
  return collapseViewedPageRuns(out).slice(-14);
}

/** Merge long runs of distinct page views into a single narrative milestone. */
function collapseViewedPageRuns(rows: { t: number; message: string; displayMessage: string }[]): typeof rows {
  const res: typeof rows = [];
  let run: typeof rows = [];
  const isViewed = (d: string) => d.startsWith("Viewed ");
  const flush = () => {
    if (run.length === 0) return;
    if (run.length >= 3) {
      res.push({
        t: run[run.length - 1]!.t,
        message: run.map((r) => r.message).join(" | "),
        displayMessage: `Explored ${run.length} in-session pages`,
      });
    } else {
      res.push(...run);
    }
    run = [];
  };
  for (const row of rows) {
    if (isViewed(row.displayMessage)) run.push(row);
    else {
      flush();
      res.push(row);
    }
  }
  flush();
  return res;
}

function shortenTimelineMessage(m: string): string {
  if (m === SCROLL_LABEL) return "Sustained deep reading";
  if (m === "Activation readiness increased") return "Activation readiness moved up";
  const viewedPath = m.match(/^Viewed (.+) — .+$/);
  if (viewedPath) return `Viewed ${viewedPath[1]}`;
  return m;
}
