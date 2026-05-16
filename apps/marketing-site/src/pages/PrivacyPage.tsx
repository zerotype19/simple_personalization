export function PrivacyPage() {
  return (
    <article className="max-w-3xl space-y-10 text-slate-700">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight text-slate-900">Privacy and data posture</h1>
      <p className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        This page is not legal advice; it explains the product&apos;s technical privacy posture at a high level.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-slate-900">What is collected</h2>
        <ul className="list-disc space-y-2 pl-5 text-slate-700">
          <li>Session-scoped signals derived from on-site behavior and page context, as implemented in your deployment.</li>
          <li>Optional telemetry to your own Worker or endpoints you configure, subject to your contracts and notices.</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-slate-900">What is not collected (by design)</h2>
        <ul className="list-disc space-y-2 pl-5 text-slate-700">
          <li>No cookies set by the Optiview snippet for visitor tracking.</li>
          <li>No browser fingerprinting for identity stitching.</li>
          <li>No cross-site identity graph inside Optiview — storage does not follow visitors across different sites.</li>
          <li>No keystroke logging.</li>
          <li>No raw form field values (<code className="rounded bg-slate-100 px-1 text-sm">input.value</code> /{" "}
            <code className="rounded bg-slate-100 px-1 text-sm">textarea.value</code>) in the runtime path.</li>
          <li>No raw on-site search query text stored for profiling — search is classified as structure-only intent, not query content.</li>
          <li>No PII in browser storage keys or values described below.</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-slate-900">Browser storage (visitor device)</h2>
        <p className="mb-4 text-slate-700">
          The snippet runs on <strong>your site&apos;s origin</strong>. Data stays in the visitor&apos;s browser unless you
          configure optional server collection to your Worker (<code className="rounded bg-slate-100 px-1 text-sm">/collect</code>
          ). Users can clear storage anytime via browser settings or private browsing.
        </p>
        <h3 className="mb-2 text-base font-semibold text-slate-900">sessionStorage (primary)</h3>
        <p className="mb-3 text-slate-700">
          Anonymous session state for the current tab/session lives in <strong>sessionStorage</strong>, including the
          session profile (<code className="rounded bg-slate-100 px-1 text-sm">si:session</code>), experience progression, and
          optional operator tooling (inspector mode, surface-map preview). It is cleared when the tab/session ends.
        </p>
        <h3 className="mb-2 text-base font-semibold text-slate-900">localStorage (one key only)</h3>
        <p className="mb-3 text-slate-700">
          Optiview may write <strong>one</strong> <code className="rounded bg-slate-100 px-1 text-sm">localStorage</code> key,{" "}
          <code className="rounded bg-slate-100 px-1 text-sm">si:returning</code>, on your origin to detect whether this browser
          has visited before. The value is a timestamp only — not used for identity stitching, not shared across sites, and not
          used to read or merge profiles on other domains.
        </p>
        <h3 className="mb-2 text-base font-semibold text-slate-900">Commercial intent memory</h3>
        <p className="text-slate-700">
          In-session commercial intent stores <strong>classifications only</strong> (action families, form types, blocker ids,
          momentum) inside the session profile — never clicked label text, field names, or form action URLs in buyer-facing
          output.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-slate-900">Where it runs</h2>
        <p className="text-slate-700">
          The snippet runs in the visitor&apos;s browser on your origin. Server-side components you operate (for example a
          Worker and database) remain under your Cloudflare account and policies.           Engineering teams can verify storage boundaries with the repository&apos;s{" "}
          <code className="rounded bg-slate-100 px-1 text-sm">docs/PRIVACY_QA.md</code> checklist.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-slate-900">Optional collect endpoint</h2>
        <p className="text-slate-700">
          If you enable collection to Optiview infrastructure, treat that stream like any other first-party analytics
          pipeline: disclose it, scope retention, and restrict access. Optiview does not replace your privacy policy or
          DPA work with downstream vendors.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-slate-900">Customer data ownership</h2>
        <p className="text-slate-700">
          You own your site, your tags, and your relationship with visitors. Optiview provides the decision and signal
          layer; you decide which tools receive which fields.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-slate-900">No identity resolution</h2>
        <p className="text-slate-700">
          Optiview is not an identity product. It is an <strong>anonymous experience decision runtime</strong>—not designed
          to resolve anonymous traffic to known individuals inside Optiview. Integrations you build on top of your own
          identity systems are your responsibility.
        </p>
      </section>
    </article>
  );
}
