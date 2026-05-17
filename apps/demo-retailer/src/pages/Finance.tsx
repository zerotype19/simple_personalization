import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSiPage } from "../hooks/useSiPage";

export default function FinancePage() {
  useSiPage("finance");
  const [price, setPrice] = useState(38990);
  const [apr, setApr] = useState(5.9);
  const [term, setTerm] = useState(60);

  const payment = useMemo(() => {
    const principal = Math.max(0, price - 3500);
    const r = apr / 100 / 12;
    if (r === 0) return principal / term;
    const pow = (1 + r) ** term;
    return (principal * (r * pow)) / (pow - 1);
  }, [price, apr, term]);

  return (
    <div className="space-y-6" data-si-surface="finance_payment_assist">
      <div>
        <h1 className="text-xl font-semibold text-white">Review financing options</h1>
        <p className="mt-1 text-sm text-slate-400">
          Adjust payment inputs — this is where reassurance often matters more than a harder dealer ask.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4" data-si-finance>
        <p className="text-2xl font-semibold text-white" data-si-price>
          ~${Math.round(payment).toLocaleString()}/mo
        </p>
        <label className="mt-4 block text-xs text-slate-500">
          Price
          <input
            type="range"
            min={25000}
            max={65000}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
        <button
          type="button"
          data-si-cta="finance"
          data-si-intent="view_financing"
          className="mt-4 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
          onClick={() => setApr((a) => (a > 4 ? 4.5 : 6.2))}
        >
          Toggle APR scenario
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/test-drive"
          data-si-intent="schedule_test_drive"
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
        >
          Book a test drive
        </Link>
        <Link to="/compare" className="text-sm text-slate-500 hover:text-slate-300">
          Back to compare
        </Link>
      </div>
    </div>
  );
}
