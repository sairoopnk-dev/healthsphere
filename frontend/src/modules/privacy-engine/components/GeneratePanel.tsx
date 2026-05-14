import { useState } from "react";
import { Database, Loader2 } from "lucide-react";
import type { GenerateParams, GenerateResult } from "../types";
import DataTable from "./DataTable";

interface GeneratePanelProps {
  onGenerate: (params: GenerateParams) => void;
  loading: boolean;
  result: GenerateResult | null;
}

export default function GeneratePanel({ onGenerate, loading, result }: GeneratePanelProps) {
  const [recordCount, setRecordCount] = useState(100);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onGenerate({ recordCount });
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
          <Database size={18} className="text-white" />
        </div>
        <h2 className="text-base font-black text-slate-800">Generate Synthetic Data</h2>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="recordCount"
            className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
          >
            Number of Records
          </label>
          <input
            id="recordCount"
            type="number"
            min={1}
            max={10000}
            value={recordCount}
            onChange={(e) => setRecordCount(Number(e.target.value))}
            className="w-40 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl px-6 py-2.5 font-semibold text-sm transition-colors"
        >
          {loading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Generating…
            </>
          ) : (
            "Generate"
          )}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div className="space-y-3">
          <DataTable records={result.records} />
          <p className="text-xs text-slate-400 font-medium">
            Generated at{" "}
            {new Date(result.generatedAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            {" · "}
            {result.count.toLocaleString()} record{result.count !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
