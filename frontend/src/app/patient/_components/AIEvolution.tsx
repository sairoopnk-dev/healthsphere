"use client";

import { useState, useEffect } from "react";
import { Brain, Sparkles, TrendingUp, Zap, Award } from "lucide-react";

interface EvolutionData {
  level: number;
  label: string;
  description: string;
  interactionCount: number;
  insightCount: number;
  nextLevelAt: number | null;
  progress: number;
}

interface AIEvolutionProps {
  userId: string;
  /** Compact mode for embedding in headers/cards */
  compact?: boolean;
}

const LEVEL_CONFIG: Record<string, { gradient: string; glow: string; icon: any; color: string; barGradient: string }> = {
  Generic:      { gradient: "from-slate-500 to-slate-600",   glow: "shadow-slate-500/20",  icon: Brain,      color: "text-slate-600",  barGradient: "from-slate-400 to-slate-500" },
  Learning:     { gradient: "from-blue-500 to-cyan-500",     glow: "shadow-blue-500/25",   icon: Zap,        color: "text-blue-600",   barGradient: "from-blue-400 to-cyan-400" },
  Adaptive:     { gradient: "from-violet-500 to-purple-500", glow: "shadow-violet-500/25", icon: TrendingUp, color: "text-violet-600", barGradient: "from-violet-400 to-purple-400" },
  Personalized: { gradient: "from-amber-500 to-yellow-500",  glow: "shadow-amber-500/25",  icon: Award,      color: "text-amber-600",  barGradient: "from-amber-400 to-yellow-400" },
};

export default function AIEvolution({ userId, compact = false }: AIEvolutionProps) {
  const [evolution, setEvolution] = useState<EvolutionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai/evolution/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setEvolution(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading || !evolution) return null;

  const config = LEVEL_CONFIG[evolution.label] || LEVEL_CONFIG.Generic;
  const Icon = config.icon;

  /* ── Compact badge (for topbar / headers) ── */
  if (compact) {
    return (
      <div className={`relative bg-gradient-to-r ${config.gradient} rounded-full px-4 py-2 text-xs font-bold text-white flex items-center gap-2 shadow-lg ${config.glow}`}
        style={{ animation: "fadeIn 500ms ease-out" }}
      >
        <Icon size={13} />
        <span>Lvl {evolution.level}</span>
        <span className="opacity-80">·</span>
        <span className="opacity-90">{evolution.label}</span>
        {evolution.label === "Personalized" && <Sparkles size={12} className="text-yellow-200" />}

        <style jsx>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to   { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    );
  }

  /* ── Full card ── */
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden"
      style={{ animation: "slideUp 300ms ease-out" }}
    >
      {/* Gradient top strip */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${config.gradient}`} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-md ${config.glow}`}>
              <Icon size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">AI Intelligence</h3>
              <p className={`text-xs font-semibold ${config.color}`}>{evolution.description}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-black ${config.color}`}>{evolution.level}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Level</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{evolution.label}</span>
            {evolution.nextLevelAt && (
              <span className="text-[10px] font-bold text-slate-400">
                {evolution.interactionCount}/{evolution.nextLevelAt} interactions
              </span>
            )}
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${config.barGradient} rounded-full transition-all duration-1000 ease-out`}
              style={{ width: `${evolution.progress}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
            <p className="text-lg font-black text-slate-800">{evolution.interactionCount}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interactions</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
            <p className="text-lg font-black text-slate-800">{evolution.insightCount}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patterns Found</p>
          </div>
        </div>

        {/* Level progression */}
        <div className="mt-4 flex items-center justify-between text-[10px] font-bold">
          {["Generic", "Learning", "Adaptive", "Personalized"].map((label, i) => {
            const isActive = i + 1 <= evolution.level;
            const isCurrent = i + 1 === evolution.level;
            return (
              <div key={label} className="flex flex-col items-center gap-1">
                <div className={`w-3 h-3 rounded-full transition-all duration-500 ${
                  isCurrent
                    ? `bg-gradient-to-br ${config.gradient} ring-4 ring-offset-1 ${config.glow} ring-current/20`
                    : isActive
                    ? "bg-slate-400"
                    : "bg-slate-200"
                }`} />
                <span className={isCurrent ? config.color : isActive ? "text-slate-500" : "text-slate-300"}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
