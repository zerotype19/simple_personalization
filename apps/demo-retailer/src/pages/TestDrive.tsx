import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { markConversion } from "@si/sdk";
import { openInspectorAfterSubmit } from "../demo/demoActions";
import { useSiPage } from "../hooks/useSiPage";

export default function TestDrivePage() {
  useSiPage("test_drive");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    markConversion("lead_submit");
    window.dispatchEvent(new CustomEvent("si:conversion", { detail: { type: "lead_submit" } }));
    setSubmitted(true);
    setNote("");
    openInspectorAfterSubmit();
  }

  return (
    <div className="mx-auto max-w-lg space-y-6" data-si-surface="test_drive_secondary_cta">
      <div>
        <h1 className="text-xl font-semibold text-white">Book a test drive</h1>
        <p className="mt-1 text-sm text-slate-400">
          Submit the request — Optiview reads structure only, not what you type.
        </p>
      </div>

      <form onSubmit={onSubmit} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <label className="block text-xs text-slate-500">
          Notes (optional — not stored)
          <textarea
            className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional"
          />
        </label>
        <button
          type="submit"
          data-si-cta="primary"
          data-si-intent="schedule_test_drive"
          className="mt-4 w-full rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400"
        >
          Submit test-drive request
        </button>
      </form>

      {submitted ? (
        <div className="space-y-2 rounded-lg border border-indigo-500/25 bg-indigo-950/30 px-3 py-2.5 text-sm text-indigo-100/90">
          <p>Submitted — the inspector should open in buyer view with the live read highlighted.</p>
          <p className="text-xs leading-relaxed text-slate-400">
            Submitting the form is a high-intent action. Optiview may still withhold additional interruption if
            the best next move is restraint.
          </p>
        </div>
      ) : null}

      <Link to="/finance" className="text-sm text-slate-500 hover:text-slate-300">
        Back to financing
      </Link>
    </div>
  );
}
