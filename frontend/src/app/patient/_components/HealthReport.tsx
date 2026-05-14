"use client";

import { useState, useEffect } from "react";
import {
  Brain, AlertTriangle, Heart, Shield,
  FileText, Pill, TrendingUp, RefreshCw, Sparkles,
} from "lucide-react";
import AIEvolution from "./AIEvolution";

interface HealthReportData {
  riskIndicators:   { pattern: string; count: number; confidence: string }[];
  behaviorPatterns: { pattern: string; count: number; confidence: string }[];
  conditions:       string[];
  medications:      string[];
  allergies:        string[];
  totalInteractions: number;
  reportGeneratedAt: string;
  contextSummary:   string;
  contextBullets:   { category: string; items: string[] }[];
}

interface HealthReportProps {
  userId: string;
}

const CONFIDENCE_DOT: Record<string, string> = {
  high:   "bg-red-500",
  medium: "bg-amber-400",
  low:    "bg-slate-300",
};

export default function HealthReport({ userId }: HealthReportProps) {
  const [report, setReport] = useState<HealthReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`http://localhost:8000/api/ai/health-report/${userId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to generate report");
      setReport(data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Report generation failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-7 flex items-center gap-5 shadow-xl">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
            <Brain size={28} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Health Intelligence Report</h2>
            <p className="text-slate-400 text-sm mt-1">Generating your personalized report...</p>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-white rounded-3xl border border-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-3xl p-6 text-red-600 font-semibold text-sm">
        ⚠️ {error}
      </div>
    );
  }

  if (!report) return null;

  const hasInsights = report.riskIndicators.length > 0 || report.behaviorPatterns.length > 0;
  const hasContext = report.conditions.length > 0 || report.medications.length > 0 || report.allergies.length > 0;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-7 flex items-center gap-5 shadow-xl">
        <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/25">
          <Brain size={28} className="text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            Health Intelligence Report
            <Sparkles size={20} className="text-amber-400" />
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Based on {report.totalInteractions} interaction{report.totalInteractions !== 1 ? "s" : ""} •
            Generated {new Date(report.reportGeneratedAt).toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={fetchReport}
          className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          title="Refresh report"
        >
          <RefreshCw size={16} className="text-white" />
        </button>
      </div>

      {/* AI Evolution Card */}
      <AIEvolution userId={userId} />

      {/* Empty state */}
      {!hasInsights && !hasContext && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-14 text-center">
          <Brain size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-500 font-bold text-lg">No insights yet</p>
          <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
            Use the Symptom Checker, Diet Plan Generator, or upload medical records.
            The AI will learn from your interactions and build your health profile over time.
          </p>
        </div>
      )}

      {/* Risk Indicators */}
      {report.riskIndicators.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-red-400 to-rose-400" />
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={18} className="text-red-600" />
              <h3 className="text-base font-black text-slate-800">Risk Indicators</h3>
              <span className="ml-auto text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                {report.riskIndicators.length} flagged
              </span>
            </div>
            <div className="space-y-2.5">
              {report.riskIndicators.map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gradient-to-r from-red-50/50 to-transparent rounded-xl px-4 py-3 border border-red-100/40">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${CONFIDENCE_DOT[item.confidence] || CONFIDENCE_DOT.low}`} />
                  <span className="text-sm font-bold text-slate-800 capitalize flex-1">{item.pattern}</span>
                  <span className="text-xs font-bold text-slate-500 bg-white border border-slate-100 px-2.5 py-1 rounded-lg">
                    {item.count}× detected
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Behavior Patterns */}
      {report.behaviorPatterns.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-violet-400 to-purple-400" />
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Heart size={18} className="text-violet-600" />
              <h3 className="text-base font-black text-slate-800">Behavior Patterns</h3>
            </div>
            <div className="space-y-2.5">
              {report.behaviorPatterns.map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gradient-to-r from-violet-50/50 to-transparent rounded-xl px-4 py-3 border border-violet-100/40">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${CONFIDENCE_DOT[item.confidence] || CONFIDENCE_DOT.low}`} />
                  <span className="text-sm font-bold text-slate-800 capitalize flex-1">{item.pattern}</span>
                  <span className="text-xs font-bold text-slate-500 bg-white border border-slate-100 px-2.5 py-1 rounded-lg">
                    {item.count}×
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Medical Context — Readable Summary */}
      {(report.contextSummary || report.contextBullets.length > 0 || hasContext) && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-teal-400 to-emerald-400" />
          <div className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Shield size={18} className="text-teal-600" />
              <h3 className="text-base font-black text-slate-800">Your Health Summary</h3>
            </div>

            {/* Paragraph summary */}
            {report.contextSummary && (
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-5 border border-teal-100/50 mb-5">
                <p className="text-sm text-slate-700 leading-relaxed font-medium">
                  {report.contextSummary}
                </p>
              </div>
            )}

            {/* Grouped bullet points */}
            {report.contextBullets && report.contextBullets.length > 0 && (
              <div className="space-y-4">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Detailed Breakdown</p>
                {report.contextBullets.map((group: { category: string; items: string[] }, idx: number) => {
                  const isAllergyOrMed = group.category.includes('Allerg') || group.category.includes('Medication');
                  const dotColor = group.category.includes('Digestive') ? 'bg-amber-400' :
                    group.category.includes('Pain') ? 'bg-orange-400' :
                    group.category.includes('Respiratory') ? 'bg-blue-400' :
                    group.category.includes('Mental') ? 'bg-violet-400' :
                    group.category.includes('Skin') ? 'bg-pink-400' :
                    group.category.includes('Allerg') ? 'bg-red-400' :
                    group.category.includes('Medication') ? 'bg-purple-400' :
                    group.category.includes('Known') ? 'bg-indigo-400' :
                    'bg-slate-400';
                  const borderColor = group.category.includes('Allerg') ? 'border-red-100/60' :
                    group.category.includes('Medication') ? 'border-purple-100/60' :
                    'border-slate-100';
                  return (
                    <div key={idx} className={`bg-white rounded-xl p-4 border ${borderColor} shadow-sm`}>
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                        <h4 className="text-sm font-bold text-slate-700">{group.category}</h4>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pl-5">
                        {group.items.map((item: string, i: number) => (
                          <span
                            key={i}
                            className={`text-xs font-semibold capitalize px-2.5 py-1 rounded-lg ${
                              isAllergyOrMed
                                ? 'bg-red-50 text-red-700 border border-red-100/60'
                                : 'bg-slate-50 text-slate-700 border border-slate-100'
                            }`}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Fallback: raw tags if no contextSummary/contextBullets but hasContext */}
            {!report.contextSummary && (!report.contextBullets || report.contextBullets.length === 0) && hasContext && (
              <div className="space-y-3">
                {report.conditions.length > 0 && (
                  <p className="text-sm text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-800">Conditions: </span>
                    {report.conditions.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}
                  </p>
                )}
                {report.medications.length > 0 && (
                  <p className="text-sm text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-800">Medications: </span>
                    {report.medications.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ')}
                  </p>
                )}
                {report.allergies.length > 0 && (
                  <p className="text-sm text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-800">Allergies: </span>
                    {report.allergies.join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-xs text-slate-400 font-medium text-center">
        ⚠️ This report is AI-generated based on your interaction history. Always consult a qualified healthcare professional for medical decisions.
      </div>
    </div>
  );
}
