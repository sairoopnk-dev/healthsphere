import { useState } from "react";
import { Download } from "lucide-react";
import type { DownloadParams } from "../types";

interface DownloadPanelProps {
  onDownload: (params: DownloadParams) => void;
  loading: boolean;
  disabled: boolean;
}

export default function DownloadPanel({ onDownload, loading, disabled }: DownloadPanelProps) {
  const [format, setFormat] = useState<"csv" | "json">("csv");

  const isDisabled = disabled || loading;

  function handleDownload() {
    onDownload({ format });
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-600/20">
          <Download size={18} className="text-white" />
        </div>
        <h2 className="text-base font-black text-slate-800">Download Report</h2>
      </div>

      {/* Format selector */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Format</span>
        <div className="flex gap-2">
          {(["csv", "json"] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setFormat(fmt)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                format === fmt
                  ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-teal-400 hover:text-teal-600"
              }`}
            >
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleDownload}
          disabled={isDisabled}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-6 py-2.5 font-semibold text-sm transition-colors"
        >
          {loading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Downloading…
            </>
          ) : (
            <>
              <Download size={14} />
              Download
            </>
          )}
        </button>

        {disabled && !loading && (
          <p className="text-xs text-slate-400 font-medium">
            Generate data first to enable download
          </p>
        )}
      </div>
    </div>
  );
}
