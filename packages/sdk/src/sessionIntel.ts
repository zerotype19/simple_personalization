import type { GenericPageKind, SessionProfile } from "@si/shared";
import { timelineHumanPageLabel } from "./siteEnvironment";

export const INTEL_TIMELINE_CAP = 15;

function channelNarrative(guess: string): string {
  return guess.replace(/_/g, " ");
}

/**
 * Append a capped, human-readable inspector timeline row (anonymous, first-party).
 */
export function pushIntelEvent(profile: SessionProfile, message: string, dedupeKey?: string): void {
  if (!profile.intel_timeline) profile.intel_timeline = [];
  if (dedupeKey && profile.intel_timeline.some((e) => e.dedupeKey === dedupeKey)) return;
  const last = profile.intel_timeline.at(-1);
  if (last && last.message === message) {
    last.t = Date.now();
    return;
  }
  profile.intel_timeline.push({ t: Date.now(), message, ...(dedupeKey ? { dedupeKey } : {}) });
  if (profile.intel_timeline.length > INTEL_TIMELINE_CAP) {
    profile.intel_timeline.splice(0, profile.intel_timeline.length - INTEL_TIMELINE_CAP);
  }
}

/**
 * Milestones driven from the runtime tick (page context, scroll depth, readiness jumps).
 * Call after {@link buildBehaviorSnapshot} so acquisition copy is accurate.
 */
export function appendIntelMilestones(
  profile: SessionProfile,
  opts: { isNewPageContext: boolean; pathname: string; genericKind: GenericPageKind },
): void {
  const meta = profile.intel_timeline_meta ?? (profile.intel_timeline_meta = {});
  if (!profile.intel_timeline) profile.intel_timeline = [];

  const bs = profile.behavior_snapshot;
  if (bs && !meta.arrival_logged) {
    meta.arrival_logged = true;
    const ch = channelNarrative(bs.traffic.channel_guess);
    const tail = bs.campaign_intent.campaign_angle ? ` — ${bs.campaign_intent.campaign_angle}` : "";
    pushIntelEvent(profile, `Arrived from ${ch}${tail}`, "arrival");
  }

  if (opts.isNewPageContext) {
    const label = timelineHumanPageLabel(opts.genericKind, opts.pathname);
    pushIntelEvent(
      profile,
      `Viewed ${label} — ${opts.pathname || "/"}`,
      `page:${opts.pathname}:${opts.genericKind}`,
    );
  }

  const path = opts.pathname || "/";
  if (!opts.isNewPageContext && profile.signals.max_scroll_depth >= 68) {
    const paths = meta.deep_scroll_paths ?? (meta.deep_scroll_paths = []);
    if (!paths.includes(path)) {
      paths.push(path);
      pushIntelEvent(profile, "Sustained deep reading on this page", `deep_scroll:${path}`);
    }
  }

  const s = profile.signals;
  if (s.cta_hover_events >= 4 && s.cta_clicks === 0 && !meta.cta_hover_friction_logged) {
    meta.cta_hover_friction_logged = true;
    pushIntelEvent(profile, "Repeated exposure to primary CTAs without a click", "cta_hover_friction");
  }

  const readiness = bs?.activation_readiness.score_0_100;
  if (readiness != null) {
    const prev = meta.last_readiness_pushed;
    if (prev == null) meta.last_readiness_pushed = readiness;
    else if (readiness - prev >= 14) {
      meta.last_readiness_pushed = readiness;
      pushIntelEvent(profile, "Activation readiness increased", `readiness:${readiness}`);
    }
  }
}

/**
 * Session-relative elapsed time for inspector / payload timelines.
 * Under 1 hour: `MM:SS`. At 1 hour+: `H:MM:SS` (never unbounded `1525:41`-style minute counts).
 */
export function formatTimelineClock(startedAt: number, t: number): string {
  const sec = Math.max(0, Math.floor((t - startedAt) / 1000));
  if (sec < 3600) {
    const minutes = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(minutes).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const TEN_MIN_MS = 10 * 60 * 1000;
const THIRTY_FIVE_MIN_MS = 35 * 60 * 1000;
const FORTY_FIVE_MIN_MS = 45 * 60 * 1000;

/**
 * Buyer-mode timeline labels: avoid hour-long `H:MM:SS` clocks that read like raw artifacts.
 * Operator timelines should keep {@link formatTimelineClock}.
 */
export function formatTimelineLabelForBuyer(startedAt: number, t: number, previousEventAt: number | null): string {
  const elapsedSec = Math.max(0, Math.floor((t - startedAt) / 1000));
  const gapSincePrev = previousEventAt != null ? t - previousEventAt : t - startedAt;
  if (previousEventAt === null) {
    return "Initial visit";
  }
  if (elapsedSec >= 3600) {
    if (gapSincePrev >= FORTY_FIVE_MIN_MS) return "After returning to content";
    if (gapSincePrev >= TEN_MIN_MS) return "After extended reading";
    return "Later";
  }
  if (gapSincePrev >= THIRTY_FIVE_MIN_MS) {
    return "After extended reading";
  }
  if (gapSincePrev >= TEN_MIN_MS) {
    return "Later";
  }
  return formatTimelineClock(startedAt, t);
}
