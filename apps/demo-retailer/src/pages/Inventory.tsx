import { Link } from "react-router-dom";
import { useSiPage } from "../hooks/useSiPage";
import { VEHICLES } from "../data/vehicles";

export default function InventoryPage() {
  useSiPage("inventory");

  return (
    <div className="space-y-6" data-si-surface="inventory_assist_module">
      <div>
        <h1 className="text-xl font-semibold text-white">View inventory</h1>
        <p className="mt-1 text-sm text-slate-400">Optional browse — not part of the core recommended path.</p>
      </div>

      <ul className="space-y-2">
        {VEHICLES.slice(0, 4).map((v) => (
          <li key={v.id}>
            <button
              type="button"
              data-si-price
              className="w-full rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-left text-sm text-slate-200 hover:border-slate-600"
            >
              {v.name} · ${v.price.toLocaleString()}
            </button>
          </li>
        ))}
      </ul>

      <Link to="/compare" className="text-sm text-indigo-300 hover:text-indigo-200">
        Continue with compare →
      </Link>
    </div>
  );
}
