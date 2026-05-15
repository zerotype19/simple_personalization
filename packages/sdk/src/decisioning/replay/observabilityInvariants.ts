import type { ReplayResult } from "./types";

/** Detect surface_id A → B → A within three consecutive frames (DOM churn smell test). */
export function replayHasSurfaceFlicker(replay: ReplayResult): boolean {
  const ids = replay.frames.map((f) => f.envelope.primary_decision?.surface_id ?? null);
  for (let i = 2; i < ids.length; i++) {
    const a = ids[i - 2];
    const b = ids[i - 1];
    const c = ids[i];
    if (a && b && c && a !== b && a === c) return true;
  }
  return false;
}

/** Same primary surface repeated for many consecutive frames (spam heuristic). */
export function replayHasRepeatedSurfaceSpam(replay: ReplayResult, minRepeat = 4): boolean {
  let run = 0;
  let last: string | null = null;
  for (const f of replay.frames) {
    const sid = f.envelope.primary_decision?.surface_id ?? null;
    if (!sid) {
      run = 0;
      last = null;
      continue;
    }
    if (sid === last) {
      run++;
      if (run >= minRepeat) return true;
    } else {
      last = sid;
      run = 1;
    }
  }
  return false;
}

export function replayEscalationJumpsLimited(replay: ReplayResult, maxDelta = 2): boolean {
  for (let i = 1; i < replay.frames.length; i++) {
    const d =
      replay.frames[i]!.progression_memory.escalation_stage -
      replay.frames[i - 1]!.progression_memory.escalation_stage;
    if (d > maxDelta) return false;
  }
  return true;
}

export function replaySuppressionsHaveHoldbacks(replay: ReplayResult): boolean {
  for (const f of replay.frames) {
    if (
      f.envelope.primary_decision == null &&
      f.diagnostics.matched_recipe_ids.length > 0 &&
      f.diagnostics.holdback_reasons.length === 0
    ) {
      return false;
    }
  }
  return true;
}

export function replayTransitionsHaveReasons(replay: ReplayResult): boolean {
  return replay.transitions.every((t) => t.reasons.length > 0);
}
