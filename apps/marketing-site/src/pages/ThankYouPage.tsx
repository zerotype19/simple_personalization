import { Link } from "react-router-dom";

export function ThankYouPage() {
  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Thank you</h1>
      <p className="text-slate-600">
        Thanks — we&apos;ll set up your free access and send your snippet key after we review your request.
      </p>
      <Link to="/" className="inline-block text-sm font-medium text-accent hover:underline">
        Back to home
      </Link>
    </div>
  );
}
