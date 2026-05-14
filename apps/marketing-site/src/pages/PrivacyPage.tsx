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
          <li>No browser fingerprinting for identity stitching.</li>
          <li>No cross-site identity graph inside Optiview.</li>
          <li>No keystroke logging.</li>
          <li>No raw form field values as part of the Session Intelligence signal path described for customers.</li>
          <li>Where query context appears, the product is oriented toward themes or classifications rather than storing raw search strings for profiling.</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-slate-900">Where it runs</h2>
        <p className="text-slate-700">
          The snippet runs in the visitor&apos;s browser on your origin. Session-scoped storage may be used for
          in-browser coordination. Server-side components you operate (for example a Worker and database) remain under
          your Cloudflare account and policies.
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
          You own your site, your tags, and your relationship with visitors. Optiview provides the signal layer; you
          decide which tools receive which fields.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-slate-900">No identity resolution</h2>
        <p className="text-slate-700">
          Session Intelligence is not an identity product. It is not designed to resolve anonymous traffic to known
          individuals inside Optiview. Integrations you build on top of your own identity systems are your
          responsibility.
        </p>
      </section>
    </article>
  );
}
