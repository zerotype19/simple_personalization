import { CodeBlock, CopyLine } from "../components/CodeBlock";

export function IntegrationsPage() {
  return (
    <div className="space-y-12">
      <div>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-slate-900">
          Feed experience decisions into your stack
        </h1>
        <p className="mb-2 text-lg font-medium text-slate-800">Surface-level decisions for CMS components</p>
        <p className="max-w-2xl text-slate-600">
          Optiview is an <strong>anonymous experience decision runtime</strong>. After the snippet loads,{" "}
          <code className="rounded bg-slate-100 px-1">window.SessionIntel</code> exposes{" "}
          <strong>per-surface</strong> decisions your tags or CMS code activate—still session-scoped, without an identity
          graph.
        </p>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Works with <strong>GTM</strong>, <strong>Adobe</strong> (Target, AEP / Web SDK, Client Data Layer,{" "}
          <strong>AEM</strong>), <strong>Optimizely</strong>, <strong>Shopify</strong>, <strong>React</strong> / headless
          stacks, <strong>Webflow</strong>, and custom collectors.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-indigo-50/50 p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Decision first, signal when you need depth</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>
            <strong>Experience decision</strong> — what a CMS region or component should do <em>now</em> for a given{" "}
            <code className="rounded bg-white px-1">surface_id</code> (show, suppress, timing, offer fields). This is
            the primary object to wire into activation.
          </li>
          <li>
            <strong>Personalization signal</strong> — supporting, richer context for stacks that want scored attributes
            and narrative fields alongside decisions (tags, analytics-adjacent routing).
          </li>
          <li>
            <strong>Activation payload</strong> — full integration / inspector-style payload when you need everything in
            one object for debugging or bespoke pipes.
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Subscribe to a surface (primary pattern)</h2>
        <p className="mb-4 text-sm text-slate-600">
          The callback receives the full <strong>envelope</strong>, not the per-surface slot. Always read the slot with{" "}
          <code className="rounded bg-slate-100 px-1">getExperienceDecision(surfaceId)</code>, then gate rendering on{" "}
          <code className="rounded bg-slate-100 px-1">action === &quot;show&quot;</code>.
        </p>
        <CodeBlock
          label="Canonical: subscribe + slot decision"
          code={`window.SessionIntel.subscribeToDecision("article_inline_mid", () => {
  const decision = window.SessionIntel.getExperienceDecision("article_inline_mid");

  if (decision?.action === "show") {
    // render your mapped CMS surface
  }
});`}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Read the experience envelope</h2>
        <p className="mb-4 text-sm text-slate-600">
          Primary decision, secondaries, suppression summary, and session id—useful for tags and platforms that consume
          one object per tick.
        </p>
        <CopyLine code="window.SessionIntel.getExperienceDecisionEnvelope()" />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Push destination helpers (experience layer)</h2>
        <p className="mb-4 text-sm text-slate-600">
          Normalized payloads for common sinks (event name <code className="rounded bg-slate-100 px-1">si_experience_decision</code>{" "}
          on the data layer where applicable).
        </p>
        <div className="space-y-3">
          <CopyLine code="window.SessionIntel.pushExperienceDecisionToDataLayer()" />
          <CopyLine code="window.SessionIntel.pushExperienceDecisionToAdobeDataLayer()" />
          <CopyLine code="window.SessionIntel.pushExperienceDecisionToOptimizely()" />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Google Tag Manager / dataLayer</h2>
        <p className="mb-4 text-sm text-slate-600">
          Prefer the experience decision push so GTM variables map to <code className="rounded bg-slate-100 px-1">si_decision_*</code>{" "}
          fields. Pair with a Custom Event trigger on <code className="rounded bg-slate-100 px-1">si_experience_decision</code>.
        </p>
        <CopyLine code="window.SessionIntel.pushExperienceDecisionToDataLayer()" />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Adobe Client Data Layer</h2>
        <CopyLine code="window.SessionIntel.pushExperienceDecisionToAdobeDataLayer()" />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Adobe Alloy / Web SDK</h2>
        <p className="mb-4 text-sm text-slate-600">
          Read the <strong>envelope</strong> (or a surface slot), then pass the fields your XDM extension expects. Event
          type and mixin paths are your Adobe contract.
        </p>
        <CodeBlock
          label="Example: envelope-first sendEvent"
          code={`const envelope = window.SessionIntel.getExperienceDecisionEnvelope();
const p = envelope?.primary_decision;
alloy("sendEvent", {
  xdm: {
    eventType: "optiview.experienceDecision",
    _optiview: {
      surfaceId: p?.surface_id,
      action: p?.action,
      offerType: p?.offer_type,
      messageAngle: p?.message_angle,
      timing: p?.timing,
      confidence: p?.confidence,
      sessionId: envelope?.session_id,
    },
  },
});`}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Optimizely</h2>
        <CopyLine code="window.SessionIntel.pushExperienceDecisionToOptimizely()" />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">DOM events</h2>
        <p className="mb-4 text-sm text-slate-600">
          <code className="rounded bg-slate-100 px-1">si:experience-decision</code> fires when the experience envelope
          meaningfully changes—handy for AEM, Webflow, and CMS listeners without a bundler.
        </p>
        <CodeBlock
          label="Experience decision event"
          code={`window.addEventListener("si:experience-decision", (ev) => {
  const envelope = ev.detail;
  const decision = window.SessionIntel.getExperienceDecision("article_inline_mid");
  if (decision?.action === "show") {
    // render mapped surface
  }
});`}
        />
      </section>

      <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
        <h2 className="mb-3 font-semibold text-slate-900">Personalization signal &amp; activation payload (deeper context)</h2>
        <p className="mb-4 text-sm text-slate-600">
          When you need richer scored context or the full integration object, use the <strong>personalization signal</strong>{" "}
          and <strong>activation payload</strong> alongside—not instead of—surface decisions.
        </p>
        <div className="space-y-3">
          <CopyLine code="window.SessionIntel.getPersonalizationSignal()" />
          <CopyLine code="window.SessionIntel.getActivationPayload()" />
          <CopyLine code="window.SessionIntel.pushPersonalizationSignalToDataLayer()" />
          <CopyLine code="window.SessionIntel.pushPersonalizationSignalToAdobeDataLayer()" />
          <CopyLine code="window.SessionIntel.pushPersonalizationSignalToOptimizely()" />
          <CopyLine code="window.SessionIntel.pushPersonalizationSignalAll()" />
        </div>
        <div className="mt-4">
          <CodeBlock
            label="Legacy / supporting: personalization signal event"
            code={`window.addEventListener("si:personalization-signal", (ev) => {
  const detail = ev.detail;
  // route detail when you need the deeper context payload
});`}
          />
        </div>
      </section>
    </div>
  );
}
