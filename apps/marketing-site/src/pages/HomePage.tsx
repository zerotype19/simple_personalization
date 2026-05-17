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
          Commercial judgment for anonymous traffic
        </h1>
        <p className="mb-6 max-w-2xl text-lg text-slate-600">
          Optiview helps websites decide <strong>what experience to show next</strong> — and{" "}
          <strong>when to hold back</strong> — before identity exists.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href={DEMO_URL}
            className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-600"
            rel="noreferrer"
          >
            See live demo
          </a>
          <Link
            to="/signup"
            className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Get free access
          </Link>
        </div>
        <p className="mt-6 text-sm text-slate-500">
          Not identity resolution. Not a popup tool. Restraint is part of the product.
        </p>
      </div>

      <Section id="what" title="What Optiview does">
        <ul className="list-disc space-y-2 pl-5">
          <li>Interprets <strong>anonymous commercial behavior</strong> on your site — comparison, financing, scheduling, and more.</li>
          <li>Understands <strong>intent, blockers, and momentum</strong> in plain language.</li>
          <li>Recommends <strong>experience decisions</strong> per surface — show, defer, or suppress.</li>
          <li>
            Explains <strong>why escalation is or is not earned</strong> — high intent does not automatically mean interrupt
            harder.
          </li>
        </ul>
      </Section>

      <Section id="different" title="Why it is different">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["Not identity resolution", "No cross-site graph. No fingerprinting. Session-scoped on your origin."],
            ["Not a popup tool", "Decisions can be inline, deferred, or null — withholding is first-class."],
            ["Not a CDP", "Commercial judgment for the visit, not a warehouse of profiles."],
            ["Not generic personalization", "Restraint and reassurance are valid outcomes — not every signal earns pressure."],
          ].map(([title, body]) => (
            <Card key={title} title={title}>
              {body}
            </Card>
          ))}
        </div>
      </Section>

      <Section id="how-it-works" title="How it works">
        <ol className="list-decimal space-y-3 pl-5">
          <li>Install one async tag on your site.</li>
          <li>Optiview reads page roles, CTAs, forms, and marked surfaces — structure only, not what visitors type.</li>
          <li>The runtime emits <strong>experience decisions</strong> in the browser (no round trip required for judgment).</li>
          <li>
            Feed decisions to <strong>GTM</strong>, <strong>Adobe</strong>, <strong>Optimizely</strong>, <strong>AEM</strong>,{" "}
            <strong>Shopify</strong>, <strong>React</strong>, or your CMS — you control what actually renders.
          </li>
        </ol>
        <CodeBlock label="Install snippet" code={scriptSnippet} />
        <p className="text-sm">
          <Link to="/install" className="font-medium text-accent hover:underline">
            Full install checklist
          </Link>
          {" · "}
          <Link to="/integrations" className="font-medium text-accent hover:underline">
            Integration examples
          </Link>
        </p>
      </Section>

      <Section id="demo" title="Demo and proof">
        <p>
          The hosted demo at{" "}
          <a href={DEMO_URL} className="font-medium text-accent hover:underline" rel="noreferrer">
            demo.optiview.ai
          </a>{" "}
          walks a controlled auto-retail journey: <strong>compare vehicles</strong> →{" "}
          <strong>review financing</strong> → <strong>book a test drive</strong> → submit a scheduling request.
        </p>
        <p>
          Open the <strong>buyer judgment panel</strong> (SI control, bottom-left) to read the live commercial read, runtime
          experience depth, recommended next experience, and why stronger escalation was withheld — the same story you can show
          in a pilot review.
        </p>
        <div className="pt-2">
          <a
            href={DEMO_URL}
            className="inline-flex rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-600"
            rel="noreferrer"
          >
            Open demo.optiview.ai
          </a>
        </div>
      </Section>

      <Section id="privacy" title="Privacy posture">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Anonymous</strong> — session-scoped decisions; not designed to resolve visitors to known individuals.
          </li>
          <li>
            <strong>First-party</strong> — runs on your origin; storage does not follow visitors across other sites.
          </li>
          <li>
            <strong>sessionStorage</strong> for anonymous session state (<code className="text-xs">si:session</code> and related keys).
          </li>
          <li>
            <strong>One localStorage key only</strong>: <code className="text-xs">si:returning</code> (timestamp for return-visit detection).
          </li>
          <li>No tracking cookies from the snippet · no fingerprinting · no raw form values · no raw search query storage.</li>
          <li>Optional <code className="text-xs">/collect</code> to your Worker — you control whether server collection is enabled.</li>
        </ul>
        <p className="pt-2">
          <Link to="/privacy" className="text-sm font-medium text-accent hover:underline">
            Read the technical privacy overview
          </Link>
        </p>
      </Section>

      <div className="rounded-2xl border border-slate-200 bg-indigo-50/60 p-8 text-center">
        <h2 className="mb-2 text-xl font-semibold text-slate-900">Ready for a pilot?</h2>
        <p className="mb-6 text-slate-600">See the live demo, then request free access for your domain.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href={DEMO_URL}
            className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-600"
            rel="noreferrer"
          >
            See live demo
          </a>
          <Link
            to="/signup"
            className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Request pilot access
          </Link>
        </div>
      </div>
    </div>
  );
}
