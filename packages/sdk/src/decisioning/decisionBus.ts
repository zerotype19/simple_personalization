import type { ExperienceDecisionEnvelope } from "@si/shared";
import { experienceDecisionMeaningfullyChanged } from "./decisionDiff";

type AllCb = (envelope: ExperienceDecisionEnvelope) => void;
type SurfaceCb = (envelope: ExperienceDecisionEnvelope) => void;

export class DecisionBus {
  private subsAll = new Set<AllCb>();
  private subsSurface = new Map<string, Set<SurfaceCb>>();
  private last: ExperienceDecisionEnvelope | null = null;

  subscribeAll(cb: AllCb): () => void {
    this.subsAll.add(cb);
    if (this.last) cb(this.last);
    return () => {
      this.subsAll.delete(cb);
    };
  }

  subscribeToDecision(surfaceId: string, cb: SurfaceCb): () => void {
    let set = this.subsSurface.get(surfaceId);
    if (!set) {
      set = new Set();
      this.subsSurface.set(surfaceId, set);
    }
    set.add(cb);
    if (this.last) cb(this.last);
    return () => {
      set!.delete(cb);
      if (set!.size === 0) this.subsSurface.delete(surfaceId);
    };
  }

  notifyIfChanged(envelope: ExperienceDecisionEnvelope): boolean {
    if (!experienceDecisionMeaningfullyChanged(this.last, envelope)) return false;
    this.last = structuredClone(envelope);
    const snap = structuredClone(envelope);
    for (const cb of this.subsAll) cb(snap);
    for (const [, set] of this.subsSurface) {
      for (const cb of set) cb(snap);
    }
    return true;
  }

  getLast(): ExperienceDecisionEnvelope | null {
    return this.last ? structuredClone(this.last) : null;
  }

  reset(): void {
    this.last = null;
  }
}
