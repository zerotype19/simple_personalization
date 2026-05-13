import type { SessionProfile } from "@si/shared";
import { demoLiftPreviewCopy } from "@si/shared/demoMetrics";
import INSPECTOR_PANEL_CSS from "./inspector-panel.txt";
import { logSiDebug, urlHasSiDebug } from "./si-debug";
import {
  liveSignalSectionTitle,
  siteContextTitle,
  topicAffinitySectionTitle,
  verticalDisplayName,
} from "./siteIntelligence/panelLabelMapper";

/** Set only in the hosted IIFE build (`SI_PUBLIC_INSPECTOR_CSS_URL`); empty in ESM. */
declare const __SI_EMBED_INSPECTOR_CSS_URL__: string;

export interface InspectorOptions {
  getState: () => SessionProfile;
  subscribe: (cb: (p: SessionProfile) => void) => () => void;
  /** Clear `si:session` storage, new session id, re-roll A/B, re-apply — no reload. */
  onSoftReset: () => void;
  onReset: () => void;
  onTogglePersonalization: (enabled: boolean) => void;
  onForcePersona: (persona: string | null) => void;
  getPersonalizationEnabled: () => boolean;
}

const PERSONAS = [
  "researcher",
  "family_buyer",
  "luxury_buyer",
  "payment_sensitive",
  "high_intent",
];

function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
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
  launcher.setAttribute("aria-label", "Toggle Session Intelligence panel");
  launcher.title = "Session Intelligence";
  launcher.textContent = "SI";

  const panel = document.createElement("div");
  panel.id = "si-inspector-panel";
  panel.setAttribute("aria-hidden", "true");

  const header = document.createElement("div");
  header.id = "si-inspector-header";

  const headerMain = document.createElement("div");
  const h2 = document.createElement("h2");
  h2.textContent = "Session Intelligence";

  const hint = document.createElement("div");
  hint.className = "si-muted";
  hint.append("Click ");
  const bSi = document.createElement("b");
  bSi.textContent = "SI";
  hint.append(bSi, " (corner) or ");
  const bWin = document.createElement("b");
  bWin.textContent = "Ctrl+Shift+`";
  hint.append(bWin, " / ");
  const bMac = document.createElement("b");
  bMac.textContent = "⌘+Shift+`";
  hint.append(bMac, " (backtick key) to toggle. ");
  const chromeHint = document.createElement("span");
  chromeHint.className = "si-csp-chrome-hint";
  chromeHint.textContent = "(Ctrl+Shift+D is reserved in Chrome for bookmarks.)";
  hint.append(chromeHint);

  headerMain.append(h2, hint);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "si-btn";
  closeBtn.id = "si-close";
  closeBtn.textContent = "Close";

  header.append(headerMain, closeBtn);

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
  launcher.setAttribute("aria-expanded", "false");

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
    const p = opts.getState();
    const nba = p.next_best_action;
    const exp = p.experiment_assignment;
    const persoOn = opts.getPersonalizationEnabled();
    const liftPreview = demoLiftPreviewCopy();
    const sc = p.site_context;
    const isAuto = sc.vertical === "auto_retail";
    const themes = sc.scan.content_themes.slice(0, 4).map(escHtml).join(", ") || "—";
    const termsPreview = sc.scan.top_terms.slice(0, 8).map(escHtml).join(", ") || "—";
    const signalRows = Object.entries(p.dynamic_signals)
      .map(
        ([k, val]) =>
          `<div>${escHtml(k)}</div><div class="si-metric">${escHtml(String(val))}</div>`,
      )
      .join("");
    const affinityRows = Object.entries(p.category_affinity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(
        ([k, v]) =>
          `<div>${escHtml(k.replace(/_/g, " "))}</div><div class="si-metric">${(v * 100).toFixed(0)}%</div>`,
      )
      .join("");

    const html = `
      <div class="si-card">
        <h3>${siteContextTitle()}</h3>
        <div class="si-kv">
          <div>Domain</div><div class="si-metric si-metric--break">${escHtml(sc.domain)}</div>
          <div>Site name</div><div class="si-metric">${escHtml(sc.site_name ?? "—")}</div>
          <div>Detected type</div><div><span class="si-pill">${escHtml(verticalDisplayName(sc.vertical))}</span></div>
          <div>Type confidence</div><div class="si-metric">${Math.round(sc.vertical_confidence)}%</div>
          <div>Page kind</div><div><span class="si-pill">${escHtml(sc.page_kind)}</span></div>
          <div>Content themes</div><div class="si-muted">${themes}</div>
          <div>Top terms (sample)</div><div class="si-muted">${termsPreview}</div>
        </div>
      </div>

      <div class="si-card">
        <h3>Session profile</h3>
        <div class="si-kv">
          <div>Session ID</div><div class="si-metric si-metric--break">${escHtml(p.session_id)}</div>
          <div>Journey stage</div><div><span class="si-pill">${p.journey_stage}</span></div>
          <div>Page type (signals)</div><div><span class="si-pill">${p.page_type}</span></div>
          <div>Persona</div><div><span class="si-pill">${p.persona ?? "auto"}</span></div>
          <div>Intent</div><div class="si-metric">${p.intent_score}</div>
          <div>Urgency</div><div class="si-metric">${p.urgency_score}</div>
          <div>Engagement</div><div class="si-metric">${p.engagement_score}</div>
        </div>
      </div>

      <div class="si-card">
        <h3>${escHtml(liveSignalSectionTitle(sc.vertical))}</h3>
        <div class="si-kv">
          ${signalRows}
        </div>
      </div>

      <div class="si-card">
        <h3>${escHtml(topicAffinitySectionTitle(sc.vertical))}</h3>
        <div class="si-muted">${Object.keys(p.category_affinity).length ? "" : "No strong signals yet — keep browsing."}</div>
        <div class="si-kv si-kv--tight">
          ${affinityRows}
        </div>
      </div>

      <div class="si-card">
        <h3>Recommendation</h3>
        ${
          nba
            ? `<div class="si-nba-body">${escHtml(nba.next_best_action)}</div>
               <div class="si-muted si-nba-conf">Confidence: <span class="si-metric">${(nba.confidence * 100).toFixed(0)}%</span></div>
               <ul class="si-reason">${nba.reason.map((r) => `<li>${escHtml(r)}</li>`).join("")}</ul>`
            : `<div class="si-muted">No recommendation yet — keep browsing.</div>`
        }
      </div>

      <div class="si-card">
        <h3>Active personalization</h3>
        <div class="si-muted si-muted--mb6">Personalization: <b>${persoOn ? "ON" : "OFF"}</b>${
          !isAuto
            ? "<br/><span class=\"si-muted\">Observe-only on non-retail sites: no Velocity demo DOM rewrites.</span>"
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
              ? `Same numbers merged into the dashboard experiment table when no live D1 rows exist
          (<code class="si-code">@si/shared/demoMetrics</code> + worker <code class="si-code">mergeExperiment</code>).`
              : "Lift numbers below are calibrated for the Velocity retail demo dashboard. Treat them as illustrative when this tag runs on other verticals."
          }
        </p>
        <div class="si-kv">
          <div>CTA CTR</div><div><span class="si-pill">${liftPreview.ctaLine}</span></div>
          <div>Lead submit</div><div><span class="si-pill">${liftPreview.leadLine}</span></div>
        </div>
      </div>

      <div class="si-card">
        <h3>Session storage</h3>
        <p class="si-muted si-muted--block">
          SI keeps one anonymous profile in <b>sessionStorage</b> under key <code class="si-code">si:session</code>
          (not a cookie). Clearing it gives you a new session id and a fresh A/B coin flip.
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
        <div class="si-muted si-muted--persona">Force persona</div>
        <div class="si-btn-row" id="si-personas"></div>
      </div>
    `;
    try {
      replaceChildrenFromHtml(body, html);
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
    PERSONAS.forEach((persona) => {
      const b = document.createElement("button");
      b.className = "si-btn";
      b.textContent = persona.replace(/_/g, " ");
      b.addEventListener("click", () => opts.onForcePersona(persona));
      personaRow.appendChild(b);
    });
    const clear = document.createElement("button");
    clear.className = "si-btn";
    clear.textContent = "Clear persona";
    clear.addEventListener("click", () => opts.onForcePersona(null));
    personaRow.appendChild(clear);
  }

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
