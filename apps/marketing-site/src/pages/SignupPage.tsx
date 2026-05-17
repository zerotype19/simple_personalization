import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config/publicUrls";

const TOOL_OPTIONS = ["Adobe", "Optimizely", "GTM", "Epsilon", "CMS", "Other"] as const;

export function SignupPage() {
  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-slate-900">Get free access</h1>
        <p className="text-slate-600">
          Request pilot access for your site. We review requests manually, then provision a tenant, site, and snippet key
          for the anonymous experience decision runtime.
        </p>
      </div>
      <SignupForm />
    </div>
  );
}

function SignupForm() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [useCase, setUseCase] = useState("");
  const [tools, setTools] = useState<string[]>([]);
  const [otherTool, setOtherTool] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTool(t: string) {
    setTools((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const toolsPayload = [...tools];
    if (otherTool.trim()) toolsPayload.push(`other:${otherTool.trim()}`);

    const url = import.meta.env.DEV ? "/signup-request" : `${API_URL}/signup-request`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          company,
          website,
          use_case: useCase,
          tools: toolsPayload,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Request failed. Try again or email hello@optiview.ai.");
        return;
      }
      if (data.ok) {
        navigate("/thank-you");
        return;
      }
      setError("Unexpected response.");
    } catch {
      setError("Network error. If the API is not deployed yet, email hello@optiview.ai with the same details.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(ev) => void onSubmit(ev)}
      className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <Field label="Name" value={name} onChange={setName} required autoComplete="name" />
      <Field label="Work email" type="email" value={email} onChange={setEmail} required autoComplete="email" />
      <Field label="Company" value={company} onChange={setCompany} required autoComplete="organization" />
      <Field label="Website / domain" value={website} onChange={setWebsite} required placeholder="example.com" />
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-800">Intended use case</label>
        <textarea
          required
          value={useCase}
          onChange={(e) => setUseCase(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
      <div>
        <span className="mb-2 block text-sm font-medium text-slate-800">Tools used today</span>
        <div className="flex flex-wrap gap-3">
          {TOOL_OPTIONS.map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={tools.includes(t)}
                onChange={() => toggleTool(t)}
                className="rounded border-slate-300"
              />
              {t}
            </label>
          ))}
        </div>
        <input
          type="text"
          value={otherTool}
          onChange={(e) => setOtherTool(e.target.value)}
          placeholder="Other tool name"
          className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-accent py-2.5 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  autoComplete,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-800">{label}</label>
      <input
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
    </div>
  );
}
