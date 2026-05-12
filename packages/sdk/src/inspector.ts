import type { SessionProfile } from "@si/shared";

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

export function mountInspector(opts: InspectorOptions): () => void {
  const root = document.createElement("div");
  root.id = "si-inspector-root";
  root.innerHTML = `
<style>
  #si-inspector-root * { box-sizing: border-box; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
  #si-inspector-panel {
    position: fixed; top: 0; right: 0; height: 100vh; width: min(420px, 100vw);
    background: #0b0f14; color: #e6edf3; border-left: 1px solid #1f2937;
    transform: translateX(100%); transition: transform 0.25s ease; z-index: 2147483000;
    display: flex; flex-direction: column; box-shadow: -8px 0 30px rgba(0,0,0,0.35);
  }
  #si-inspector-panel.open { transform: translateX(0); }
  #si-inspector-header {
    padding: 14px 16px; border-bottom: 1px solid #1f2937; display: flex; align-items: center; justify-content: space-between; gap: 10px;
  }
  #si-inspector-header h2 { margin: 0; font-size: 14px; letter-spacing: 0.02em; font-weight: 600; }
  #si-inspector-body { overflow: auto; padding: 12px 14px 18px; flex: 1; }
  .si-card { background: #111827; border: 1px solid #1f2937; border-radius: 10px; padding: 10px 12px; margin-bottom: 10px; }
  .si-card h3 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; font-weight: 600; }
  .si-kv { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; font-size: 12px; }
  .si-kv div:nth-child(odd) { color: #9ca3af; }
  .si-pill { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #1f2937; font-size: 11px; }
  .si-btn-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  button.si-btn {
    background: #1f2937; color: #e5e7eb; border: 1px solid #374151; border-radius: 8px; padding: 6px 10px; font-size: 12px; cursor: pointer;
  }
  button.si-btn.primary { background: #2563eb; border-color: #1d4ed8; }
  button.si-btn.danger { background: #7f1d1d; border-color: #991b1b; }
  .si-metric { font-variant-numeric: tabular-nums; }
  .si-reason { font-size: 12px; color: #cbd5e1; margin: 6px 0 0; padding-left: 16px; }
  .si-muted { color: #9ca3af; font-size: 12px; }
</style>
<div id="si-inspector-panel" aria-hidden="true">
  <div id="si-inspector-header">
    <div>
      <h2>Session Intelligence</h2>
      <div class="si-muted">Ctrl+Shift+D or ⌘+Shift+D to toggle</div>
    </div>
    <button class="si-btn" id="si-close">Close</button>
  </div>
  <div id="si-inspector-body"></div>
</div>`;
  document.body.appendChild(root);

  const panel = root.querySelector("#si-inspector-panel") as HTMLElement;
  const body = root.querySelector("#si-inspector-body") as HTMLElement;
  const closeBtn = root.querySelector("#si-close") as HTMLButtonElement;

  let open = false;
  const toggle = () => {
    open = !open;
    panel.classList.toggle("open", open);
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) render();
  };

  const keyHandler = (e: KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.shiftKey && (e.key === "D" || e.key === "d")) {
      e.preventDefault();
      toggle();
    }
  };
  window.addEventListener("keydown", keyHandler);
  closeBtn.addEventListener("click", toggle);

  const unsub = opts.subscribe(() => {
    if (open) render();
  });

  function render() {
    const p = opts.getState();
    const nba = p.next_best_action;
    const exp = p.experiment_assignment;
    const persoOn = opts.getPersonalizationEnabled();

    body.innerHTML = `
      <div class="si-card">
        <h3>Session profile</h3>
        <div class="si-kv">
          <div>Session ID</div><div class="si-metric" style="grid-column: span 1; word-break: break-all;">${p.session_id}</div>
          <div>Journey stage</div><div><span class="si-pill">${p.journey_stage}</span></div>
          <div>Page type</div><div><span class="si-pill">${p.page_type}</span></div>
          <div>Persona</div><div><span class="si-pill">${p.persona ?? "auto"}</span></div>
          <div>Intent</div><div class="si-metric">${p.intent_score}</div>
          <div>Urgency</div><div class="si-metric">${p.urgency_score}</div>
          <div>Engagement</div><div class="si-metric">${p.engagement_score}</div>
        </div>
      </div>

      <div class="si-card">
        <h3>Live signals</h3>
        <div class="si-kv">
          <div>Pages</div><div class="si-metric">${p.signals.pages_viewed}</div>
          <div>VDP views</div><div class="si-metric">${p.signals.vdp_views}</div>
          <div>Pricing views</div><div class="si-metric">${p.signals.pricing_views}</div>
          <div>Finance interactions</div><div class="si-metric">${p.signals.finance_interactions}</div>
          <div>Compare interactions</div><div class="si-metric">${p.signals.compare_interactions}</div>
          <div>CTA clicks</div><div class="si-metric">${p.signals.cta_clicks}</div>
          <div>Max scroll</div><div class="si-metric">${p.signals.max_scroll_depth}%</div>
          <div>Return visit</div><div class="si-metric">${p.signals.return_visit ? "yes" : "no"}</div>
          <div>Duration</div><div class="si-metric">${Math.round(p.signals.session_duration_ms / 1000)}s</div>
        </div>
      </div>

      <div class="si-card">
        <h3>Category affinity</h3>
        <div class="si-muted">${Object.keys(p.category_affinity).length ? "" : "No strong affinity yet"}</div>
        <div class="si-kv" style="margin-top:8px;">
          ${Object.entries(p.category_affinity)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(
              ([k, v]) =>
                `<div>${k}</div><div class="si-metric">${(v * 100).toFixed(0)}%</div>`,
            )
            .join("")}
        </div>
      </div>

      <div class="si-card">
        <h3>Recommendation</h3>
        ${
          nba
            ? `<div style="font-size:13px;line-height:1.4;">${nba.next_best_action}</div>
               <div class="si-muted" style="margin-top:6px;">Confidence: <span class="si-metric">${(nba.confidence * 100).toFixed(0)}%</span></div>
               <ul class="si-reason">${nba.reason.map((r) => `<li>${r}</li>`).join("")}</ul>`
            : `<div class="si-muted">No recommendation yet — keep browsing.</div>`
        }
      </div>

      <div class="si-card">
        <h3>Active personalization</h3>
        <div class="si-muted" style="margin-bottom:6px;">Personalization: <b>${persoOn ? "ON" : "OFF"}</b></div>
        ${
          p.active_treatments.length
            ? p.active_treatments
                .map(
                  (t) =>
                    `<div style="font-size:12px;margin-bottom:6px;"><span class="si-pill">${t.source}</span> <code>${t.treatment_id}</code><div class="si-muted">slots: ${t.applied_slots.join(", ") || "—"}</div></div>`,
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
                 <div>Experiment</div><div><code>${exp.experiment_id}</code></div>
                 <div>Variant</div><div><span class="si-pill">${exp.variant_id}</span></div>
                 <div>Treatment</div><div><code>${exp.treatment_id ?? "none"}</code></div>
                 <div>Holdout</div><div class="si-metric">${exp.is_control ? "yes (control)" : "no"}</div>
               </div>`
            : `<div class="si-muted">No experiment running.</div>`
        }
      </div>

      <div class="si-card">
        <h3>Lift preview (demo seed)</h3>
        <div class="si-kv">
          <div>CTA CTR</div><div>8.2% → 9.7% <span class="si-pill">+18%</span></div>
          <div>Lead submit</div><div>1.8% → 2.1% <span class="si-pill">+17%</span></div>
        </div>
      </div>

      <div class="si-card">
        <h3>Session storage</h3>
        <p class="si-muted" style="margin:0 0 8px;line-height:1.45;">
          SI keeps one anonymous profile in <b>sessionStorage</b> under key <code style="font-size:11px;">si:session</code>
          (not a cookie). Clearing it gives you a new session id and a fresh A/B coin flip.
        </p>
        <div class="si-btn-row">
          <button class="si-btn primary" id="si-soft-reset">Clear session (no reload)</button>
          <button class="si-btn danger" id="si-hard-reset">Clear session &amp; reload</button>
        </div>
      </div>

      <div class="si-card">
        <h3>Controls</h3>
        <div class="si-muted" style="margin-bottom:8px;">Personalization: <b>${persoOn ? "ON" : "OFF"}</b></div>
        <div class="si-btn-row">
          <button class="si-btn primary" id="si-toggle-perso">${persoOn ? "Disable" : "Enable"} personalization</button>
          <button class="si-btn" id="si-export">Export state</button>
        </div>
        <div style="margin-top:10px;" class="si-muted">Force persona</div>
        <div class="si-btn-row" id="si-personas"></div>
      </div>
    `;

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

  return () => {
    unsub();
    window.removeEventListener("keydown", keyHandler);
    root.remove();
  };
}
