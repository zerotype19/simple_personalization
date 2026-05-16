import type {
  ActivationPayloadEnvelope,
  ExperienceDecision,
  ExperienceDecisionEnvelope,
  PersonalizationSignal,
} from "@si/shared";
import { SessionIntelRuntime, type BootOptions } from "./runtime";

let singleton: SessionIntelRuntime | null = null;

export type { BootOptions };
export type { ExperienceDecision, ExperienceDecisionEnvelope };
export { SessionIntelRuntime };

export async function boot(opts: BootOptions = {}): Promise<SessionIntelRuntime> {
  if (singleton) return singleton;
  const rt = new SessionIntelRuntime(opts);
  try {
    await rt.boot();
    singleton = rt;
    return rt;
  } catch (e) {
    singleton = null;
    throw e;
  }
}

export function destroy(): void {
  singleton?.destroy();
  singleton = null;
}

export function getState() {
  if (!singleton) throw new Error("SessionIntel not booted");
  return singleton.getState();
}

export function subscribe(cb: (p: import("@si/shared").SessionProfile) => void) {
  if (!singleton) throw new Error("SessionIntel not booted");
  return singleton.subscribe(cb);
}

export function markConversion(type?: string) {
  singleton?.markConversion(type);
}

/** Clear `si:session`, new anonymous session, new A/B draw, re-score — no page reload. */
export function softResetSession(): void {
  singleton?.softResetSession();
}

export function getActivationPayload(): ActivationPayloadEnvelope {
  if (!singleton) throw new Error("SessionIntel not booted");
  return singleton.getActivationPayload();
}

export function getPersonalizationSignal(): PersonalizationSignal {
  if (!singleton) throw new Error("SessionIntel not booted");
  return singleton.getPersonalizationSignal();
}

export function pushToDataLayer(): void {
  if (!singleton) throw new Error("SessionIntel not booted");
  singleton.pushToDataLayer();
}

export function pushToAdobeDataLayer(): void {
  if (!singleton) throw new Error("SessionIntel not booted");
  singleton.pushToAdobeDataLayer();
}

export function pushToOptimizely(): void {
  if (!singleton) throw new Error("SessionIntel not booted");
  singleton.pushToOptimizely();
}

export function pushPersonalizationSignalToDataLayer(): void {
  if (!singleton) throw new Error("SessionIntel not booted");
  singleton.pushPersonalizationSignalToDataLayer();
}

export function pushPersonalizationSignalToAdobeDataLayer(): void {
  if (!singleton) throw new Error("SessionIntel not booted");
  singleton.pushPersonalizationSignalToAdobeDataLayer();
}

export function pushPersonalizationSignalToOptimizely(): void {
  if (!singleton) throw new Error("SessionIntel not booted");
  singleton.pushPersonalizationSignalToOptimizely();
}

export function pushPersonalizationSignalAll(): void {
  if (!singleton) throw new Error("SessionIntel not booted");
  singleton.pushPersonalizationSignalAll();
}

export function getExperienceDecisionEnvelope(): ExperienceDecisionEnvelope {
  if (!singleton) throw new Error("SessionIntel not booted");
  return singleton.getExperienceDecisionEnvelope();
}

export function getExperienceDecision(surfaceId: string): ExperienceDecision {
  if (!singleton) throw new Error("SessionIntel not booted");
  return singleton.getExperienceDecision(surfaceId);
}

export function getAllExperienceDecisions(): ExperienceDecision[] {
  if (!singleton) throw new Error("SessionIntel not booted");
  return singleton.getAllExperienceDecisions();
}

export function subscribeToDecision(
  surfaceId: string,
  cb: (envelope: ExperienceDecisionEnvelope) => void,
): () => void {
  if (!singleton) throw new Error("SessionIntel not booted");
  return singleton.subscribeToDecision(surfaceId, cb);
}

export function subscribeToAllDecisions(cb: (envelope: ExperienceDecisionEnvelope) => void): () => void {
  if (!singleton) throw new Error("SessionIntel not booted");
  return singleton.subscribeToAllDecisions(cb);
}

export function pushExperienceDecisionToDataLayer(): void {
  if (!singleton) throw new Error("SessionIntel not booted");
  singleton.pushExperienceDecisionToDataLayer();
}

export function pushExperienceDecisionToAdobeDataLayer(): void {
  if (!singleton) throw new Error("SessionIntel not booted");
  singleton.pushExperienceDecisionToAdobeDataLayer();
}

export function pushExperienceDecisionToOptimizely(): void {
  if (!singleton) throw new Error("SessionIntel not booted");
  singleton.pushExperienceDecisionToOptimizely();
}

export { buildRuleContext, evaluateExpression } from "./rules";
export { DEFAULT_CONFIG } from "./defaults";
export { resetProfile, SI_SESSION_STORAGE_KEY } from "./session";
export { clearTreatments } from "./personalization";
export { computeClampedScores, mergeAffinityFromHits, recomputeScores } from "./scorer";
export {
  runDecisionReplay,
  buildOperatorSessionStory,
  inferDecisionTransitionReasons,
  replayHasSurfaceFlicker,
  replayHasRepeatedSurfaceSpam,
  replayEscalationJumpsLimited,
  replaySuppressionsHaveHoldbacks,
  replayTransitionsHaveReasons,
} from "./decisioning/replay";
export type {
  ReplayResult,
  ReplayOptions,
  ReplayFrameResult,
  DecisionTransition,
  DecisionTransitionReason,
} from "./decisioning/replay";
export { diffExperienceDecision, experienceDecisionMeaningfullyChanged } from "./decisioning/decisionDiff";
export type { ExperienceDecisionDiff } from "./decisioning/decisionDiff";
export {
  buildExperienceDecisionEnvelopeWithDiagnostics,
  type ExperienceDecisionFrameDiagnostics,
} from "./decisioning/buildExperienceDecisionEnvelope";
export {
  dispatchSiDecisionTransition,
  dispatchSiDecisionSuppressed,
  dispatchSiDecisionReplayed,
  type DecisionTransitionEventDetail,
  type DecisionSuppressedEventDetail,
  type DecisionReplayedEventDetail,
} from "./destinations/decisionRuntimeEvents";
export { buildFixtureProfile } from "./decisioning/fixtures/buildFixtureProfile";
export type { FixtureSessionInput } from "./decisioning/fixtures/types";
export {
  BUYER_RUNTIME_SIGNAL_STILL_GATHERING,
  buyerSafeLineOrNull,
  filterBuyerSafeLines,
  isBuyerUnsafeString,
  mapProgressionNoteForBuyer,
  sanitizeBuyerVisibleString,
} from "./decisioning/buyerCopySafety";
export {
  buildBuyerInspectorView,
  buyerInspectorNarrativeCredibilityIssue,
  joinBuyerInspectorNarrativeForTests,
} from "./decisioning/buyerInspectorNarrative";
export type { BuyerInspectorView } from "./decisioning/buyerInspectorNarrative";
export {
  buildEscalationUnlockCondition,
  buildRuntimeEscalateIfSentence,
  buildRuntimeStayingSentence,
  buildStateReason,
  formatEscalationPostureForBuyer,
  getEscalationPosture,
  getExperienceState,
  getStateProgressionLadder,
  ladderLabel,
  ladderLabelToState,
  describeLatestReplayTransition,
  EXPERIENCE_LADDER_LABELS,
} from "./decisioning/experienceStatePresentation";
export type { ExperienceLadderState } from "./decisioning/experienceStatePresentation";

export {
  classifyCommercialAction,
  classifyCtaElement,
  classifyFormIntent,
  classifyPageRole,
  inferCommercialBlockers,
  inferJourneyMomentum,
  updateCommercialIntentMemory,
  buildBuyerCommercialIntentRead,
} from "./commercialIntent";
export type { ClassifyCommercialActionInput } from "./commercialIntent";

export {
  addMapping,
  attachDecisionsToRegions,
  buildCssSelector,
  buildSurfaceDecisionPreview,
  buildSurfaceMapState,
  clearMappingsForPage,
  destroySurfaceMapperOverlay,
  dispatchSurfaceMapUpdated,
  discoverSurfaceRegions,
  FALLBACK_SURFACE_IDS,
  getKnownSurfaceIdsForVertical,
  getPageMappingKey,
  isOverlayEnabled,
  loadMappingsForPage,
  saveMappingsForPage,
  setOverlayEnabled,
  SURFACE_MAPPINGS_STORAGE_KEY,
  updateSurfaceMapperOverlay,
  type DiscoverOptions,
  type SurfaceDiscoverLayoutStub,
} from "./surfaceMapper";
export type {
  SurfaceDecisionPreview,
  SurfaceMapState,
  SurfaceMapping,
  SurfaceRegion,
  SurfaceRegionBounds,
  SurfaceRegionSource,
} from "./surfaceMapper";
