import { GitCompare } from "lucide-react";
import type { CompareResult } from "../types";

interface ComparePanelProps {
  onCompare: () => void;
  loading: boolean;
  result: CompareResult | null;
  disabled: boolean;
}

export default function ComparePanel({ onCompare, loading, result, disabled }: ComparePanelProps) {
  const isDisabled = disabled || loading;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-600/20">
          <GitCompare size={18} className="text-white" />
        </div>
        <h2 className="text-base font-black text-slate-800">Compare Distributions</h2>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-4">
        <button
          onClick={onCompare}
          disabled={isDisabled}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-6 py-2.5 font-semibold text-sm transition-colors"
        >
          {loading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Comparing…
            </>
          ) : (
            "Compare"
          )}
        </button>

        {disabled && !loading && (
          <p className="text-xs text-slate-400 font-medium">
            Generate data first to enable comparison
          </p>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Overall fidelity badge */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Overall Fidelity
            </span>
            <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-green-100 text-green-700 text-xl font-black">
              {(result.overallFidelity * 100).toFixed(1)}%
            </span>
          </div>

          {/* Stats table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {[
                    "Field",
                    "Real Mean",
                    "Synthetic Mean",
                    "Real Std Dev",
                    "Synthetic Std Dev",
                    "Fidelity Score",
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {result.stats.map((stat) => (
                  <tr key={stat.field} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-700 capitalize">
                      {stat.field}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{stat.realMean.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {stat.syntheticMean.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {stat.realStdDev.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {stat.syntheticStdDev.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          stat.fidelityScore >= 0.8
                            ? "bg-green-100 text-green-700"
                            : stat.fidelityScore >= 0.6
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {(stat.fidelityScore * 100).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-400 font-medium">
            Compared at{" "}
            {new Date(result.comparedAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
      )}
    </div>
  );
}
