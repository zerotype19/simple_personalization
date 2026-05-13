import type { SDKConfig, SessionProfile } from "@si/shared";
import { Batcher } from "./batcher";
import { DEFAULT_CONFIG } from "./defaults";
import { assignExperiments } from "./experiments";
import { mountInspector } from "./inspector";
import { startObserver } from "./observer";
import { applyTreatment, clearTreatments, selectTreatments } from "./personalization";
import { chooseRecommendation } from "./recommender";
import { recomputeScores } from "./scorer";
import { runRules } from "./rules";
import { loadOrCreateProfile, persistProfile, resetProfile } from "./session";
import { logSiDebug, urlHasSiDebug } from "./si-debug";
import { inferPageContext } from "./site";
import {
  buildDynamicSignals,
  classifyPageKind,
  classifyVertical,
  runSiteScan,
} from "./siteIntelligence";

export interface BootOptions {
  /** Absolute URL to fetch JSON config (GET). */
  configUrl?: string | null;
  /** Absolute URL for batched analytics (POST). */
  collectUrl?: string | null;
  /** Force-enable inspector even if remote config disables it. */
  forceInspector?: boolean;
}

export class SessionIntelRuntime {
  private profile!: SessionProfile;
  private config: SDKConfig = structuredClone(DEFAULT_CONFIG);
  private listeners = new Set<(p: SessionProfile) => void>();
  private stopObserver: (() => void) | null = null;
  private batcher: Batcher | null = null;
  private personalizationEnabled = true;
  private stopInspector: (() => void) | null = null;
  private converted = false;
  private conversionType: string | null = null;
  private lastContextUrl: string | null = null;

  constructor(private opts: BootOptions = {}) {}

  async boot(): Promise<void> {
    logSiDebug("boot", {
      forceInspectorOpt: !!this.opts.forceInspector,
      siDebug: urlHasSiDebug(),
      hostname: typeof window !== "undefined" ? window.location.hostname : "",
    });
    await this.loadConfig();
    const ctx = inferPageContext();
    this.profile = loadOrCreateProfile(ctx.page_type);

    this.profile.experiment_assignment = assignExperiments(
      this.config.experiments,
      this.profile,
    );

    this.lastContextUrl = null;
    this.tick();

    this.stopObserver = startObserver(
      () => inferPageContext({ minimal: true }).page_type,
      (mut) => {
        mut(this.profile);
        this.tick();
      },
    );

    this.batcher = new Batcher({
      endpoint: this.opts.collectUrl ?? this.config.collect_endpoint,
      getProfile: () => this.profile,
      isConverted: () => this.converted,
      conversionType: () => this.conversionType,
    });
    this.batcher.start();

    this.mountInspectorIfNeeded();

    // Expose conversion hook for demo forms.
    window.addEventListener("si:conversion", ((e: CustomEvent) => {
      this.markConversion(e.detail?.type ?? "lead");
    }) as EventListener);
  }

  destroy(): void {
    this.stopObserver?.();
    this.stopObserver = null;
    this.batcher?.stop();
    this.batcher = null;
    this.stopInspector?.();
    this.stopInspector = null;
  }

  getState(): SessionProfile {
    return structuredClone(this.profile);
  }

  subscribe(cb: (p: SessionProfile) => void): () => void {
    this.listeners.add(cb);
    cb(this.getState());
    return () => this.listeners.delete(cb);
  }

  markConversion(type = "lead"): void {
    this.converted = true;
    this.conversionType = type;
    void this.batcher?.flush("conversion");
  }

  /**
   * Clears persisted session storage, starts a fresh session id, re-draws A/B assignment,
   * clears applied DOM treatments, and re-runs scoring — **without** a full page reload.
   */
  softResetSession(): void {
    resetProfile();
    clearTreatments();
    this.converted = false;
    this.conversionType = null;
    const ctx = inferPageContext();
    this.profile = loadOrCreateProfile(ctx.page_type);
    this.profile.experiment_assignment = assignExperiments(this.config.experiments, this.profile);
    this.lastContextUrl = null;
    this.tick();
  }

  private inspectorWanted(): boolean {
    return (
      !!this.opts.forceInspector ||
      this.config.inspector_enabled === true ||
      (typeof window !== "undefined" && window.location.hostname === "localhost") ||
      urlHasSiDebug()
    );
  }

  private mountInspectorIfNeeded(): void {
    if (this.stopInspector != null) return;
    if (!this.inspectorWanted()) return;
    logSiDebug("mounting inspector");
    this.stopInspector = mountInspector({
      getState: () => this.getState(),
      subscribe: (cb) => this.subscribe(cb),
      onSoftReset: () => {
        this.softResetSession();
      },
      onReset: () => {
        resetProfile();
        clearTreatments();
        window.location.reload();
      },
      onTogglePersonalization: (enabled) => {
        this.personalizationEnabled = enabled;
        this.tick();
      },
      onForcePersona: (persona) => {
        this.profile.persona = persona;
        this.tick();
      },
      getPersonalizationEnabled: () => this.personalizationEnabled,
    });
  }

  private emit(): void {
    const snap = this.getState();
    this.listeners.forEach((l) => l(snap));
  }

  private async loadConfig(): Promise<void> {
    const url = this.opts.configUrl ?? DEFAULT_CONFIG.config_endpoint;
    if (!url) {
      this.config = structuredClone(DEFAULT_CONFIG);
      return;
    }
    try {
      const res = await fetch(url, { credentials: "omit" });
      if (!res.ok) throw new Error(String(res.status));
      const remote = (await res.json()) as Partial<SDKConfig>;
      this.config = deepMerge(structuredClone(DEFAULT_CONFIG), remote);
    } catch {
      this.config = structuredClone(DEFAULT_CONFIG);
    }
  }

  private tick(): void {
    const urlNow = window.location.pathname + window.location.search;
    const isNewPageContext = this.lastContextUrl !== urlNow;

    const scan = isNewPageContext ? runSiteScan() : this.profile.site_context.scan;
    const { vertical, confidence } = classifyVertical(scan, window.location.pathname);
    const ctx = inferPageContext({
      minimal: !isNewPageContext,
      vertical,
      scan,
    });

    this.profile.site_context = {
      domain: scan.domain,
      site_name: scan.site_name,
      vertical,
      vertical_confidence: confidence,
      page_kind: classifyPageKind(window.location.pathname, scan, ctx.page_type),
      scan,
    };
    this.profile.page_type = ctx.page_type;
    this.profile.dynamic_signals = buildDynamicSignals(vertical, this.profile.signals, scan);

    if (isNewPageContext) {
      // Decay prior page keyword mass so a later sedan VDP can overtake an early SUV browse.
      if (this.lastContextUrl != null) {
        const decay = 0.84;
        for (const key of Object.keys(this.profile.signals.category_hits)) {
          const v = this.profile.signals.category_hits[key]!;
          const next = Math.floor(v * decay);
          if (next <= 0) delete this.profile.signals.category_hits[key];
          else this.profile.signals.category_hits[key] = next;
        }
      }
      for (const [k, v] of Object.entries(ctx.category_hits)) {
        if (v <= 0) continue;
        this.profile.signals.category_hits[k] = (this.profile.signals.category_hits[k] ?? 0) + v;
      }
    }

    this.lastContextUrl = ctx.url;

    recomputeScores(this.profile);

    const { matches } = runRules(this.config.rules, this.profile);
    const rec = chooseRecommendation(
      this.profile,
      matches.map((m) => m.recommendation),
    );
    this.profile.next_best_action = rec;

    // Re-assign experiments if none yet.
    if (!this.profile.experiment_assignment) {
      this.profile.experiment_assignment = assignExperiments(
        this.config.experiments,
        this.profile,
      );
    }

    clearTreatments();
    this.profile.active_treatments = [];

    if (this.personalizationEnabled && this.profile.site_context.vertical === "auto_retail") {
      const picks = selectTreatments(this.config.treatments, this.profile);
      for (const pick of picks) {
        const def = this.config.treatments.find((t) => t.id === pick.id);
        if (!def) continue;
        const applied = applyTreatment(def, pick.source);
        if (applied.applied_slots.length) {
          this.profile.active_treatments.push(applied);
        }
      }
    }

    persistProfile(this.profile);
    this.emit();
    this.mountInspectorIfNeeded();
  }
}

function deepMerge<T extends Record<string, any>>(base: T, patch: Partial<T>): T {
  for (const key of Object.keys(patch)) {
    const pv = patch[key as keyof T];
    if (pv === undefined) continue;
    const bv = base[key as keyof T];
    if (Array.isArray(pv)) {
      (base as any)[key] = pv;
    } else if (pv && typeof pv === "object" && !Array.isArray(pv)) {
      (base as any)[key] = deepMerge(
        (bv && typeof bv === "object" ? bv : {}) as any,
        pv as any,
      );
    } else {
      (base as any)[key] = pv;
    }
  }
  return base;
}

declare global {
  interface WindowEventMap {
    "si:conversion": CustomEvent<{ type?: string }>;
  }
}
