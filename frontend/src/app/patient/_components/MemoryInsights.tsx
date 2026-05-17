"use client";

import { useState, useEffect } from "react";
import {
  Brain, RefreshCw, TrendingUp, Activity, FileText, AlertTriangle,
  ChevronDown, ChevronUp, Heart, Zap, Shield,
} from "lucide-react";

interface InsightItem {
  pattern: string;
  category: "symptom" | "condition" | "behavior" | "risk";
  count: number;
  confidence: "low" | "medium" | "high";
  firstDetected: string;
  lastUpdated: string;
}

interface EvolutionData {
  level: number;
  label: string;
  description: string;
  interactionCount: number;
  insightCount: number;
  nextLevelAt: number | null;
  progress: number;
}

interface InsightsResponse {
  insights: InsightItem[];
  evolution: EvolutionData;
}

interface MemoryInsightsProps {
  userId: string;
}

const CATEGORY_CONFIG: Record<string, { icon: any; gradient: string; border: string; text: string; bg: string; label: string }> = {
  symptom:   { icon: Activity,       gradient: "from-amber-50 to-orange-50",  border: "border-amber-100/60",  text: "text-amber-700",  bg: "bg-white/80 border-amber-200/60", label: "Recurring Symptoms" },
  condition: { icon: FileText,       gradient: "from-blue-50 to-indigo-50",   border: "border-blue-100/60",   text: "text-blue-700",   bg: "bg-white/80 border-blue-200/60",  label: "Known Conditions" },
  risk:      { icon: AlertTriangle,  gradient: "from-red-50 to-rose-50",      border: "border-red-100/60",    text: "text-red-700",    bg: "bg-white/80 border-red-200/60",   label: "Risk Indicators" },
  behavior:  { icon: Heart,          gradient: "from-violet-50 to-purple-50", border: "border-violet-100/60", text: "text-violet-700", bg: "bg-white/80 border-violet-200/60", label: "Behavior Patterns" },
};

const CONFIDENCE_BADGE: Record<string, { bg: string; text: string; pulse?: boolean }> = {
  high:   { bg: "bg-red-100",    text: "text-red-700",    pulse: true },
  medium: { bg: "bg-amber-100",  text: "text-amber-700" },
  low:    { bg: "bg-slate-100",  text: "text-slate-500" },
};

export default function MemoryInsights({ userId }: MemoryInsightsProps) {
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(true);
  const [openWeek, setOpenWeek] = useState<string>("Week 1");

  const fetchInsights = async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai/insights/${userId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to fetch insights");
      setData(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load insights");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [userId]);

  const insights = data?.insights || [];
  const hasData = insights.length > 0;

  // Group insights by week based on actual dates
  const weeklyData = insights.reduce<Record<string, InsightItem[]>>((acc, item) => {
    const itemDate = new Date(item.lastUpdated || item.firstDetected || new Date());
    const today = new Date();
    
    // Normalize to start of day for accurate day calculation
    itemDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - itemDate.getTime();
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    
    let weekNum = 1; // Week 1 (0-6 days ago)
    if (diffDays >= 7 && diffDays <= 13) weekNum = 2; // Week 2 (7-13 days ago)
    else if (diffDays >= 14 && diffDays <= 20) weekNum = 3; // Week 3 (14-20 days ago)
    else if (diffDays >= 21) weekNum = 4; // Week 4 (21+ days ago)
    
    const weekKey = `Week ${weekNum}`;
    acc[weekKey].push(item);
    return acc;
  }, { "Week 1": [], "Week 2": [], "Week 3": [], "Week 4": [] });

  // Don't render at all if empty
  if (!loading && !error && !hasData) return null;

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden transition-all duration-300">
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpanded(!expanded); }}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
            <Brain size={18} className="text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-slate-800">Memory Insights</h3>
            <p className="text-xs text-slate-500">
              {hasData
                ? `${insights.length} pattern${insights.length !== 1 ? "s" : ""} detected`
                : "AI-powered health pattern analysis"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); fetchInsights(); }}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            title="Refresh insights"
          >
            <RefreshCw size={14} className={`text-slate-400 ${loading ? "animate-spin" : ""}`} />
          </button>
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </div>

      {/* Expandable content */}
      {expanded && (
        <div className="px-6 pb-5 space-y-4" style={{ animation: "slideDown 200ms ease-out" }}>
          {/* Loading */}
          {loading && !data && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-red-600 text-sm font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Insights by Week (Accordion) */}
          {hasData && ["Week 1", "Week 2", "Week 3", "Week 4"].map(weekKey => {
            const weekItems = weeklyData[weekKey] || [];
            const isWeekOpen = openWeek === weekKey;

            // Group items inside the week by category
            const groupedByCat = weekItems.reduce<Record<string, InsightItem[]>>((acc, item) => {
              const cat = item.category || "symptom";
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(item);
              return acc;
            }, {});

            return (
              <div key={weekKey} className="border border-slate-200/60 rounded-2xl overflow-hidden mb-3 last:mb-0 bg-white/40">
                <button
                  onClick={() => setOpenWeek(isWeekOpen ? "" : weekKey)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-100/80 transition-colors"
                >
                  <span className="font-bold text-sm text-slate-800">{weekKey}</span>
                  {isWeekOpen ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                </button>

                {isWeekOpen && (
                  <div className="p-4 space-y-4" style={{ animation: "slideDown 200ms ease-out" }}>
                    {weekItems.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-2">No records available</p>
                    ) : (
                      Object.entries(groupedByCat).map(([category, items]) => {
                        const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.symptom;
                        const Icon = config.icon;

                        return (
                          <div key={category} className={`bg-gradient-to-r ${config.gradient} rounded-2xl p-4 border ${config.border}`}>
                            {/* Category header */}
                            <div className="flex items-center gap-2 mb-3">
                              <Icon size={14} className={config.text} />
                              <h4 className={`text-xs font-black uppercase tracking-wider ${config.text}`}>
                                {config.label}
                              </h4>
                              <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${config.text} bg-white/60`}>
                                {items.length}
                              </span>
                            </div>

                            {/* Pattern items */}
                            <div className="space-y-2">
                              {items.map((item, i) => {
                                const badge = CONFIDENCE_BADGE[item.confidence] || CONFIDENCE_BADGE.low;
                                return (
                                  <div
                                    key={i}
                                    className={`flex items-center justify-between ${config.bg} rounded-xl px-3 py-2.5 border shadow-sm`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {item.confidence === "high" && (
                                        <span className="relative flex h-2 w-2 shrink-0">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                                        </span>
                                      )}
                                      <span className="text-xs font-bold text-slate-800 capitalize truncate">
                                        {item.pattern}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                      <span className="text-[10px] font-bold text-slate-500">
                                        {item.count}×
                                      </span>
                                      <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                                        {item.confidence}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Summary message for top items */}
                            {items.length > 0 && items[0].count >= 3 && (
                              <p className={`mt-2.5 text-[11px] font-semibold ${config.text} opacity-80`}>
                                ⚡ You&apos;ve reported &ldquo;{items[0].pattern}&rdquo; {items[0].count} times — consider discussing this with your doctor
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
