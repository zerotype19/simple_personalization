import { FormEvent, useState } from "react";
import { markConversion } from "@si/sdk";
import { useSiPage } from "../hooks/useSiPage";

export default function TestDrivePage() {
  useSiPage("test_drive");
  const [note, setNote] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    markConversion("lead_submit");
    window.dispatchEvent(new CustomEvent("si:conversion", { detail: { type: "lead_submit" } }));
    alert("Thanks — demo lead submitted. Conversion event fired.");
    setNote("");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Schedule a test drive</h1>
        <p className="mt-2 text-sm text-slate-300">
          This form intentionally avoids collecting PII. Submitting fires a conversion signal for lift tracking.
        </p>
      </div>

      <form onSubmit={onSubmit} className="rounded-3xl border border-slate-800 bg-slate-950/40 p-8">
        <label className="block text-xs text-slate-400">
          Notes (optional)
          <textarea
            className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g., interested in hybrid SUV, evenings only"
          />
        </label>

        <button
          type="submit"
          data-si-cta="primary"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-400"
        >
          Submit demo lead
        </button>
      </form>
    </div>
  );
}
