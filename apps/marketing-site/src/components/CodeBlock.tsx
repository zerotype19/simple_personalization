import { useState } from "react";

type Props = {
  code: string;
  label?: string;
};

export function CopyLine({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
      <code className="min-w-0 flex-1 break-all text-slate-800">{code}</code>
      <button
        type="button"
        onClick={() => void copy()}
        className="shrink-0 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function CodeBlock({ code, label }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="relative rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
        {label ? <span className="text-xs font-medium text-slate-500">{label}</span> : <span />}
        <button
          type="button"
          onClick={() => void copy()}
          className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-sm leading-relaxed text-slate-800">
        <code>{code}</code>
      </pre>
    </div>
  );
}
