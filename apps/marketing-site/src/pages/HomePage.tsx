import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { CodeBlock } from "../components/CodeBlock";
import { CDN_URL, DEMO_URL } from "../config/publicUrls";

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mb-16 scroll-mt-24">
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
      <div className="space-y-4 text-slate-700">{children}</div>
    </section>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-2 font-medium text-slate-900">{title}</h3>
      <div className="text-sm text-slate-600">{children}</div>
    </div>
  );
}

export function HomePage() {
  const scriptSnippet = `<script async src="${CDN_URL}/si.js" data-si-key="YOUR_SNIPPET_KEY"></script>`;

  return (
    <div>
      <div className="mb-16 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm md:p-12">
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-accent-muted">
          Anonymous experience decision runtime
        </p>
        <h1 className="mb-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          Decide what to show on each surface—before visitors identify themselves.
        </h1>
        <p className="mb-6 max-w-2xl text-lg text-slate-600">
          Optiview turns acquisition context, page semantics, and in-session behavior into <strong>experience decisions</strong>{" "}
          (per <strong>surface</strong>) that your CMS, Adobe, Optimizely, GTM, Epsilon, and custom code can activate—still
          anonymous, session-scoped by design.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href={DEMO_URL}
            className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-600"
            rel="noreferrer"
          >
            Try the live demo
          </a>
          <Link
            to="/signup"
            className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Get free access
          </Link>
        </div>
        <p className="mt-6 text-sm text-slate-500">
          No fingerprinting. No identity graph. No raw search queries. Session-scoped by design.
        </p>
      </div>

      <Section id="how-it-works" title="How it works">
        <ol className="list-decimal space-y-3 pl-5 text-slate-700">
          <li>Install one script</li>
          <li>Optiview reads the session in the browser</li>
          <li>You receive an experience decision envelope (primary + per-surface slots)</li>
          <li>Your tags or CMS code render, replace, or suppress the mapped surface</li>
        </ol>
        <CodeBlock label="Install snippet" code={scriptSnippet} />
      </Section>

      <Section title="What experience decisions can power">
        <ul className="grid gap-3 sm:grid-cols-2">
          {[
            "Soft popup",
            "Interstitial",
            "Offer, coupon, or rebate",
            "Lead form",
            "Guide or checklist download",
            "Product recommendation module",
            "Adobe Target or AEM component",
            "Optimizely experiment",
            "GTM trigger",
            "Epsilon or event stream payload",
          ].map((item) => (
            <li key={item} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Example anonymous visitor read">
        <Card title="Returning evaluator from organic search">
          <p className="mb-2">Reading implementation-focused content.</p>
          <p className="mb-2 font-medium text-slate-800">Need: make this framework practical.</p>
          <p>Recommended activation: implementation guide via inline CTA or soft popup.</p>
        </Card>
      </Section>

      <Section title="Built for anonymous-first activation">
        <p>
          Most personalization improves after login or a form fill. Optiview is an{" "}
          <strong>anonymous experience decision runtime</strong>: it recommends which surfaces to show or hold back on the
          first visits, using session-scoped context—so inline modules, offers, forms, guides, and experiments can follow
          the same contract your recipes define.
        </p>
      </Section>

      <Section title="Integrations">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card title="GTM / dataLayer">Push decision payloads into the tag manager layer your teams already use.</Card>
          <Card title="Adobe AEP / Web SDK">Send structured events aligned with your Adobe stack.</Card>
          <Card title="Adobe Client Data Layer / AEM">Feed component-level decisions from a shared data layer.</Card>
          <Card title="Adobe Target">Use decisions as input to Target activities and offers.</Card>
          <Card title="Optimizely">Wire the payload into experimentation and activation.</Card>
          <Card title="Epsilon / generic collectors">Emit compatible events for your event pipeline.</Card>
          <Card title="Custom CMS slots">Map surface IDs to regions in your headless or traditional CMS.</Card>
        </div>
        <p className="pt-2">
          <Link to="/integrations" className="text-sm font-medium text-accent hover:underline">
            View integration examples
          </Link>
        </p>
      </Section>

      <Section title="Privacy posture">
        <ul className="list-disc space-y-2 pl-5">
          <li>Anonymous sessionStorage scope for the decision envelope / personalization surface we expose in-browser</li>
          <li>No fingerprinting</li>
          <li>No cross-site identity graph</li>
          <li>No keystroke logging</li>
          <li>No raw form values</li>
          <li>Query themes only where applicable, not raw query storage in the product flow described here</li>
          <li>Customer-owned site analytics remain yours; Optiview does not replace your analytics contract</li>
        </ul>
        <p className="pt-2">
          <Link to="/privacy" className="text-sm font-medium text-accent hover:underline">
            Read the technical privacy overview
          </Link>
        </p>
      </Section>

      <div className="rounded-2xl border border-slate-200 bg-indigo-50/60 p-8 text-center">
        <h2 className="mb-2 text-xl font-semibold text-slate-900">Ready to try it?</h2>
        <p className="mb-6 text-slate-600">Get free access for your site, or explore the hosted demo first.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/signup"
            className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-600"
          >
            Start free
          </Link>
          <a
            href={DEMO_URL}
            className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
            rel="noreferrer"
          >
            See live demo
          </a>
        </div>
      </div>
    </div>
  );
}
