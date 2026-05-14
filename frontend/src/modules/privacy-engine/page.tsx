"use client";

import { useState } from "react";
import { Database, AlertCircle, X } from "lucide-react";
import {
  generateSyntheticData,
  compareData,
  downloadReport,
} from "./lib/privacyEngineApi";
import type {
  GenerateParams,
  GenerateResult,
  CompareResult,
  DownloadParams,
  PrivacyEngineError,
} from "./types";
import GeneratePanel from "./components/GeneratePanel";
import ComparePanel from "./components/ComparePanel";
import DownloadPanel from "./components/DownloadPanel";

export default function PrivacyEnginePage() {
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState<"generate" | "compare" | "download" | null>(null);
  const [error, setError] = useState<PrivacyEngineError | null>(null);

  async function handleGenerate(params: GenerateParams) {
    setLoading("generate");
    setError(null);
    try {
      const result = await generateSyntheticData(params);
      setGenerateResult(result);
      setCompareResult(null);
    } catch (err) {
      setError({
        action: "Generate",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(null);
    }
  }

  async function handleCompare() {
    if (generateResult === null) return;
    setLoading("compare");
    setError(null);
    try {
      const result = await compareData({ syntheticRecords: generateResult.records });
      setCompareResult(result);
    } catch (err) {
      setError({
        action: "Compare",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(null);
    }
  }

  async function handleDownload(params: DownloadParams) {
    setLoading("download");
    setError(null);
    try {
      const blob = await downloadReport(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `synthetic-data.${params.format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError({
        action: "Download",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Database size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">Privacy Engine</h1>
            <p className="text-sm text-slate-400">Synthetic Data Generation &amp; Analysis</p>
          </div>
        </div>
      </div>

      {/* Inline error card */}
      {error !== null && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700">{error.action} failed</p>
            <p className="text-sm text-red-600 mt-0.5">{error.message}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="shrink-0 text-red-400 hover:text-red-600 transition-colors"
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Panels */}
      <GeneratePanel
        onGenerate={handleGenerate}
        loading={loading === "generate"}
        result={generateResult}
      />
      <ComparePanel
        onCompare={handleCompare}
        loading={loading === "compare"}
        result={compareResult}
        disabled={generateResult === null}
      />
      <DownloadPanel
        onDownload={handleDownload}
        loading={loading === "download"}
        disabled={generateResult === null}
      />
    </div>
  );
}
