import type { ExperienceDecisionEnvelope, SessionProfile } from "@si/shared";
import {
  buildBuyerInspectorView,
  type BuyerInspectorView,
} from "./decisioning/buyerInspectorNarrative";
import { buildExperienceOperatorNarrative, buildSessionProgressionNarrative } from "./decisioning/experienceInspectorNarrative";
import { runDecisionReplay } from "./decisioning/replay/runDecisionReplay";
import type { ReplayResult } from "./decisioning/replay/types";
import { buildOperatorSessionStory } from "./decisioning/replay/sessionStory";
import { conceptSignalLabel } from "@si/shared/contextBrain";
import { demoLiftPreviewCopy } from "@si/shared/demoMetrics";
import { isAutoSiteVertical } from "@si/shared";
import INSPECTOR_PANEL_CSS from "./inspector-panel.txt";
import {
  buildExecutiveVisitorBriefing,
  curateIntelTimelineForInspector,
  synthesizedActivationRecommendation,
} from "./inspectorBriefing";
import { buildSafePersonalizationPlan } from "./contextBrain/safePersonalizationPlan";
import { archetypePersonasForVertical } from "./recommendation/archetypes";
import { buildInferenceCertaintyBands, describeConversionSurfaces } from "./recommendation/inferenceCertainty";
import { audienceForVertical, publicSiteTypeLabel } from "./siteIntelligence/publicLabels";
import { logSiDebug, urlHasSiDebug } from "./si-debug";
import {
  liveSignalSectionTitle,
  topicAffinitySectionTitle,
  verticalDisplayName,
} from "./siteIntelligence/panelLabelMapper";
import { humanGenericPageLabel, timelineHumanPageLabel } from "./siteEnvironment";
import { formatTimelineClock } from "./sessionIntel";
import { distinctPagesExploredCount } from "./sessionMetrics";
import {
  marketerArrivalSourceHeadline,
  marketerLikelyVisitorMindset,
  marketerPersonalizationImplication,
} from "./siteSemantics/acquisitionPanelCopy";
import { analyzeNavigationPattern } from "./siteSemantics/navigationPatternAnalyzer";

/** Set only in the hosted IIFE build (`SI_PUBLIC_INSPECTOR_CSS_URL`); empty in ESM. */
declare const __SI_EMBED_INSPECTOR_CSS_URL__: string;

export interface InspectorOptions {
  getState: () => SessionProfile;
  /** Experience decision runtime envelope (browser-local). */
  getExperienceDecisionEnvelope?: () => ExperienceDecisionEnvelope;
  /** Rolling snapshots when the envelope meaningfully changed (replay / inspector). */
  getReplayFrames?: () => SessionProfile[];
  subscribe: (cb: (p: SessionProfile) => void) => () => void;
  /** Clear `si:session` storage, new session id, re-roll A/B, re-apply — no reload. */
  onSoftReset: () => void;
  onReset: () => void;
  onTogglePersonalization: (enabled: boolean) => void;
  onForcePersona: (persona: string | null) => void;
  getPersonalizationEnabled: () => boolean;
}

function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

const INSPECTOR_MODE_STORAGE_KEY = "si:inspector_mode";

type InspectorPanelMode = "buyer" | "operator";

function getInspectorPanelMode(): InspectorPanelMode {
  try {
    const v = window.sessionStorage?.getItem(INSPECTOR_MODE_STORAGE_KEY);
    if (v === "buyer" || v === "operator") return v;
  } catch {
    /* storage blocked */
  }
  return urlHasSiDebug() ? "operator" : "buyer";
}

function setInspectorPanelMode(mode: InspectorPanelMode): void {
  try {
    window.sessionStorage?.setItem(INSPECTOR_MODE_STORAGE_KEY, mode);
  } catch {
    /* storage blocked */
  }
}

/** Buyer-facing judgment panel HTML (deterministic narrative layer). */
function formatBuyerInspectorHtml(view: BuyerInspectorView): string {
  const sp = view.statePresentation;
  const ladderRows = sp.ladder.steps
    .map((label, i) => {
      let cls = "si-ladder-step";
      if (i < sp.ladder.currentIndex) cls += " si-ladder-step--past";
      else if (i === sp.ladder.currentIndex) cls += " si-ladder-step--current";
      else cls += " si-ladder-step--future";
      return `<li class="${cls}">${escHtml(label)}</li>`;
    })
    .join("");

  const strongerWithheld =
    sp.strongerActionWithheld != null && sp.strongerActionWithheld.trim() !== ""
      ? `<div class="si-buyer-k">Why stronger action is withheld</div>
         <div class="si-buyer-v">${escHtml(sp.strongerActionWithheld)}</div>`
      : "";

  const why =
    view.whyBullets.length > 0
      ? `<ul class="si-reason si-buyer-list">${view.whyBullets.map((b) => `<li>${escHtml(b)}</li>`).join("")}</ul>`
      : `<p class="si-muted si-muted--block">Signals are still assembling a crisp rationale — keep browsing.</p>`;

  const withheld =
    view.withheld.length > 0
      ? `<ul class="si-reason si-buyer-withheld">${view.withheld.map((w) => `<li>${escHtml(w)}</li>`).join("")}</ul>`
      : `<p class="si-muted si-muted--block">No additional restraint notes on this tick — pacing looks appropriate.</p>`;

  const famBlock =
    view.families.primary || view.families.secondary
      ? `<div class="si-buyer-families">
          ${view.families.primary ? `<div><span class="si-buyer-fam-label">Primary guidance theme</span> <span class="si-buyer-fam-val">${escHtml(view.families.primary)}</span></div>` : ""}
          ${view.families.secondary ? `<div><span class="si-buyer-fam-label">Secondary theme</span> <span class="si-buyer-fam-val">${escHtml(view.families.secondary)}</span></div>` : ""}
        </div>`
      : "";

  const whatChangedBlock = view.whatChanged
    ? `<div class="si-card si-buyer-section">
        <h3>What changed</h3>
        <p class="si-buyer-lead">${escHtml(view.whatChanged)}</p>
      </div>`
    : "";

  return `<div class="si-buyer-stack">
    <div class="si-card si-buyer-section si-buyer-state-card">
      <h3>Runtime state</h3>
      <div class="si-buyer-kv si-buyer-kv--tight">
        <div class="si-buyer-k">Current state</div>
        <div class="si-buyer-v">${escHtml(sp.currentStateLabel)}</div>
        <div class="si-buyer-k">Escalation posture</div>
        <div class="si-buyer-v">${escHtml(sp.escalationPosture)}</div>
        <div class="si-buyer-k">Why this state</div>
        <div class="si-buyer-v">${escHtml(sp.whyThisState)}</div>
        <div class="si-buyer-k">What would move it forward</div>
        <div class="si-buyer-v">${escHtml(sp.whatWouldMoveForward)}</div>
        ${strongerWithheld}
      </div>
      <div class="si-buyer-state-ladder-wrap">
        <div class="si-muted si-muted--block si-buyer-ladder-caption">Progression ladder</div>
        <ol class="si-ladder">${ladderRows}</ol>
      </div>
    </div>
    <div class="si-card si-buyer-section si-card--hero">
      <h3>Current commercial read</h3>
      <p class="si-buyer-lead">${escHtml(view.commercialRead)}</p>
    </div>
    <div class="si-card si-buyer-section">
      <h3>Recommended next experience</h3>
      <div class="si-buyer-kv">
        <div class="si-buyer-k">Show</div>
        <div class="si-buyer-v">${escHtml(view.recommended.show)}</div>
        <div class="si-buyer-k">Surface</div>
        <div class="si-buyer-v">${escHtml(view.recommended.surface)}</div>
        <div class="si-buyer-k">Timing</div>
        <div class="si-buyer-v">${escHtml(view.recommended.timing)}</div>
        <div class="si-buyer-k">Escalation posture</div>
        <div class="si-buyer-v">${escHtml(view.recommended.escalationPosture)}</div>
      </div>
      ${famBlock}
    </div>
    <div class="si-card si-buyer-section">
      <h3>Why this recommendation</h3>
      ${why}
    </div>
    <div class="si-card si-buyer-section si-buyer-withhold-card">
      <h3>Why stronger escalation was withheld</h3>
      ${withheld}
    </div>
    ${whatChangedBlock}
    <div class="si-card si-card--privacy si-buyer-privacy">
      <h3>Privacy</h3>
      <p class="si-muted si-muted--block">Anonymous, first-party, in-session only — no fingerprinting or identity stitching.</p>
    </div>
  </div>`;
}

/** Keeps inspector JSON readable (avoids float artifacts like 0.8921999999999999). */
function roundJsonFloats(_key: string, value: unknown): unknown {
  if (typeof value === "number" && Number.isFinite(value) && !Number.isInteger(value)) {
    return Math.round(value * 100) / 100;
  }
  return value;
}

function formatActivationPayloadJson(profile: SessionProfile): string {
  return JSON.stringify(profile.activation_payload, roundJsonFloats, 2);
}

/**
 * Populate `el` from an HTML string without using live-document `innerHTML`
 * (Trusted Types / hardened pages often block third-party `innerHTML`).
 */
function replaceChildrenFromHtml(el: HTMLElement, html: string): void {
  const parsed = new DOMParser().parseFromString(html.trim(), "text/html");
  const frag = document.createDocumentFragment();
  for (const n of Array.from(parsed.body.childNodes)) frag.appendChild(n);
  el.replaceChildren(frag);
}

/** `…/si.js` → `…/si-inspector.css`, or baked `SI_PUBLIC_INSPECTOR_CSS_URL` for the hosted snippet. */
function resolveSiCompanionStylesheetHref(): string | null {
  const baked =
    typeof __SI_EMBED_INSPECTOR_CSS_URL__ === "string" ? __SI_EMBED_INSPECTOR_CSS_URL__.trim() : "";
  if (baked) return baked;
  if (typeof document === "undefined") return null;
  const scripts = document.querySelectorAll("script[src]");
  for (let i = 0; i < scripts.length; i++) {
    const el = scripts[i] as HTMLScriptElement;
    const src = el.src;
    if (!src || !/\/si\.js([?#]|$)/i.test(src)) continue;
    try {
      return new URL("si-inspector.css", src).href;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function installInspectorStyles(root: HTMLElement): { mode: "link" | "inline"; href: string | null } {
  const href = resolveSiCompanionStylesheetHref();
  if (href) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    root.prepend(link);
    return { mode: "link", href };
  }
  const style = document.createElement("style");
  style.textContent = INSPECTOR_PANEL_CSS;
  root.prepend(style);
  return { mode: "inline", href: null };
}

/**
 * Build launcher + panel with only DOM APIs (no `innerHTML`, no `DOMParser`).
 * SES `lockdown()` / Trusted Types on hosts often block HTML injection paths for third-party scripts.
 */
function appendInspectorShell(root: HTMLElement): void {
  const launcher = document.createElement("button");
  launcher.type = "button";
  launcher.id = "si-inspector-launcher";
  launcher.setAttribute("aria-label", "Toggle Optiview judgment panel");
  launcher.title = "Optiview";
  launcher.textContent = "SI";

  const panel = document.createElement("div");
  panel.id = "si-inspector-panel";
  panel.setAttribute("aria-hidden", "true");

  const header = document.createElement("div");
  header.id = "si-inspector-header";

  const headerMain = document.createElement("div");
  const h2 = document.createElement("h2");
  h2.textContent = "Optiview";

  const hint = document.createElement("div");
  hint.className = "si-muted";
  hint.append("Session judgment · Click ");
  const bSi = document.createElement("b");
  bSi.textContent = "SI";
  hint.append(bSi, " corner or ");
  const bWin = document.createElement("b");
  bWin.textContent = "Ctrl+Shift+`";
  hint.append(bWin, " / ");
  const bMac = document.createElement("b");
  bMac.textContent = "⌘+Shift+`";
  hint.append(bMac, " to toggle.");

  headerMain.append(h2, hint);

  const headerActions = document.createElement("div");
  headerActions.className = "si-header-actions";

  const modeBuyer = document.createElement("button");
  modeBuyer.type = "button";
  modeBuyer.id = "si-mode-buyer";
  modeBuyer.className = "si-mode-btn";
  modeBuyer.textContent = "Buyer view";
  modeBuyer.setAttribute("aria-pressed", "true");

  const modeOp = document.createElement("button");
  modeOp.type = "button";
  modeOp.id = "si-mode-operator";
  modeOp.className = "si-mode-btn";
  modeOp.textContent = "Operator view";
  modeOp.setAttribute("aria-pressed", "false");

  headerActions.append(modeBuyer, modeOp);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "si-btn";
  closeBtn.id = "si-close";
  closeBtn.textContent = "Close";

  header.append(headerMain, headerActions, closeBtn);

  const panelBody = document.createElement("div");
  panelBody.id = "si-inspector-body";

  panel.append(header, panelBody);
  root.append(launcher, panel);
}

export function mountInspector(opts: InspectorOptions): () => void {
  try {
    return mountInspectorImpl(opts);
  } catch (e) {
    console.error(
      "[Session Intelligence] inspector could not start (Trusted Types, CSP DOM sinks, or another embed error). Analytics may still run.",
      e,
    );
    return () => {};
  }
}

function mountInspectorImpl(opts: InspectorOptions): () => void {
  const root = document.createElement("div");
  root.id = "si-inspector-root";
  appendInspectorShell(root);
  const sheet = installInspectorStyles(root);
  logSiDebug("inspector styles installed", { mode: sheet.mode, companion: sheet.href });

  /** Async scripts in `<head>` often run before `document.body` exists; append after DOMContentLoaded. */
  let pendingDomAttach: (() => void) | null = null;
  const appendRootToDocument = () => {
    const host = document.body ?? document.documentElement;
    host.appendChild(root);
    logSiDebug("inspector root appended", { hasRoot: !!document.getElementById("si-inspector-root") });
  };
  if (document.body) {
    appendRootToDocument();
  } else {
    pendingDomAttach = appendRootToDocument;
    document.addEventListener("DOMContentLoaded", pendingDomAttach, { once: true });
  }

  const panel = root.querySelector("#si-inspector-panel") as HTMLElement;
  const body = root.querySelector("#si-inspector-body") as HTMLElement;
  const closeBtn = root.querySelector("#si-close") as HTMLButtonElement;
  const launcher = root.querySelector("#si-inspector-launcher") as HTMLButtonElement;
  const modeBuyerBtn = root.querySelector("#si-mode-buyer") as HTMLButtonElement;
  const modeOperatorBtn = root.querySelector("#si-mode-operator") as HTMLButtonElement;
  launcher.setAttribute("aria-expanded", "false");

  function syncInspectorModeChrome() {
    const m = getInspectorPanelMode();
    modeBuyerBtn.classList.toggle("si-mode-active", m === "buyer");
    modeOperatorBtn.classList.toggle("si-mode-active", m === "operator");
    modeBuyerBtn.setAttribute("aria-pressed", m === "buyer" ? "true" : "false");
    modeOperatorBtn.setAttribute("aria-pressed", m === "operator" ? "true" : "false");
  }

  let open = false;
  const toggle = () => {
    open = !open;
    panel.classList.toggle("open", open);
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    launcher.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) render();
  };

  const typingTarget = (t: EventTarget | null) => {
    if (!(t instanceof HTMLElement)) return false;
    if (t.isContentEditable) return true;
    const n = t.nodeName;
    if (n === "INPUT" || n === "TEXTAREA" || n === "SELECT") return true;
    return !!t.closest("input, textarea, select, [contenteditable='true']");
  };

  /** Chrome / Edge reserve Ctrl+Shift+D for “bookmark all tabs”; use backtick + optional SI launcher. */
  const keyHandler = (e: KeyboardEvent) => {
    if (typingTarget(e.target)) return;
    const mod = e.ctrlKey || e.metaKey;
    if (!mod || !e.shiftKey) return;
    const backtickish = e.code === "Backquote" || e.code === "IntlBackslash";
    if (!backtickish) return;
    e.preventDefault();
    e.stopPropagation();
    toggle();
  };
  window.addEventListener("keydown", keyHandler, true);
  closeBtn.addEventListener("click", toggle);
  launcher.addEventListener("click", (ev) => {
    ev.stopPropagation();
    toggle();
  });

  const unsub = opts.subscribe(() => {
    if (open) render();
  });

  function render() {
    const panelMode = getInspectorPanelMode();
    const p = opts.getState();
    const expEnv = opts.getExperienceDecisionEnvelope?.() ?? null;
    const primaryDecision = expEnv?.primary_decision;
    const replayFrames = opts.getReplayFrames?.() ?? [];
    const replayResult: ReplayResult | null =
      replayFrames.length >= 2 ? runDecisionReplay(replayFrames) : null;
    const buyerView = buildBuyerInspectorView(p, expEnv, replayResult);
    const buyerPanelHtml = formatBuyerInspectorHtml(buyerView);
    const sessionProgressionEsc =
      expEnv != null ? escHtml(buildSessionProgressionNarrative(p, expEnv)) : "";
    const nba = p.next_best_action;
    const exp = p.experiment_assignment;
    const persoOn = opts.getPersonalizationEnabled();
    const sc = p.site_context;
    const liftPreview = demoLiftPreviewCopy(sc.vertical);
    const safePlanLines = buildSafePersonalizationPlan(p).slice(0, 2);
    const isAuto = isAutoSiteVertical(sc.vertical);
    const env = p.site_environment;
    const pm = p.page_semantics;
    const ao = p.activation_opportunity;
    const sig = p.personalization_signal;
    const confWord =
      sc.vertical_confidence >= 72 ? "High" : sc.vertical_confidence >= 48 ? "Medium-high" : "Medium";
    const envSignals = escHtml(env.page.signals_used.join(" · ") || "—");
    const themes = sc.scan.content_themes.slice(0, 4).map(escHtml).join(", ") || "—";
    const termsPreview = sc.scan.top_terms.slice(0, 8).map(escHtml).join(", ") || "—";
    const showTopTermsRow = isAuto || urlHasSiDebug();
    const topTermsLabel = isAuto ? "Top terms (sample)" : "Top terms (debug sample)";
    const signalRows = Object.entries(p.dynamic_signals)
      .map(
        ([k, val]) =>
          `<div>${escHtml(k)}</div><div class="si-metric">${escHtml(String(val))}</div>`,
      )
      .join("");
    const conceptAff = p.concept_affinity ?? {};
    const affRowsAuto = Object.entries(p.category_affinity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(
        ([k, v]) =>
          `<div>${escHtml(k.replace(/_/g, " "))}</div><div class="si-metric">${(v * 100).toFixed(0)}%</div>`,
      )
      .join("");
    const affRowsConcept = Object.entries(conceptAff)
      .filter(([label]) => (p.concept_evidence?.[label] ?? []).length > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([label, score]) => {
        const band = conceptSignalLabel(score);
        const termsMatched = (p.concept_evidence?.[label] ?? []).join(", ");
        const bandLine = band ? `<div class="si-muted si-concept-band">${escHtml(band)}</div>` : "";
        return `<li class="si-concept-narrative"><div class="si-concept-name">${escHtml(label)}</div>${bandLine}<div class="si-muted si-concept-why">Why: ${escHtml(termsMatched)}</div></li>`;
      })
      .join("");
    const affinityBlock = isAuto
      ? `<div class="si-kv si-kv--tight">${affRowsAuto}</div>`
      : `<ul class="si-reason">${affRowsConcept}</ul>`;
    const affinityEmpty = isAuto
      ? Object.keys(p.category_affinity).length === 0
      : Object.keys(conceptAff).length === 0 || affRowsConcept.length === 0;
    const personaControlLabel = isAuto ? "Force shopper archetype (debug)" : "Force session archetype (debug)";
    const conceptCardTitle = isAuto ? topicAffinitySectionTitle(sc.vertical) : "Strongest inferred themes";

    const certainty = buildInferenceCertaintyBands(p);
    const surfaceList = describeConversionSurfaces(p);
    const howInferredLines = [
      `${verticalDisplayName(sc.vertical)} (${Math.round(sc.vertical_confidence)}% vertical confidence)`,
      env.page.signals_used.length
        ? `Page cues: ${env.page.signals_used.slice(0, 6).join(", ")}`
        : "Page structure cues are still thin",
      env.conversion.detected_elements.length
        ? `Conversion cues: ${env.conversion.detected_elements.join(", ")}`
        : "Few funnel-specific DOM cues detected",
      sc.scan.primary_ctas.length
        ? `Sample CTAs: ${sc.scan.primary_ctas.slice(0, 5).join(" · ")}`
        : p.signals.cta_clicks >= 1
          ? "Clicks logged — page scan may still show light conversion chrome in header/main."
          : pm.cta_layout_summary || "No strong conversion-oriented CTA detected yet.",
      sc.scan.content_themes.length ? `Themes: ${sc.scan.content_themes.slice(0, 5).join(", ")}` : null,
    ]
      .filter((x): x is string => !!x)
      .map(escHtml)
      .join("<br/>");

    const nbaSurfaceEsc = escHtml(surfaceList.join(", ") || "—");
    const nbaLevelEsc = nba?.recommended_treatment_level
      ? escHtml(nba.recommended_treatment_level.replace(/_/g, " "))
      : "—";
    const nbaSurfaceTargetEsc = nba?.recommended_surface
      ? escHtml(nba.recommended_surface.replace(/_/g, " "))
      : "—";
    const nbaObjectiveEsc = nba?.objective ? escHtml(nba.objective.replace(/_/g, " ")) : "—";

    const certaintyHigh = certainty.high.map((t) => `<li>${escHtml(t)}</li>`).join("") || "<li>—</li>";
    const certaintyMed = certainty.medium.map((t) => `<li>${escHtml(t)}</li>`).join("") || "<li>—</li>";
    const certaintyLow = certainty.low.map((t) => `<li>${escHtml(t)}</li>`).join("") || "<li>—</li>";

    const primaryPromiseEsc = escHtml(pm.primary_promise ?? env.object.object_name ?? "—");

    const bs = p.behavior_snapshot;
    const arrivalSourceFriendlyEsc = bs
      ? escHtml(
          marketerArrivalSourceHeadline(bs.traffic.channel_guess, bs.traffic.arrival_confidence_0_100),
        )
      : "—";
    const landingPathEsc = bs ? escHtml(bs.traffic.landing_path.slice(0, 120)) : "—";
    const utmLine =
      bs && (bs.traffic.utm_source || bs.traffic.utm_medium)
        ? escHtml(
            [bs.traffic.utm_source, bs.traffic.utm_medium, bs.traffic.utm_campaign].filter(Boolean).join(" · "),
          )
        : "—";
    const keywordThemesEsc =
      bs && bs.campaign_intent.keyword_themes.length
        ? escHtml(bs.campaign_intent.keyword_themes.slice(0, 8).join(", "))
        : "—";
    const urlQueryThemesEsc =
      bs && bs.traffic.query_themes.length ? escHtml(bs.traffic.query_themes.join(", ")) : "—";
    const acquisitionNarrEsc = bs ? escHtml(bs.traffic.acquisition_narrative) : "—";
    const acquisitionInterpEsc = bs?.traffic.acquisition_interpretation
      ? escHtml(bs.traffic.acquisition_interpretation)
      : "—";
    const arrivalConfPct = bs ? `${bs.traffic.arrival_confidence_0_100}%` : "—";
    const acqEvidenceUl =
      bs && bs.traffic.acquisition_evidence.length
        ? `<ul class="si-reason si-reason--tight">${bs.traffic.acquisition_evidence.map((x) => `<li>${escHtml(x)}</li>`).join("")}</ul>`
        : `<div class="si-muted">—</div>`;
    const entryPathFirst = p.page_journey?.[0]?.path ?? "/";
    const entryKindEsc = bs?.traffic.entry_page_kind
      ? escHtml(timelineHumanPageLabel(bs.traffic.entry_page_kind, entryPathFirst))
      : "—";
    const landPatternEsc = bs?.traffic.landing_pattern_summary
      ? escHtml(bs.traffic.landing_pattern_summary)
      : "—";
    const campaignAngleEsc = bs?.campaign_intent.campaign_angle ? escHtml(bs.campaign_intent.campaign_angle) : "—";
    const cluesEsc =
      bs && bs.campaign_intent.commercial_clues.length
        ? escHtml(bs.campaign_intent.commercial_clues.map((c) => c.replace(/_/g, " ")).join(" · "))
        : "—";
    const landingIntentConf = bs ? `${bs.campaign_intent.confidence_0_100}%` : "—";
    const refCatEsc = bs ? escHtml(bs.referrer.category.replace(/_/g, " ")) : "—";
    const refNarrEsc = bs ? escHtml(bs.referrer.narrative) : "—";
    const distinctPagesExplored = distinctPagesExploredCount(p);
    const pathSummaryRaw =
      p.page_journey && p.page_journey.length > 0
        ? analyzeNavigationPattern(p.page_journey, p.signals).path_summary
        : bs?.navigation.path_summary ?? "—";
    const pathSummaryEsc = bs ? escHtml(pathSummaryRaw) : "—";
    const journeyPatternEsc = bs ? escHtml(bs.navigation.journey_pattern.replace(/_/g, " ")) : "—";
    const journeyVelEsc = bs ? escHtml(bs.navigation.journey_velocity) : "—";
    const navFlags =
      bs &&
      [bs.navigation.comparison_behavior ? "comparison behavior" : null, bs.navigation.high_intent_transition ? "high-intent step" : null]
        .filter(Boolean)
        .join(" · ");
    const navFlagsEsc = bs && navFlags ? escHtml(navFlags) : "—";
    const engageLabelEsc = bs ? escHtml(bs.engagement_quality.label.replace(/_/g, " ")) : "—";
    const engageWhy =
      bs && bs.engagement_quality.rationale.length
        ? `<ul class="si-reason">${bs.engagement_quality.rationale.map((x) => `<li>${escHtml(x)}</li>`).join("")}</ul>`
        : `<div class="si-muted">—</div>`;
    const actScore = bs ? String(bs.activation_readiness.score_0_100) : "—";
    const actPostureEsc = bs ? escHtml(bs.activation_readiness.interruption_posture.replace(/_/g, " ")) : "—";
    const actWhy =
      bs && bs.activation_readiness.rationale.length
        ? `<ul class="si-reason">${bs.activation_readiness.rationale.map((x) => `<li>${escHtml(x)}</li>`).join("")}</ul>`
        : `<div class="si-muted">—</div>`;
    const commPhaseEsc = bs ? escHtml(bs.commercial_journey_phase.replace(/_/g, " ")) : "—";
    const cohortEsc = bs?.anonymous_similarity_hint ? escHtml(bs.anonymous_similarity_hint) : "—";
    const devEsc = bs
      ? escHtml(
          `${bs.device_context.coarse_device} · viewport ${bs.device_context.viewport_bucket} · local hour ${bs.device_context.hour_local} · ${bs.device_context.weekday ? "weekday" : "weekend"}`,
        )
      : "—";

    const rm = bs?.referral_model;
    const acqIntelMindsetEsc = bs
      ? escHtml(
          marketerLikelyVisitorMindset({
            channel: bs.traffic.channel_guess,
            acquisition_interpretation: bs.traffic.acquisition_interpretation,
          }),
        )
      : "—";
    const acqIntelImplicationEsc = bs
      ? escHtml(marketerPersonalizationImplication(bs.traffic.channel_guess, rm?.personalization_hint ?? null))
      : "—";
    const acqIntelPostureEsc = rm?.acquisition_posture ? escHtml(rm.acquisition_posture) : "—";
    const acqIntelStrategyEsc = rm ? escHtml(rm.acquisition_strategy.replace(/_/g, " ")) : "—";
    const acqIntelStageEsc = rm ? escHtml(rm.acquisition_stage.replace(/_/g, " ")) : "—";
    const acqIntelThemesEsc =
      rm && (rm.acquisition_themes.length || bs.campaign_intent.keyword_themes.length)
        ? escHtml(
            [...new Set([...rm.acquisition_themes, ...bs.campaign_intent.keyword_themes])].slice(0, 14).join(", "),
          )
        : "—";
    const acqIntelCreativeEsc = rm?.creative_interpretation ? escHtml(rm.creative_interpretation) : "—";
    const acqIntelConfPct = rm ? `${Math.round(rm.confidence_0_1 * 100)}%` : "—";
    const acqIntelRefHostEsc = bs?.referrer.host ? escHtml(bs.referrer.host) : "—";
    const acqIntelEvidenceUl =
      rm && rm.evidence.length
        ? `<ul class="si-reason si-reason--tight">${rm.evidence.map((x) => `<li>${escHtml(x)}</li>`).join("")}</ul>`
        : `<div class="si-muted">—</div>`;

    const acqRowReferrer = bs?.referrer.host
      ? `<div>Referrer host</div><div class="si-muted">${acqIntelRefHostEsc}</div>`
      : "";
    const acqRowPosture = rm?.acquisition_posture
      ? `<div>Platform / source posture</div><div class="si-muted si-metric--break">${acqIntelPostureEsc}</div>`
      : "";
    const acqRowThemes =
      rm && (rm.acquisition_themes.length > 0 || bs.campaign_intent.keyword_themes.length > 0)
        ? `<div>Theme blend (URL + campaign)</div><div class="si-muted si-metric--break">${acqIntelThemesEsc}</div>`
        : "";
    const acqRowCreative = rm?.creative_interpretation
      ? `<div>Creative interpretation</div><div class="si-muted si-metric--break">${acqIntelCreativeEsc}</div>`
      : "";
    const hasAcquisitionInterpretation = Boolean(bs?.traffic.acquisition_interpretation?.trim());
    const acqRowMindset =
      bs && !hasAcquisitionInterpretation
        ? `<div>Likely visitor mindset</div><div class="si-muted si-metric--break">${acqIntelMindsetEsc}</div>`
        : "";

    const acquisitionIntelHtml = bs
      ? `<div class="si-card">
        <h3>Acquisition intelligence</h3>
        <div class="si-kv">
          <div>Arrival source</div><div class="si-metric">${arrivalSourceFriendlyEsc}</div>
          ${acqRowMindset}
          <div>Personalization implication</div><div class="si-muted si-metric--break">${acqIntelImplicationEsc}</div>
          <div class="si-muted si-muted--mb6" style="grid-column:1/-1;margin-top:8px">Supporting signals</div>
          ${acqRowReferrer}
          ${acqRowPosture}
          ${rm ? `<div>Acquisition stage</div><div class="si-metric">${acqIntelStageEsc}</div>` : ""}
          ${rm ? `<div>Campaign / strategy read</div><div class="si-muted si-metric--break">${acqIntelStrategyEsc}</div>` : ""}
          ${acqRowThemes}
          ${acqRowCreative}
          ${rm ? `<div>Interpretation confidence</div><div class="si-metric">${escHtml(acqIntelConfPct)}</div>` : ""}
          <div class="si-muted si-muted--mb6" style="grid-column:1/-1;margin-top:4px">Evidence</div>
          <div style="grid-column:1/-1">${acqIntelEvidenceUl}</div>
        </div>
      </div>`
      : "";

    const trafficRowUtm =
      bs && utmLine !== "—" ? `<div>UTM trail</div><div class="si-muted si-metric--break">${utmLine}</div>` : "";
    const trafficRowQueryThemes =
      bs && bs.traffic.query_themes.length > 0
        ? `<div>URL query themes (privacy-safe)</div><div class="si-muted">${urlQueryThemesEsc}</div>`
        : "";
    const trafficRowKeywords =
      bs && bs.campaign_intent.keyword_themes.length > 0
        ? `<div>Keyword themes</div><div class="si-muted">${keywordThemesEsc}</div>`
        : "";
    const trafficRowClues =
      bs && bs.campaign_intent.commercial_clues.length > 0
        ? `<div>Commercial clues</div><div class="si-muted">${cluesEsc}</div>`
        : "";
    const trafficRowInterp =
      bs?.traffic.acquisition_interpretation?.trim()
        ? `<div>Acquisition interpretation</div><div class="si-muted si-metric--break">${acquisitionInterpEsc}</div>`
        : "";

    const trafficIntelHtml = bs
      ? `<div class="si-card">
        <h3>Traffic &amp; acquisition</h3>
        <div class="si-kv">
          <div>Arrival source</div><div class="si-metric">${arrivalSourceFriendlyEsc}</div>
          <div>Arrival confidence</div><div class="si-metric">${escHtml(arrivalConfPct)}</div>
          <div>Acquisition narrative</div><div class="si-muted si-metric--break">${acquisitionNarrEsc}</div>
          ${trafficRowInterp}
          <div>First-touch page kind</div><div class="si-metric">${entryKindEsc}</div>
          <div>Landing pattern</div><div class="si-muted si-metric--break">${landPatternEsc}</div>
          <div class="si-muted si-muted--mb6" style="grid-column:1/-1;margin-top:4px">Acquisition evidence</div>
          <div style="grid-column:1/-1">${acqEvidenceUl}</div>
          ${trafficRowQueryThemes}
          <div>Landing URL (redacted query)</div><div class="si-muted si-metric--break">${landingPathEsc}</div>
          ${trafficRowUtm}
          <div>Campaign angle</div><div class="si-metric">${campaignAngleEsc}</div>
          ${trafficRowKeywords}
          ${trafficRowClues}
          <div>Landing intent confidence</div><div class="si-metric">${escHtml(landingIntentConf)}</div>
          <div>Referrer category</div><div class="si-metric">${refCatEsc}</div>
          <div>Referrer read</div><div class="si-muted si-metric--break">${refNarrEsc}</div>
        </div>
      </div>`
      : "";

    const journeyDiagnosticsHtml = bs
      ? `<div class="si-card">
        <h3>Journey diagnostics</h3>
        <div class="si-kv">
          <div>Journey pattern</div><div class="si-metric">${journeyPatternEsc}</div>
          <div>Journey velocity</div><div class="si-metric">${journeyVelEsc}</div>
          <div>Navigation flags</div><div class="si-muted">${navFlagsEsc}</div>
          <div>Device context</div><div class="si-muted">${devEsc}</div>
          <div>Journey stage (signals)</div><div><span class="si-pill">${escHtml(p.journey_stage)}</span></div>
          <div>Distinct pages explored</div><div class="si-metric">${distinctPagesExplored}</div>
          ${
            urlHasSiDebug()
              ? `<div>Route transitions counted (debug)</div><div class="si-muted">${p.signals.pages_viewed}</div>`
              : ""
          }
          <div>Intent · urgency · engagement</div><div class="si-metric">${p.intent_score} · ${p.urgency_score} · ${p.engagement_score}</div>
        </div>
        <div class="si-muted si-muted--mb6 si-kv-after">Why engagement quality</div>
        ${engageWhy}
        <div class="si-muted si-muted--mb6 si-kv-after">Why activation readiness</div>
        ${actWhy}
        ${
          bs.anonymous_similarity_hint?.trim()
            ? `<div class="si-muted si-muted--mb6 si-kv-after">Anonymous cohort hint (same-session patterns only)</div>
        <p class="si-muted si-muted--block">${cohortEsc}</p>`
            : ""
        }
      </div>`
      : "";

    const integrationSnippet = expEnv
      ? escHtml(
          JSON.stringify(
            {
              event: expEnv.event,
              session_id: expEnv.session_id,
              primary_surface: primaryDecision?.surface_id ?? null,
              timing: primaryDecision?.timing ?? null,
              confidence: primaryDecision?.confidence ?? null,
              suppression_summary: expEnv.suppression_summary ?? null,
            },
            roundJsonFloats,
            2,
          ),
        )
      : "";

    const operatorNarrativeEsc = escHtml(
      buildExperienceOperatorNarrative(p, primaryDecision ?? null, expEnv?.suppression_summary),
    );

    let decisionProgressionHtml = "";
    if (replayResult) {
      const replay = replayResult;
      const storyEsc = escHtml(buildOperatorSessionStory(replay));
      const steps =
        replay.transitions
          .map(
            (t) =>
              `<li><span class="si-muted">Δ${t.from_index}→${t.to_index}</span> — ${escHtml(t.reasons.join(", "))} · surfaces <code class="si-code">${escHtml(t.primary_surface_from ?? "—")}</code> → <code class="si-code">${escHtml(t.primary_surface_to ?? "—")}</code> · suppression <code class="si-code">${escHtml(t.suppression_delta)}</code></li>`,
          )
          .join("") || "<li>—</li>";
      const frameStrip = replay.frames
        .map(
          (f) =>
            `<li>Tick ${f.index}: primary <code class="si-code">${escHtml(f.envelope.primary_decision?.surface_id ?? "null")}</code> · readiness ${escHtml(String(f.diagnostics.readiness_score))} · nav ${escHtml(f.path_replay_tick)}</li>`,
        )
        .join("");
      decisionProgressionHtml = `<div class="si-panel-section">
        <div class="si-card">
          <h3>Decision progression</h3>
          <p class="si-muted si-muted--block">${storyEsc}</p>
          <h4 class="si-subh">Why it moved (transition codes)</h4>
          <ul class="si-reason">${steps}</ul>
          <h4 class="si-subh">Recent engine ticks</h4>
          <ul class="si-reason si-reason--tight">${frameStrip}</ul>
          <p class="si-muted si-muted--block">Runtime emits <code class="si-code">si:decision-transition</code> and <code class="si-code">si:decision-suppressed</code> when the envelope meaningfully changes—local CustomEvents only.</p>
        </div>
      </div>`;
    } else {
      decisionProgressionHtml = `<div class="si-panel-section">
        <div class="si-card">
          <h3>Decision progression</h3>
          <p class="si-muted si-muted--block">Replay needs at least two captured ticks after meaningful experience changes. Browse or revisit pricing—the inspector buffers the last several decision snapshots in-memory for this session.</p>
        </div>
      </div>`;
    }

    const experienceDecisionHtml = expEnv
      ? `<div class="si-panel-section">
        <div class="si-card si-card--hero si-card--experience">
          <h3>Recommended experience decision</h3>
          <h4 class="si-subh">Operator read</h4>
          <p class="si-muted si-muted--block">${operatorNarrativeEsc}</p>
          <h4 class="si-subh">Session progression</h4>
          <p class="si-muted si-muted--block">${sessionProgressionEsc}</p>
          ${
            primaryDecision
              ? `<div class="si-kv">
                  <div>Surface</div><div class="si-metric"><code class="si-code">${escHtml(primaryDecision.surface_id)}</code></div>
                  <div>Timing</div><div class="si-muted">${escHtml(primaryDecision.timing)}</div>
                  <div>Confidence</div><div class="si-metric">${escHtml(String(primaryDecision.confidence))}</div>
                  <div>Action · friction</div><div class="si-muted">${escHtml(primaryDecision.action)} · ${escHtml(primaryDecision.friction)}</div>
                  <div>Offer</div><div class="si-muted si-metric--break">${escHtml(primaryDecision.offer_type)}</div>
                  <div>Angle</div><div class="si-muted si-metric--break">${escHtml(primaryDecision.message_angle)}</div>
                </div>
                <h4 class="si-subh">Proposed copy</h4>
                <p class="si-rec-text">${escHtml(primaryDecision.headline)}</p>
                <p class="si-muted si-muted--block">${escHtml(primaryDecision.body)}</p>
                <div class="si-muted si-muted--mb6">Why this</div>
                <ul class="si-reason">${primaryDecision.reason.slice(0, 8).map((r) => `<li>${escHtml(r)}</li>`).join("")}</ul>
                <div class="si-muted si-muted--mb6">Evidence / grounding</div>
                <ul class="si-reason">${primaryDecision.evidence.slice(0, 6).map((r) => `<li>${escHtml(r)}</li>`).join("")}</ul>
                <h4 class="si-subh">Why not something stronger?</h4>
                <p class="si-muted si-muted--block">Harder asks wait for higher confidence, readiness, and surface fit. Null primaries are a deliberate product outcome.</p>
                <h4 class="si-subh">Integration preview (<code class="si-code">si:experience-decision</code>)</h4>
                <pre class="si-pre si-pre--activation-payload">${integrationSnippet}</pre>`
              : `<p class="si-muted si-muted--block">No strong experience decision yet — <b>this is expected</b> when the session is thin, contradictory, or early. Restraint protects the brand.</p>
                <p class="si-muted si-muted--block">${escHtml(expEnv.suppression_summary ?? "Suppression: session state did not cross decision thresholds.")}</p>`
          }
        </div>
      </div>`
      : "";

    const behaviorWarmupHtml = !bs
      ? `<div class="si-panel-section">
        <div class="si-card">
          <h3>Traffic &amp; behavioral intelligence</h3>
          <p class="si-muted si-muted--block">Behavior snapshot is not loaded yet — open the panel after the tag has run a tick, or browse to warm session signals.</p>
        </div>
      </div>`
      : "";

    const synthActivationRaw = synthesizedActivationRecommendation(p);
    const heroSynthEsc = escHtml(synthActivationRaw);
    const execBrief = buildExecutiveVisitorBriefing(p);
    const curatedTimeline = curateIntelTimelineForInspector(p);
    const timelineRows =
      curatedTimeline.length > 0
        ? curatedTimeline
            .map(
              (ev) =>
                `<li><time>${escHtml(formatTimelineClock(p.started_at, ev.t))}</time><span>${escHtml(ev.displayMessage)}</span></li>`,
            )
            .join("")
        : `<li class="si-timeline-empty"><span class="si-muted">No milestones yet — navigate, scroll, or use CTAs to populate this view.</span></li>`;

    const visitorHeroHtml = bs
      ? `<div class="si-panel-section">
        <div class="si-card si-card--hero">
          <h3>Anonymous visitor read</h3>
          <p class="si-visitor-lead">${escHtml(execBrief.lead)}</p>
          ${
            execBrief.acquisitionLine
              ? `<p class="si-visitor-body">${escHtml(execBrief.acquisitionLine)}</p>`
              : ""
          }
          <p class="si-visitor-body">${escHtml(execBrief.engagementLine)}</p>
          <div class="si-rec-box">
            <div class="si-rec-label">Recommended activation</div>
            <p class="si-rec-text">${heroSynthEsc}</p>
          </div>
        </div>
      </div>`
      : "";

    const sessionJourneyHtml = bs
      ? `<div class="si-panel-section">
        <div class="si-card">
          <h3>Session journey</h3>
          <p class="si-muted si-muted--block si-timeline-hint">Curated milestones from this session — strategic signals only.</p>
          <ul class="si-timeline">${timelineRows}</ul>
          <div class="si-kv si-journey-kv">
            <div>Commercial journey phase</div><div class="si-metric">${commPhaseEsc}</div>
            <div>Path pattern (recent)</div><div class="si-muted si-metric--break">${pathSummaryEsc}</div>
            <div>Distinct pages explored</div><div class="si-metric">${distinctPagesExplored}</div>
            <div>Engagement quality</div><div class="si-metric">${engageLabelEsc}</div>
            <div>Activation readiness (0–100)</div><div class="si-metric">${escHtml(actScore)}</div>
            <div>Interruption posture</div><div class="si-metric">${actPostureEsc}</div>
          </div>
        </div>
      </div>`
      : "";

    /** Keep `<details>` open on each render so subscribe-driven refreshes do not collapse panels. */
    const advancedSiteOpenAttr = " open";
    const sitePageHtml = `
      <div class="si-panel-section">
        <div class="si-card">
          <h3>Site understanding</h3>
          <p class="si-site-summary">
            <b>Type:</b> ${escHtml(publicSiteTypeLabel(env.site.site_type))} ·
            <b>Audience:</b> ${escHtml(audienceForVertical(sc.vertical))} ·
            <b>Objective:</b> ${escHtml(env.conversion.primary_objective.replace(/_/g, " "))}
          </p>
          <p class="si-muted si-muted--block">${escHtml(env.ladder.detail)} <span class="si-pill">Ladder ${env.ladder.level} — ${escHtml(env.ladder.label)}</span></p>
          <div class="si-kv">
            <div>Domain</div><div class="si-metric si-metric--break">${escHtml(sc.domain)}</div>
            ${
              sc.site_name?.trim()
                ? `<div>Site name</div><div class="si-metric">${escHtml(sc.site_name)}</div>`
                : ""
            }
            <div>Detected type</div><div><span class="si-pill">${escHtml(verticalDisplayName(sc.vertical))}</span></div>
            <div>Page kind</div><div><span class="si-pill">${escHtml(sc.page_kind)}</span></div>
            ${
              sc.scan.content_themes.length
                ? `<div>Inferred themes</div><div class="si-muted">${themes}</div>`
                : ""
            }
            <div>Primary page promise</div><div class="si-muted si-metric--break">${primaryPromiseEsc}</div>
            <div>Page structure</div><div class="si-muted">${pm.heading_counts.h2} section headings · ${pm.heading_counts.h3} supporting headings</div>
            ${
              showTopTermsRow
                ? `<div>${escHtml(topTermsLabel)}</div><div class="si-muted">${termsPreview}</div>`
                : ""
            }
          </div>
          <details class="si-advanced-site"${advancedSiteOpenAttr}>
            <summary>Advanced inference details</summary>
            <div class="si-kv si-advanced-site-kv">
              <div>Page type (funnel read)</div><div class="si-metric">${escHtml(humanGenericPageLabel(env.page.generic_kind))}</div>
              <div>Page signals</div><div class="si-muted">${envSignals}</div>
              <div>Objective confidence</div><div class="si-metric">${Math.round(env.conversion.confidence * 100)}%</div>
              <div>Conversion elements</div><div class="si-muted">${escHtml(env.conversion.detected_elements.join(", ") || "—")}</div>
              <div>Platform guess</div><div><span class="si-pill">${escHtml(env.site.platform_guess)}</span></div>
              <div>Vertical confidence</div><div class="si-metric">${escHtml(confWord)} (${Math.round(sc.vertical_confidence)}%)</div>
            </div>
          </details>
          <h4 class="si-subh">${escHtml(conceptCardTitle)}</h4>
          <div class="si-muted">${affinityEmpty ? "No strong signals yet — keep browsing." : ""}</div>
          ${affinityBlock}
        </div>
      </div>`;

    const activationPayloadJson = formatActivationPayloadJson(p);
    const activationPayloadEsc = escHtml(activationPayloadJson);

    const playbookExplainHtml =
      urlHasSiDebug() && ao.playbook
        ? `<div class="si-muted si-muted--mb6">Why this match (${escHtml(ao.playbook.label)})</div>
          <ul class="si-reason">${ao.playbook.why.map((x) => `<li>${escHtml(x)}</li>`).join("")}</ul>`
        : "";
    const nbaBlockHtml =
      urlHasSiDebug() && nba
        ? `<h4 class="si-subh">Next best action</h4>
          <div class="si-nba-body">${escHtml(nba.next_best_action)}</div>
          <div class="si-kv si-kv--tight si-kv--nba-meta">
            <div>Objective</div><div class="si-metric">${nbaObjectiveEsc}</div>
            <div>Level</div><div><span class="si-pill">${nbaLevelEsc}</span></div>
            <div>Surface</div><div><span class="si-pill">${nbaSurfaceTargetEsc}</span></div>
            <div>Surfaces detected</div><div class="si-muted">${nbaSurfaceEsc}</div>
            <div>Confidence</div><div class="si-metric">${(nba.confidence * 100).toFixed(0)}%</div>
          </div>
          <ul class="si-reason">${nba.reason.map((r) => `<li>${escHtml(r)}</li>`).join("")}</ul>`
        : "";

    const activationSectionHtml = `
      <div class="si-panel-section">
        <div class="si-card">
          <h3>Activation opportunity</h3>
          <div class="si-kv">
            ${
              ao.playbook
                ? `<div>Playbook match</div><div class="si-muted">${escHtml(ao.playbook.label)}</div>`
                : ""
            }
            ${
              ao.inferred_need?.trim()
                ? `<div>Inferred need</div><div class="si-metric si-metric--break">${escHtml(ao.inferred_need)}</div>`
                : ""
            }
            ${
              ao.message_angle?.trim()
                ? `<div>Message angle</div><div class="si-muted">${escHtml(ao.message_angle)}</div>`
                : ""
            }
            ${
              ao.offer_type?.trim()
                ? `<div>Offer type</div><div class="si-muted">${escHtml(ao.offer_type)}</div>`
                : ""
            }
            ${
              ao.surface?.trim()
                ? `<div>Best surface</div><div class="si-muted">${escHtml(ao.surface)}</div>`
                : ""
            }
            ${
              ao.timing?.trim()
                ? `<div>Timing</div><div class="si-muted">${escHtml(ao.timing)}</div>`
                : ""
            }
          </div>
          <details class="si-legacy-signal-payload">
            <summary>Legacy personalization signal &amp; activation payload (integrations)</summary>
            <p class="si-muted si-muted--block">Prefer <code class="si-code">getExperienceDecisionEnvelope()</code> / <code class="si-code">pushExperienceDecisionToDataLayer()</code> for the experience layer. This drawer keeps evidence, <code class="si-code">getPersonalizationSignal()</code>, and <code class="si-code">si_personalization_signal</code> JSON for existing GTM / Adobe / Optimizely wiring.</p>
            ${playbookExplainHtml}
            <div class="si-muted si-muted--mb6">Evidence</div>
            <ul class="si-reason">${ao.evidence.map((x) => `<li>${escHtml(x)}</li>`).join("") || "<li>—</li>"}</ul>
            <h4 class="si-subh">Personalization signal</h4>
            <div class="si-kv si-kv--tight">
              <div>Inferred need</div><div class="si-metric si-metric--break">${escHtml(sig.inferred_need)}</div>
              <div>Surface / timing</div><div class="si-muted">${escHtml(sig.recommended_surface)} · ${escHtml(sig.recommended_timing)}</div>
              <div>Friction</div><div class="si-muted">${escHtml(sig.recommended_friction_level)}</div>
              <div>Conversion readiness</div><div class="si-metric">${sig.conversion_readiness}</div>
              <div>Signal confidence</div><div class="si-metric">${(sig.confidence * 100).toFixed(0)}%</div>
            </div>
            ${nbaBlockHtml}
            <h4 class="si-subh">Activation payload (<code class="si-code">si_personalization_signal</code>)</h4>
            <p class="si-muted si-muted--block">
              <code class="si-code">getActivationPayload()</code>,
              <code class="si-code">pushPersonalizationSignalToDataLayer()</code>,
              <code class="si-code">pushPersonalizationSignalAll()</code> — dispatches
              <code class="si-code">si:personalization-signal</code> / <code class="si-code">si:activation</code> when the signal meaningfully changes.
            </p>
            <pre class="si-pre si-pre--activation-payload">${activationPayloadEsc}</pre>
          </details>
        </div>
      </div>`;

    const explainSectionHtml = `
        <div class="si-section-label">Explainability &amp; confidence</div>
        <div class="si-card">
          <h3>What we know vs. gaps</h3>
          <div class="si-muted si-muted--mb6">High confidence</div>
          <ul class="si-reason">${certaintyHigh}</ul>
          <div class="si-muted si-muted--mb6">Medium confidence</div>
          <ul class="si-reason">${certaintyMed}</ul>
          <div class="si-muted si-muted--mb6">Low confidence / gaps</div>
          <ul class="si-reason">${certaintyLow}</ul>
        </div>
        <div class="si-card">
          <h3>How the tag inferred this page</h3>
          <p class="si-muted si-muted--block">${howInferredLines}</p>
        </div>
        <div class="si-card si-card--privacy">
          <h3>Privacy posture</h3>
          <p class="si-muted si-muted--block">
            Session Intelligence stays on <b>anonymous, first-party, in-session</b> reads: no fingerprinting, no keystroke logging,
            no raw search query capture, and no cross-site identity stitching. Timeline rows are short labels derived from
            navigation and coarse engagement signals only.
          </p>
        </div>`;

    const liveSignalsHtml = urlHasSiDebug()
      ? `<div class="si-panel-section">
        <div class="si-section-label">Debug</div>
        <div class="si-card">
          <h3>${escHtml(liveSignalSectionTitle(sc.vertical))}</h3>
          <div class="si-kv">${signalRows}</div>
        </div>
      </div>`
      : "";

    const safePlanHtml =
      !isAuto && safePlanLines.length && urlHasSiDebug()
        ? `<div class="si-card">
        <h3>Safe personalization (signal-only)</h3>
        <p class="si-muted si-muted--block">Recommended mode: signal-only / safe activation recommendation. No DOM rewrite active on this host. The ladder pill (<span class="si-pill">${escHtml(env.ladder.label)}</span>) is confidence in what to recommend — not automatic on-page execution.</p>
        <ul class="si-reason">${safePlanLines.map((line) => `<li>${escHtml(line)}</li>`).join("")}</ul>
      </div>`
        : "";

    const sessionControlsInnerHtml = `
        ${safePlanHtml}
        <div class="si-card">
          <h3>Session &amp; experiments</h3>
          <div class="si-kv si-kv--tight">
            <div>Session ID</div><div class="si-metric si-metric--break"><code class="si-code">${escHtml(p.session_id)}</code></div>
            ${
              urlHasSiDebug() || (p.persona && p.persona !== "auto")
                ? `<div>Persona (debug)</div><div><span class="si-pill">${escHtml(p.persona ?? "auto")}</span></div>`
                : ""
            }
            <div>Page type (signals)</div><div><span class="si-pill">${escHtml(p.page_type)}</span></div>
          </div>
        </div>
        <div class="si-card">
          <h3>Active personalization</h3>
          <div class="si-muted si-muted--mb6">Personalization: <b>${persoOn ? "ON" : "OFF"}</b>${
            !isAuto
              ? "<br/><span class=\"si-muted\">Signal-only on non-retail demo hosts: no automatic DOM rewrites.</span>"
              : ""
          }</div>
          ${
            p.active_treatments.length
              ? p.active_treatments
                  .map(
                    (t) =>
                      `<div class="si-treat-row"><span class="si-pill">${t.source}</span> <code>${escHtml(t.treatment_id)}</code><div class="si-muted">slots: ${t.applied_slots.map(escHtml).join(", ") || "—"}</div></div>`,
                  )
                  .join("")
              : `<div class="si-muted">No active treatments.</div>`
          }
        </div>
        <div class="si-card">
          <h3>Experiment assignment</h3>
          ${
            exp
              ? `<div class="si-kv">
                 <div>Experiment</div><div><code>${escHtml(exp.experiment_id)}</code></div>
                 <div>Variant</div><div><span class="si-pill">${escHtml(exp.variant_id)}</span></div>
                 <div>Treatment</div><div><code>${escHtml(exp.treatment_id ?? "none")}</code></div>
                 <div>Holdout</div><div class="si-metric">${exp.is_control ? "yes (control)" : "no"}</div>
               </div>`
              : `<div class="si-muted">No experiment running.</div>`
          }
        </div>
        <div class="si-card">
          <h3>Lift preview (demo seed)</h3>
          <p class="si-muted si-muted--block">
            ${
              isAuto
                ? `Seeded numbers merge into the dashboard experiment table when no live D1 rows exist
            (<code class="si-code">@si/shared/demoMetrics</code> + worker <code class="si-code">mergeExperiment</code>).`
                : `${escHtml(liftPreview.cohortLabel)} — vertical-specific seeded rates for the inspector.`
            }
          </p>
          <div class="si-kv">
            <div>${escHtml(liftPreview.ctaMetricLabel)}</div><div><span class="si-pill">${escHtml(liftPreview.ctaLine)}</span></div>
            <div>${escHtml(liftPreview.leadMetricLabel)}</div><div><span class="si-pill">${escHtml(liftPreview.leadLine)}</span></div>
          </div>
        </div>
        <div class="si-card">
          <h3>Session storage</h3>
          <p class="si-muted si-muted--block">
            One anonymous profile in <b>sessionStorage</b> under <code class="si-code">si:session</code> (not a cookie).
            Clearing it issues a new session id and a fresh A/B assignment.
          </p>
          <div class="si-btn-row">
            <button class="si-btn primary" id="si-soft-reset">Clear session (no reload)</button>
            <button class="si-btn danger" id="si-hard-reset">Clear session &amp; reload</button>
          </div>
        </div>
        <div class="si-card">
          <h3>Controls</h3>
          <div class="si-muted si-muted--mb8">Personalization: <b>${persoOn ? "ON" : "OFF"}</b></div>
          <div class="si-btn-row">
            <button class="si-btn primary" id="si-toggle-perso">${persoOn ? "Disable" : "Enable"} personalization</button>
            <button class="si-btn" id="si-export">Export state</button>
          </div>
          <div class="si-muted si-muted--persona">${escHtml(personaControlLabel)}</div>
          <div class="si-btn-row" id="si-personas"></div>
        </div>`;

    const secondaryDrawerOpenAttr = " open";
    const secondaryDrawerHtml = `
      <div class="si-panel-section">
        <details class="si-drawer-secondary"${secondaryDrawerOpenAttr}>
          <summary class="si-drawer-secondary-summary">Trust, explainability &amp; session controls</summary>
          <div class="si-drawer-secondary-body">
            ${explainSectionHtml}
            ${trafficIntelHtml}
            ${acquisitionIntelHtml}
            ${journeyDiagnosticsHtml}
            <div class="si-section-label">Session &amp; console</div>
            ${sessionControlsInnerHtml}
          </div>
        </details>
      </div>`;

    const technicalStackHtml = `
      ${experienceDecisionHtml}
      ${decisionProgressionHtml}
      ${behaviorWarmupHtml}
      ${visitorHeroHtml}
      ${sessionJourneyHtml}
      ${sitePageHtml}
      ${activationSectionHtml}
      ${secondaryDrawerHtml}
      ${liveSignalsHtml}
    `;

    const html =
      panelMode === "buyer"
        ? buyerPanelHtml
        : `${buyerPanelHtml}<details class="si-operator-details"><summary class="si-operator-details-summary">Operator view — full diagnostics</summary><div class="si-operator-details-body">${technicalStackHtml}</div></details>`;
    try {
      replaceChildrenFromHtml(body, html);
      syncInspectorModeChrome();
    } catch (e) {
      console.error(
        "[Session Intelligence] inspector panel render blocked (SES lockdown, Trusted Types, or DOMParser).",
        e,
      );
      body.replaceChildren();
      const p = document.createElement("p");
      p.className = "si-muted";
      p.textContent =
        "This page's sandbox blocked rendering the full inspector. SI may still be tracking. Try loading si.js before lockdown(), or use data-inspector on the script tag for remote debugging.";
      body.appendChild(p);
      return;
    }

    const togglePerso = body.querySelector("#si-toggle-perso") as HTMLButtonElement;
    togglePerso.addEventListener("click", () => {
      opts.onTogglePersonalization(!opts.getPersonalizationEnabled());
      render();
    });

    body.querySelector("#si-export")?.addEventListener("click", async () => {
      const json = JSON.stringify(opts.getState(), null, 2);
      try {
        await navigator.clipboard.writeText(json);
        alert("State copied to clipboard");
      } catch {
        prompt("Copy state JSON", json);
      }
    });

    body.querySelector("#si-soft-reset")?.addEventListener("click", () => {
      opts.onSoftReset();
      render();
    });

    body.querySelector("#si-hard-reset")?.addEventListener("click", () => {
      opts.onReset();
    });

    const personaRow = body.querySelector("#si-personas") as HTMLDivElement;
    archetypePersonasForVertical(sc.vertical).forEach((persona) => {
      const b = document.createElement("button");
      b.className = "si-btn";
      b.textContent = persona.replace(/_/g, " ");
      b.addEventListener("click", () => opts.onForcePersona(persona));
      personaRow.appendChild(b);
    });
    const clear = document.createElement("button");
    clear.className = "si-btn";
    clear.textContent = "Clear archetype";
    clear.addEventListener("click", () => opts.onForcePersona(null));
    personaRow.appendChild(clear);
  }

  modeBuyerBtn.addEventListener("click", (ev) => {
    ev.preventDefault();
    setInspectorPanelMode("buyer");
    if (open) render();
  });
  modeOperatorBtn.addEventListener("click", (ev) => {
    ev.preventDefault();
    setInspectorPanelMode("operator");
    if (open) render();
  });

  syncInspectorModeChrome();

  /** Debug / SPA: open drawer when `?si_debug=1` or `sessionStorage['si:debug'] === '1'`. */
  if (urlHasSiDebug()) {
    open = true;
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    launcher.setAttribute("aria-expanded", "true");
    render();
  }

  return () => {
    unsub();
    window.removeEventListener("keydown", keyHandler, true);
    if (pendingDomAttach) {
      document.removeEventListener("DOMContentLoaded", pendingDomAttach);
      pendingDomAttach = null;
    }
    root.remove();
  };
}
