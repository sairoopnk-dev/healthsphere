"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, HeartHandshake, Sparkles, SmilePlus, RefreshCw } from "lucide-react";
import { usePatient } from "../_context/PatientContext";

/* ── Types ─────────────────────────────────────────────────────────────── */
type MoodTag = "positive" | "neutral" | "negative";
type Role = "user" | "bot";

interface ChatMessage {
  role: Role;
  content: string;
  moodTag?: MoodTag;
  timestamp: string | Date;
}

/* ── Constants ─────────────────────────────────────────────────────────── */
const API = "http://localhost:8000";

const SUGGESTED_PROMPTS = [
  "I feel stressed today",
  "I'm feeling anxious",
  "I had a really bad day",
  "I'm feeling lonely",
  "I can't sleep well",
  "I feel overwhelmed",
];

const MOOD_CONFIG: Record<MoodTag, { color: string; bg: string; label: string; emoji: string }> = {
  positive: { color: "text-emerald-600", bg: "bg-emerald-50", label: "Positive", emoji: "😊" },
  neutral:  { color: "text-slate-500",   bg: "bg-slate-50",   label: "Neutral",  emoji: "😐" },
  negative: { color: "text-rose-500",    bg: "bg-rose-50",    label: "Low",      emoji: "😔" },
};

/* ── Wellness Ring ─────────────────────────────────────────────────────── */
function WellnessRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (score / 100) * circumference;

  const scoreColor =
    score >= 70 ? "#10b981" :
    score >= 40 ? "#f59e0b" :
    "#f43f5e";

  const label =
    score >= 75 ? "Thriving" :
    score >= 55 ? "Stable" :
    score >= 35 ? "Struggling" :
    "Needs Support";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 136 136">
          {/* Track */}
          <circle
            cx="68" cy="68" r={radius}
            fill="none" stroke="#e2e8f0"
            strokeWidth="10"
          />
          {/* Progress */}
          <circle
            cx="68" cy="68" r={radius}
            fill="none"
            stroke={scoreColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${strokeDash} ${circumference}`}
            style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.34,1.56,0.64,1)" }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black" style={{ color: scoreColor }}>{score}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">/ 100</span>
        </div>
      </div>
      <div className="text-center">
        <p className="font-bold text-slate-700 text-sm">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">Mental Wellness</p>
      </div>
    </div>
  );
}

/* ── Typing indicator ──────────────────────────────────────────────────── */
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

/* ── Message Bubble ────────────────────────────────────────────────────── */
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isBot = msg.role === "bot";
  const mood = (msg.moodTag as MoodTag) || "neutral";
  const moodCfg = MOOD_CONFIG[mood];
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`flex gap-2.5 ${isBot ? "justify-start" : "justify-end"} animate-fade-in-up`}>
      {isBot && (
        <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/20 mt-1">
          <HeartHandshake size={14} className="text-white" />
        </div>
      )}
      <div className={`max-w-[75%] ${isBot ? "" : "items-end flex flex-col"}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
            isBot
              ? "bg-white text-slate-700 border border-slate-100 rounded-tl-sm"
              : "text-white rounded-tr-sm"
          }`}
          style={!isBot ? { background: "linear-gradient(135deg, #7c3aed, #a855f7)" } : {}}
        >
          {msg.content}
        </div>
        <div className={`flex items-center gap-1.5 mt-1 ${isBot ? "ml-1" : "mr-1 justify-end"}`}>
          <span className="text-[10px] text-slate-400">{time}</span>
          {!isBot && msg.moodTag && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${moodCfg.bg} ${moodCfg.color}`}>
              {moodCfg.emoji} {moodCfg.label}
            </span>
          )}
        </div>
      </div>
      {!isBot && (
        <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mt-1 border border-violet-200">
          <span className="text-sm font-bold text-violet-600">U</span>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────────── */
export default function DeluluPage() {
  const { profile } = usePatient();
  const userId = profile?.patientId || profile?.id || "";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [histLoading, setHistLoading] = useState(true);
  const [wellnessScore, setWellnessScore] = useState(70);
  const [moodStreak, setMoodStreak] = useState<MoodTag[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* Auto-scroll */
  const scrollBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollBottom(); }, [messages, scrollBottom]);

  /* Load history */
  useEffect(() => {
    if (!userId || userId === "...") return;
    setHistLoading(true);
    fetch(`${API}/api/delulu/history/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setMessages(data.messages || []);
          setWellnessScore(data.wellnessScore ?? 70);
          const userMoods = (data.messages || [])
            .filter((m: ChatMessage) => m.role === "user" && m.moodTag)
            .slice(-7)
            .map((m: ChatMessage) => m.moodTag as MoodTag);
          setMoodStreak(userMoods);
        }
      })
      .catch(() => {})
      .finally(() => setHistLoading(false));
  }, [userId]);

  /* Send message */
  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text || input).trim();
      if (!msg || loading || !userId || userId === "...") return;

      const optimistic: ChatMessage = {
        role: "user",
        content: msg,
        moodTag: "neutral",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch(`${API}/api/delulu/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, message: msg }),
        });
        const data = await res.json();
        if (data.success) {
          // Update the optimistic message with real moodTag
          setMessages((prev) => [
            ...prev.slice(0, -1),
            { ...optimistic, moodTag: data.moodTag },
            {
              role: "bot",
              content: data.reply,
              moodTag: "neutral",
              timestamp: new Date().toISOString(),
            },
          ]);
          setWellnessScore(data.wellnessScore ?? wellnessScore);
          setMoodStreak((prev) => [...prev.slice(-6), data.moodTag]);
        }
      } catch {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { ...optimistic },
          {
            role: "bot",
            content: "I'm having a little moment. Please try again in a bit 💜",
            moodTag: "neutral",
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    [input, loading, userId, wellnessScore],
  );

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const firstName = profile?.name?.split(" ")[0] || "there";
  const hasHistory = messages.length > 0;

  /* Mood bar from recent streak */
  const moodBarItems = moodStreak.slice(-7);

  return (
    <div className="max-w-[1300px] space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/20"
          style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
          <HeartHandshake size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800">Delulu <span className="text-violet-500">✦</span></h1>
          <p className="text-sm text-slate-500 font-medium">Your mental health companion — always here to listen</p>
        </div>
        <div className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-50 border border-violet-100">
          <Sparkles size={14} className="text-violet-500" />
          <span className="text-xs font-bold text-violet-600">AI Memory Active</span>
        </div>
      </div>

      {/* ── Main layout: Chat + Right sidebar ──────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── CHATBOT (left 2/3) ──────────────────────────────────────── */}
        <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden"
          style={{ height: "600px" }}>

          {/* Chat header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <HeartHandshake size={15} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">Delulu</p>
              <p className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                Online & listening
              </p>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-5 space-y-4">
            {histLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-3 border-violet-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-slate-400 text-sm">Loading your conversations...</p>
                </div>
              </div>
            ) : !hasHistory ? (
              /* Welcome screen */
              <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                  <HeartHandshake size={36} className="text-violet-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Hi {firstName}, I&apos;m Delulu 💜</h3>
                  <p className="text-slate-500 text-sm mt-2 max-w-sm">
                    I&apos;m your personal mental health companion. I&apos;m here to listen, support, and walk with you — whatever you&apos;re feeling.
                  </p>
                </div>
                {/* Suggested prompts */}
                <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                  {SUGGESTED_PROMPTS.slice(0, 4).map((p) => (
                    <button
                      key={p}
                      onClick={() => handleSend(p)}
                      className="text-xs font-semibold px-3 py-2.5 rounded-xl bg-violet-50 text-violet-700 border border-violet-100 hover:bg-violet-100 hover:border-violet-200 transition-all text-left"
                    >
                      &ldquo;{p}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => <MessageBubble key={i} msg={m} />)
            )}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-2.5">
                <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/20">
                  <HeartHandshake size={14} className="text-white" />
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm shadow-sm">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested prompts strip (when chat has history) */}
          {hasHistory && (
            <div className="px-5 py-2 border-t border-slate-50 flex gap-2 overflow-x-auto custom-scrollbar">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => handleSend(p)}
                  disabled={loading}
                  className="shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100 hover:bg-violet-100 transition-colors disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input area */}
          <div className="px-4 py-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-end gap-3">
              <textarea
                ref={inputRef}
                id="delulu-message-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="How are you feeling today?"
                rows={1}
                disabled={loading || !userId || userId === "..."}
                className="flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition-all disabled:opacity-50 custom-scrollbar"
                style={{ maxHeight: "120px", overflowY: "auto" }}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 120) + "px";
                }}
              />
              <button
                id="delulu-send-button"
                onClick={() => handleSend()}
                disabled={loading || !input.trim() || !userId || userId === "..."}
                className="w-11 h-11 flex items-center justify-center rounded-2xl text-white shadow-md shadow-violet-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:shadow-none shrink-0"
                style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
              >
                {loading ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              Delulu is an AI companion, not a substitute for professional mental health care.
            </p>
          </div>
        </div>

        {/* ── RIGHT SIDEBAR: Wellness + Mood ─────────────────────────── */}
        <div className="xl:col-span-1 flex flex-col gap-5">

          {/* Wellness Score */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 w-full">
              <SmilePlus size={16} className="text-violet-500" />
              <h3 className="text-sm font-bold text-slate-700">Mental Wellness</h3>
            </div>
            <WellnessRing score={wellnessScore} />
            <p className="text-xs text-slate-500 text-center leading-relaxed">
              Score based on your recent emotional check-ins with Delulu
            </p>
          </div>

          {/* Mood History */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={15} className="text-violet-400" />
              <h3 className="text-sm font-bold text-slate-700">Recent Mood</h3>
            </div>
            {moodBarItems.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">
                Start chatting to see your mood history
              </p>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {moodBarItems.map((mood, i) => {
                  const cfg = MOOD_CONFIG[mood];
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color} border border-current/10`}
                    >
                      <span>{cfg.emoji}</span>
                      <span>{cfg.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tips card */}
          <div className="rounded-3xl p-5 border border-violet-100"
            style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)" }}>
            <h3 className="text-sm font-bold text-violet-800 mb-2">💜 Daily Tip</h3>
            <p className="text-xs text-violet-700 leading-relaxed">
              Try writing down 3 things you&apos;re grateful for today. Small moments of gratitude can shift your perspective over time.
            </p>
          </div>

          {/* CTA */}
          <div className="rounded-3xl p-5 border border-rose-100 bg-rose-50">
            <h3 className="text-sm font-bold text-rose-700 mb-1">Need more support?</h3>
            <p className="text-xs text-rose-600 leading-relaxed">
              If you&apos;re struggling, consider speaking with a qualified therapist or counselor.
            </p>
            <button className="mt-3 w-full py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #f43f5e, #fb7185)" }}>
              Talk to a Therapist →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
