import type { SessionProfile } from "@si/shared";
import { buildExperienceDecisionEnvelopeWithDiagnostics } from "../buildExperienceDecisionEnvelope";
import {
  bumpNavigationTickIfPathChanged,
  emptyExperienceProgressionMemory,
  mergeExperienceProgressionMemory,
} from "../progressionMemory";
import { inferDecisionTransitionReasons } from "./inferTransitionReasons";
import type { DecisionTransition, ReplayFrameResult, ReplayOptions, ReplayResult } from "./types";

function pathFromProfile(p: SessionProfile): string {
  const seq = p.signals.path_sequence;
  if (seq?.length) return seq[seq.length - 1] || "/";
  const j = p.page_journey;
  if (j?.length) return j[j.length - 1]?.path || "/";
  return "/";
}

function progressionSnapshot(from: import("@si/shared").ExperienceProgressionMemory) {
  return mergeExperienceProgressionMemory(emptyExperienceProgressionMemory(), from);
}

function summarizeProgression(frames: ReplayFrameResult[]): string {
  if (!frames.length) return "No replay frames.";
  const first = frames[0]!.progression_memory.escalation_stage;
  const last = frames[frames.length - 1]!.progression_memory.escalation_stage;
  const nav = frames[frames.length - 1]!.progression_memory.navigation_tick;
  return `Escalation stage ${first} → ${last} across ${frames.length} ticks; navigation_tick ${nav}.`;
}

function summarizeSuppressions(frames: ReplayFrameResult[]): string {
  const parts: string[] = [];
  for (const f of frames) {
    if (!f.envelope.primary_decision && f.diagnostics.holdback_reasons.length) {
      parts.push(`Frame ${f.index}: ${f.diagnostics.holdback_reasons.slice(0, 3).join("; ")}`);
    }
  }
  return parts.length ? parts.join(" | ") : "No full suppression windows in replay (primaries may be active).";
}

function summarizeTiming(frames: ReplayFrameResult[]): string {
  const t = frames.map((f) => f.envelope.primary_decision?.timing ?? "—").join(" → ");
  return t || "—";
}

function suppressionDelta(
  prev: import("@si/shared").ExperienceDecision | null,
  next: import("@si/shared").ExperienceDecision | null,
): "gained" | "lost" | "unchanged" {
  if (prev && !next) return "lost";
  if (!prev && next) return "gained";
  return "unchanged";
}

/**
 * Replay a sequence of session snapshots through the same pipeline as the live runtime
 * (recipes, suppression, progression gates, `recordProgression`).
 */
export function runDecisionReplay(frames: SessionProfile[], options: ReplayOptions = {}): ReplayResult {
  const carry = options.carryProgression !== false;
  const baseNow = options.baseNow ?? Date.now();
  const observeOnly = options.observeOnly === true;

  const outFrames: ReplayFrameResult[] = [];
  const transitions: DecisionTransition[] = [];

  let progression = progressionSnapshot(
    mergeExperienceProgressionMemory(
      emptyExperienceProgressionMemory(),
      frames[0]?.experience_progression ?? {},
    ),
  );

  let prevProfile: SessionProfile | null = null;
  let prevFrame: ReplayFrameResult | null = null;

  for (let i = 0; i < frames.length; i++) {
    const raw = frames[i]!;
    if (!carry) {
      progression = progressionSnapshot(
        mergeExperienceProgressionMemory(emptyExperienceProgressionMemory(), frames[0]?.experience_progression ?? {}),
      );
    }

    const profile = structuredClone(raw) as SessionProfile;
    profile.experience_progression = progression;

    if (carry) {
      bumpNavigationTickIfPathChanged(progression, pathFromProfile(raw));
    }

    const now = baseNow + i * 60_000;
    const { envelope, diagnostics } = buildExperienceDecisionEnvelopeWithDiagnostics(profile, {
      now,
      observeOnly,
      progression,
      recordProgression: carry,
    });

    const frame: ReplayFrameResult = {
      index: i,
      generated_at: now,
      envelope,
      diagnostics,
      progression_memory: progressionSnapshot(progression),
      path_replay_tick: pathFromProfile(raw),
    };
    outFrames.push(frame);

    if (prevProfile != null && prevFrame != null) {
      const reasons = inferDecisionTransitionReasons({
        prevProfile,
        nextProfile: profile,
        prevPrimary: prevFrame.envelope.primary_decision,
        nextPrimary: envelope.primary_decision,
        prevProgression: prevFrame.progression_memory,
        nextProgression: frame.progression_memory,
        holdbackReasonsNext: diagnostics.holdback_reasons,
      });
      transitions.push({
        from_index: i - 1,
        to_index: i,
        reasons,
        primary_surface_from: prevFrame.envelope.primary_decision?.surface_id ?? null,
        primary_surface_to: envelope.primary_decision?.surface_id ?? null,
        suppression_delta: suppressionDelta(prevFrame.envelope.primary_decision, envelope.primary_decision),
        timing_from: prevFrame.envelope.primary_decision?.timing ?? null,
        timing_to: envelope.primary_decision?.timing ?? null,
      });
    }

    prevProfile = profile;
    prevFrame = frame;
  }

  return {
    frames: outFrames,
    transitions,
    progression_summary: summarizeProgression(outFrames),
    suppression_summary: summarizeSuppressions(outFrames),
    timing_summary: summarizeTiming(outFrames),
  };
}
