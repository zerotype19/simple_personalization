/**
 * Central guard for buyer-facing copy (inspector buyer mode, scenario presets, curated timelines).
 * Anything matching must not be shown to a buyer or external demo narrative.
 */

/** Canonical fallback when replay/transition signal is unknown or unsafe for buyers. */
export const BUYER_RUNTIME_SIGNAL_STILL_GATHERING =
  "The runtime is still gathering enough signal to justify a stronger step.";
const UNSAFE_PATTERNS: readonly RegExp[] = [
  /\bprogression_surface_cooldown\b/i,
  /\bProgression held\b/i,
  /\bprogression_held\b/i,
  /\bprogression_gate\b/i,
  /\bsurface_cooldown\b/i,
  /\bprogression_surface\b/i,
  /\broute\s+ticks?\b/i,
  /\bactivation\s+readiness\b/i,
  /\breadiness\s+moved\b/i,
  /\breadiness\s+increased\b/i,
  /\bsurface_id\b/i,
  /\bdata-si-surface\b/i,
  /\bmissing\s+surface\b/i,
  /\bno\s+surface\s+mapped\b/i,
  /\bactivation\s+readiness\s+crossed\b/i,
  /\bcleared\s+gates\b/i,
  /\bprogression\s+gates\b/i,
  /\bgates\s+or\b/i,
  /\bor\s+the\s+primary\s+slot\b/i,
  /\bprimary\s+slot\b/i,
  /\bslots?\b/i,
  /\bscore\b/i,
  /\bticks?\s+counted\b/i,
  /\bevaluation\s+tick\b/i,
  /\bon\s+this\s+tick\b/i,
  /\btick\b/i,
  /\bcandidates?\b/i,
  /\bgates\b/i,
  /\bmodel\s+confidence\b/i,
  /\bladder\s+level\b/i,
  /\bcooldown\b/i,
  /\bengagement\s+score\b/i,
  /\breadiness\s+score\b/i,
  /\bactivation\s+readiness\s+score\b/i,
  /\bactivation\s+readiness\s+\(/i,
  /\b\d{2,3}\s+engagement\b/i,
  /\broughly\s+\d+\s+activation\b/i,
  /\bconversion\s+ready\b/i,
  /\bfired\b/i,
  /\bmomentum\b/i,
  /\bthreshold\b.*\d/i,
  /\b\d+\s*\/\s*100\b/,
  /%/,
];

/** True when the string must not appear in buyer or external demo narrative surfaces. */
export function isBuyerUnsafeString(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  return UNSAFE_PATTERNS.some((r) => r.test(t));
}

/** Drop unsafe lines; trim and de-dupe. */
export function filterBuyerSafeLines(lines: readonly string[]): string[] {
  const out: string[] = [];
  for (const raw of lines) {
    const t = raw.trim();
    if (!t || isBuyerUnsafeString(t)) continue;
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

/** Returns trimmed string or null if empty / unsafe. */
export function buyerSafeLineOrNull(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = s.trim();
  if (!t || isBuyerUnsafeString(t)) return null;
  return t;
}

/**
 * Buyer-visible copy only — never pass through raw `progression_notes` or other runtime diagnostics.
 * Returns null when no curated translation exists (omit in UI).
 */
export function mapProgressionNoteForBuyer(_raw: string): string | null {
  return null;
}

/** Sanitize arbitrary buyer-facing text; use fallback when unsafe or empty. */
export function sanitizeBuyerVisibleString(
  s: string | null | undefined,
  fallback: string | null = null,
): string | null {
  const safe = buyerSafeLineOrNull(s);
  if (safe) return safe;
  if (fallback == null) return null;
  const fb = fallback.trim();
  if (!fb || isBuyerUnsafeString(fb)) return null;
  return fb;
}
