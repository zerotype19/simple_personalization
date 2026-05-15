import { useEffect, useState } from "react";
import {
  getExperienceDecision,
  subscribeToDecision,
  type ExperienceDecision,
} from "@si/sdk";

/**
 * Live slot decision for a catalog surface_id. Requires `boot()` to have completed.
 */
export function useOptiviewDecision(surfaceId: string): ExperienceDecision | null {
  const read = () => {
    try {
      return getExperienceDecision(surfaceId);
    } catch {
      return null;
    }
  };
  const [decision, setDecision] = useState<ExperienceDecision | null>(() => read());

  useEffect(() => {
    let off: (() => void) | undefined;
    try {
      off = subscribeToDecision(surfaceId, () => {
        setDecision(getExperienceDecision(surfaceId));
      });
    } catch {
      /* not booted */
    }
    return () => off?.();
  }, [surfaceId]);

  return decision;
}
