import type {
  ActivationPayloadEnvelope,
  ExperienceDecision,
  ExperienceDecisionEnvelope,
  ExperienceProgressionMemory,
  PersonalizationSignal,
  SDKConfig,
  SessionProfile,
} from "@si/shared";
import { isAutoSiteVertical } from "@si/shared";
import { computeConceptAffinityDetailed } from "@si/shared/contextBrain";
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
  classifyVertical,
  runSiteScan,
} from "./siteIntelligence";
import { buildActivationPayload, buildPersonalizationSignal } from "./siteSemantics/activationPayload";
import { buildBehaviorSnapshot } from "./siteSemantics/behaviorSnapshot";
import { appendIntelMilestones } from "./sessionIntel";
import { inferActivationOpportunity } from "./siteSemantics/conversionArchitecture";
import { runSiteSemantics } from "./siteSemantics/semanticScanner";
import { buildSiteEnvironment, humanGenericPageLabel } from "./siteEnvironment";
import { pushExperienceDecisionToAdobeDataLayer as pushExpDecisionAdobe } from "./destinations/adobeDataLayerDestination";
import { dispatchExperienceDecisionCustomEvent } from "./destinations/customEventDestination";
import {
  dispatchSiDecisionSuppressed,
  dispatchSiDecisionTransition,
} from "./destinations/decisionRuntimeEvents";
import { pushExperienceDecisionToDataLayer as pushExpDecisionDataLayer } from "./destinations/dataLayerDestination";
import { pushExperienceDecisionToOptimizely as pushExpDecisionOptimizely } from "./destinations/optimizelyDestination";
import { buildExperienceDecisionEnvelope } from "./decisioning/buildExperienceDecisionEnvelope";
import { inferDecisionTransitionReasons } from "./decisioning/replay/inferTransitionReasons";
import {
  bumpNavigationTickIfPathChanged,
  emptyExperienceProgressionMemory,
  mergeExperienceProgressionMemory,
} from "./decisioning/progressionMemory";
import { DecisionBus } from "./decisioning/decisionBus";
import { safeGetJSON, safeRemove, safeSetJSON } from "./storage";

export interface BootOptions {
  /** Absolute URL to fetch JSON config (GET). */
  configUrl?: string | null;
  /** Absolute URL for batched analytics (POST). */
  collectUrl?: string | null;
  /** Force-enable inspector even if remote config disables it. */
  forceInspector?: boolean;
  /**
   * Public site id from `data-si-site` on the embed script — sent as `site_id` on `/collect`
   * (resolved server-side; optional when `snippetKey` is set).
   */
  siteId?: string | null;
  /**
   * Public install token from `data-si-key` / `data-si-snippet-key` — sent as `snippet_key` on `/collect`.
   * Prefer this for broad customer installs; Worker resolves tenant/site and treats `site_id` as display-only
   * when both are present (must match the key’s site).
   */
  snippetKey?: string | null;
  /**
   * `observe_only` builds envelopes with null primary (staging / trust).
   * Default `emit` runs normal browser-local decisioning.
   */
  experienceDecisionMode?: "emit" | "observe_only";
}

const SI_EXP_PROGRESSION_KEY = "si:exp_progression";

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
  private lastPersonalizationJson = "";
  private decisionBus = new DecisionBus();
  private lastExperienceEnvelope: ExperienceDecisionEnvelope | null = null;
  private slotDecisions: Record<string, ExperienceDecision> = {};
  private experienceProgression: ExperienceProgressionMemory = emptyExperienceProgressionMemory();
  private lastProgressionPersistAt = 0;
  /** Profile snapshot before the latest decision tick (for transition events). */
  private profileBeforeDecisionTick: SessionProfile | null = null;
  /** Rolling anonymous frames for inspector replay (no persistence). */
  private decisionReplayBuffer: SessionProfile[] = [];

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
    this.hydrateExperienceProgressionFromStorage();

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
      siteId: this.opts.siteId ?? null,
      snippetKey: this.opts.snippetKey ?? null,
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
    this.decisionBus.reset();
    this.lastExperienceEnvelope = null;
    this.slotDecisions = {};
    this.profileBeforeDecisionTick = null;
    this.decisionReplayBuffer = [];
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

  getActivationPayload(): ActivationPayloadEnvelope {
    return structuredClone(this.profile.activation_payload);
  }

  getPersonalizationSignal(): PersonalizationSignal {
    return structuredClone(this.profile.personalization_signal);
  }

  pushToDataLayer(): void {
    const payload = this.getActivationPayload();
    const w = window as unknown as { dataLayer?: unknown[] };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push(payload);
  }

  pushToAdobeDataLayer(): void {
    const payload = this.getActivationPayload();
    const w = window as unknown as { adobeDataLayer?: unknown[] };
    w.adobeDataLayer = w.adobeDataLayer || [];
    w.adobeDataLayer.push(payload);
  }

  pushToOptimizely(): void {
    const payload = this.getActivationPayload();
    const w = window as unknown as { optimizely?: unknown[] };
    w.optimizely = w.optimizely || [];
    (w.optimizely as unknown[]).push({
      type: "event",
      eventName: payload.event,
      tags: payload.si,
    });
  }

  /** Alias for demos/docs — same as {@link pushToDataLayer}. */
  pushPersonalizationSignalToDataLayer(): void {
    this.pushToDataLayer();
  }

  /** Alias for demos/docs — same as {@link pushToAdobeDataLayer}. */
  pushPersonalizationSignalToAdobeDataLayer(): void {
    this.pushToAdobeDataLayer();
  }

  /** Alias for demos/docs — same as {@link pushToOptimizely}. */
  pushPersonalizationSignalToOptimizely(): void {
    this.pushToOptimizely();
  }

  /**
   * Push current activation envelope to GTM/dataLayer, Adobe, and Optimizely, then dispatch
   * `si:personalization-signal` and `si:activation` (useful for one-shot integration wiring).
   */
  pushPersonalizationSignalAll(): void {
    this.pushToDataLayer();
    this.pushToAdobeDataLayer();
    this.pushToOptimizely();
    const detail = this.getActivationPayload();
    try {
      window.dispatchEvent(new CustomEvent("si:personalization-signal", { detail }));
      window.dispatchEvent(new CustomEvent("si:activation", { detail }));
    } catch {
      /* ignore */
    }
  }

  getExperienceDecisionEnvelope(): ExperienceDecisionEnvelope {
    if (!this.lastExperienceEnvelope) {
      return {
        event: "si_experience_decision",
        generated_at: Date.now(),
        session_id: this.profile.session_id,
        primary_decision: null,
        secondary_decisions: [],
        suppression_summary: "Experience decisions warm up after the first profile tick.",
      };
    }
    return structuredClone(this.lastExperienceEnvelope);
  }

  /** Last ~16 profile snapshots when the experience envelope meaningfully changed (inspector replay). */
  getDecisionReplayFrames(): SessionProfile[] {
    return this.decisionReplayBuffer.map((p) => structuredClone(p));
  }

  getExperienceDecision(surfaceId: string): ExperienceDecision {
    const hit = this.slotDecisions[surfaceId];
    if (hit) return structuredClone(hit);
    return structuredClone({
      id: `none_${surfaceId}`,
      surface_id: surfaceId,
      action: "none",
      message_angle: "none",
      offer_type: "none",
      headline: "",
      body: "",
      cta_label: "",
      target_url_hint: "",
      timing: "immediate",
      friction: "low",
      priority: 0,
      confidence: 0,
      reason: ["surface_not_in_catalog_for_vertical"],
      evidence: [],
      ttl_seconds: 120,
      expires_at: Date.now() + 120_000,
      privacy_scope: "session_only",
      visitor_status: "anonymous",
    });
  }

  getAllExperienceDecisions(): ExperienceDecision[] {
    return Object.values(this.slotDecisions).map((d) => structuredClone(d));
  }

  subscribeToDecision(surfaceId: string, cb: (envelope: ExperienceDecisionEnvelope) => void): () => void {
    return this.decisionBus.subscribeToDecision(surfaceId, cb);
  }

  subscribeToAllDecisions(cb: (envelope: ExperienceDecisionEnvelope) => void): () => void {
    return this.decisionBus.subscribeAll(cb);
  }

  pushExperienceDecisionToDataLayer(): void {
    pushExpDecisionDataLayer(this.getExperienceDecisionEnvelope());
  }

  pushExperienceDecisionToAdobeDataLayer(): void {
    pushExpDecisionAdobe(this.getExperienceDecisionEnvelope());
  }

  pushExperienceDecisionToOptimizely(): void {
    pushExpDecisionOptimizely(this.getExperienceDecisionEnvelope());
  }

  private hydrateExperienceProgressionFromStorage(): void {
    const stored = safeGetJSON<{ session_id: string; memory: ExperienceProgressionMemory }>(SI_EXP_PROGRESSION_KEY);
    if (stored?.session_id === this.profile.session_id && stored.memory) {
      this.experienceProgression = mergeExperienceProgressionMemory(
        emptyExperienceProgressionMemory(),
        stored.memory,
      );
    } else {
      this.experienceProgression = emptyExperienceProgressionMemory();
    }
    this.profile.experience_progression = this.experienceProgression;
  }

  private persistExperienceProgressionThrottled(): void {
    const now = Date.now();
    if (now - this.lastProgressionPersistAt < 2000) return;
    this.lastProgressionPersistAt = now;
    safeSetJSON(SI_EXP_PROGRESSION_KEY, {
      session_id: this.profile.session_id,
      memory: { ...this.experienceProgression },
    });
  }

  private syncExperienceDecisions(): void {
    const prevProfile = this.profileBeforeDecisionTick;
    const prevEnv = this.lastExperienceEnvelope ? structuredClone(this.lastExperienceEnvelope) : null;

    if (typeof window !== "undefined") {
      bumpNavigationTickIfPathChanged(this.experienceProgression, window.location.pathname);
    }
    this.profile.experience_progression = this.experienceProgression;
    const { envelope, slotDecisions } = buildExperienceDecisionEnvelope(this.profile, {
      now: Date.now(),
      observeOnly: this.opts.experienceDecisionMode === "observe_only",
      progression: this.experienceProgression,
      recordProgression: true,
    });
    this.lastExperienceEnvelope = envelope;
    this.slotDecisions = slotDecisions;

    const progressionSnap = mergeExperienceProgressionMemory(emptyExperienceProgressionMemory(), this.experienceProgression);

    const changed = this.decisionBus.notifyIfChanged(envelope);
    if (changed) {
      dispatchExperienceDecisionCustomEvent(envelope);

      if (typeof window !== "undefined") {
        const reasons = inferDecisionTransitionReasons({
          prevProfile,
          nextProfile: this.profile,
          prevPrimary: prevEnv?.primary_decision ?? null,
          nextPrimary: envelope.primary_decision,
          prevProgression: prevProfile?.experience_progression ?? null,
          nextProgression: progressionSnap,
          holdbackReasonsNext: envelope.primary_decision ? [] : [envelope.suppression_summary ?? "no_primary"],
        });
        dispatchSiDecisionTransition({
          previous_envelope: prevEnv,
          next_envelope: envelope,
          transition_reasons: reasons,
          progression_stage: progressionSnap.escalation_stage,
          primary_timing_from: prevEnv?.primary_decision?.timing ?? null,
          primary_timing_to: envelope.primary_decision?.timing ?? null,
          primary_confidence_from: prevEnv?.primary_decision?.confidence ?? null,
          primary_confidence_to: envelope.primary_decision?.confidence ?? null,
        });
        if (!envelope.primary_decision && prevEnv?.primary_decision) {
          dispatchSiDecisionSuppressed({
            envelope,
            had_primary_before: true,
            suppression_summary: envelope.suppression_summary,
          });
        }
      }

      if (this.decisionReplayBuffer.length >= 16) this.decisionReplayBuffer.shift();
      this.decisionReplayBuffer.push(structuredClone(this.profile));
    }

    this.profileBeforeDecisionTick = structuredClone(this.profile);
    this.persistExperienceProgressionThrottled();
  }

  private maybeEmitActivationPayload(): void {
    const json = JSON.stringify(this.profile.personalization_signal);
    if (json === this.lastPersonalizationJson) return;
    this.lastPersonalizationJson = json;
    const detail = this.getActivationPayload();
    try {
      window.dispatchEvent(new CustomEvent("si:personalization-signal", { detail }));
      window.dispatchEvent(new CustomEvent("si:activation", { detail }));
    } catch {
      /* ignore */
    }
  }

  /**
   * Clears persisted session storage, starts a fresh session id, re-draws A/B assignment,
   * clears applied DOM treatments, and re-runs scoring — **without** a full page reload.
   */
  softResetSession(): void {
    safeRemove(SI_EXP_PROGRESSION_KEY);
    this.experienceProgression = emptyExperienceProgressionMemory();
    this.lastProgressionPersistAt = 0;
    resetProfile();
    clearTreatments();
    this.converted = false;
    this.conversionType = null;
    const ctx = inferPageContext();
    this.profile = loadOrCreateProfile(ctx.page_type);
    this.hydrateExperienceProgressionFromStorage();
    this.profile.experiment_assignment = assignExperiments(this.config.experiments, this.profile);
    this.lastContextUrl = null;
    this.lastPersonalizationJson = "";
    this.decisionBus.reset();
    this.lastExperienceEnvelope = null;
    this.slotDecisions = {};
    this.profileBeforeDecisionTick = null;
    this.decisionReplayBuffer = [];
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
      getExperienceDecisionEnvelope: () => this.getExperienceDecisionEnvelope(),
      getReplayFrames: () => this.getDecisionReplayFrames(),
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
    /** Pathname only — query churn should not create fake “new page” hops or duplicate journey rows. */
    const pathKey = window.location.pathname;
    const isNewPageContext = this.lastContextUrl !== pathKey;

    const scan = isNewPageContext ? runSiteScan() : this.profile.site_context.scan;
    const { vertical, confidence } = classifyVertical(scan, window.location.pathname);
    const ctx = inferPageContext({
      minimal: !isNewPageContext,
      vertical,
      scan,
    });

    const env = buildSiteEnvironment({
      pathname: window.location.pathname,
      scan,
      vertical,
      verticalConfidencePct: confidence,
      pageType: ctx.page_type,
    });
    this.profile.site_environment = env;

    this.profile.site_context = {
      domain: scan.domain,
      site_name: scan.site_name,
      vertical,
      vertical_confidence: confidence,
      page_kind: `${humanGenericPageLabel(env.page.generic_kind)} · ~${Math.round(env.page.confidence * 100)}%`,
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

    this.lastContextUrl = pathKey;

    recomputeScores(this.profile);
    const concept = computeConceptAffinityDetailed(vertical, scan, this.profile.category_affinity);
    this.profile.concept_affinity = concept.affinity;
    this.profile.concept_evidence = concept.evidence;

    const { matches } = runRules(this.config.rules, this.profile);
    const rec = chooseRecommendation(
      this.profile,
      matches.map((m) => m.recommendation),
    );
    this.profile.next_best_action = rec;

    this.profile.page_semantics = runSiteSemantics(scan, env, vertical);

    if (isNewPageContext) {
      const steps = this.profile.page_journey ?? [];
      steps.push({
        path: pathKey,
        generic_kind: env.page.generic_kind,
        title_snippet: scan.page_title ? scan.page_title.slice(0, 80) : null,
        t: Date.now(),
      });
      if (steps.length > 36) steps.splice(0, steps.length - 36);
      this.profile.page_journey = steps;
    }

    buildBehaviorSnapshot(this.profile);
    this.profile.activation_opportunity = inferActivationOpportunity({
      profile: this.profile,
      env,
      scan,
      semantics: this.profile.page_semantics,
    });
    appendIntelMilestones(this.profile, {
      isNewPageContext,
      pathname: pathKey,
      genericKind: env.page.generic_kind,
    });
    this.profile.personalization_signal = buildPersonalizationSignal(this.profile);
    this.profile.activation_payload = buildActivationPayload(this.profile);

    this.syncExperienceDecisions();

    // Re-assign experiments if none yet.
    if (!this.profile.experiment_assignment) {
      this.profile.experiment_assignment = assignExperiments(
        this.config.experiments,
        this.profile,
      );
    }

    clearTreatments();
    this.profile.active_treatments = [];

    if (this.personalizationEnabled && isAutoSiteVertical(this.profile.site_context.vertical)) {
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
    this.maybeEmitActivationPayload();
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
    "si:activation": CustomEvent<import("@si/shared").ActivationPayloadEnvelope>;
    "si:personalization-signal": CustomEvent<import("@si/shared").ActivationPayloadEnvelope>;
    "si:experience-decision": CustomEvent<import("@si/shared").ExperienceDecisionEnvelope>;
  }
}
