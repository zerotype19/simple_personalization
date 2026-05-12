import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSiPage } from "../hooks/useSiPage";

export default function FinancePage() {
  useSiPage("finance");
  const [price, setPrice] = useState(38990);
  const [down, setDown] = useState(3500);
  const [apr, setApr] = useState(5.9);
  const [term, setTerm] = useState(60);

  const payment = useMemo(() => {
    const principal = Math.max(0, price - down);
    const r = apr / 100 / 12;
    if (r === 0) return principal / term;
    const pow = (1 + r) ** term;
    return (principal * (r * pow)) / (pow - 1);
  }, [price, down, apr, term]);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-8">
        <h1 className="text-2xl font-semibold text-white">Payment estimator</h1>
        <p className="mt-2 text-sm text-slate-300">
          Move sliders and inputs to generate finance interactions. This page is tagged as{" "}
          <span className="rounded bg-slate-900 px-2 py-1 text-xs text-slate-200">finance</span>.
        </p>

        <div className="mt-6 space-y-4" data-si-finance>
          <label className="block text-xs text-slate-400">
            Vehicle price
            <input
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </label>
          <label className="block text-xs text-slate-400">
            Down payment
            <input
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
              type="number"
              value={down}
              onChange={(e) => setDown(Number(e.target.value))}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs text-slate-400">
              APR (%)
              <input
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
                type="number"
                step="0.1"
                value={apr}
                onChange={(e) => setApr(Number(e.target.value))}
              />
            </label>
            <label className="block text-xs text-slate-400">
              Term (months)
              <input
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
                type="number"
                value={term}
                onChange={(e) => setTerm(Number(e.target.value))}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-indigo-500/15 to-slate-950 p-8">
          <div className="text-xs font-semibold uppercase tracking-wide text-indigo-200">
            Monthly payment
          </div>
          <div data-si-price className="mt-2 text-5xl font-semibold tracking-tight text-white">
            ${Math.max(0, Math.round(payment)).toLocaleString()}
            <span className="text-base font-medium text-slate-300">/mo</span>
          </div>
          <p className="mt-3 text-sm text-slate-300">
            Demo math only. Real approvals depend on lender, taxes, fees, and incentives.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              data-si-cta="primary"
              className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100"
              to="/inventory"
            >
              Shop vehicles at this payment
            </Link>
            <Link
              data-si-cta="compare"
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-950/30 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-900"
              to="/compare"
            >
              Compare top picks
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-8">
          <div className="text-sm font-semibold text-white">Financing CTA</div>
          <p className="mt-2 text-sm text-slate-300">
            Apply online in minutes—no obligation. This is intentionally generic demo copy.
          </p>
          <button
            type="button"
            data-si-cta="finance"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-400"
          >
            Start a finance application (demo)
          </button>
        </div>
      </div>
    </div>
  );
}
