"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { Send, HeartHandshake, Sparkles, SmilePlus, RefreshCw, Activity, Mic, MicOff, Volume2 } from "lucide-react";
import { usePatient } from "../_context/PatientContext";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

/* ── Voice Types ─────────────────────────────────────────────────────────── */
type InputMode = "text" | "voice";

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

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
const API = process.env.NEXT_PUBLIC_API_URL!;

const SUGGESTED_PROMPTS = [
  "I feel stressed",
  "I feel better",
  "I need help",
  "I'm feeling anxious",
  "I had a bad day",
];

/* ── Language ────────────────────────────────────────────────────────────────────────── */
type Language = "en" | "kn";

const T = {
  en: {
    companion: "Your mental health companion — always here to listen",
    online: "Online",
    delulu: "Delulu is thinking...",
    typingPlaceholder: "What's on your mind?",
    emptyTitle: "Hey, I'm Delulu! 💜",
    emptySubtitle: "I'm here for you. Talk to me about anything — stress, joy, or just your day.",
    send: "Send",
    listening: "Listening...",
    speaking: "Delulu is speaking...",
    stopListening: "Stop",
    stopSpeaking: "Stop",
    wellnessScore: "Wellness Score",
    moodStreak: "Mood Streak",
    recentMoods: "Recent Moods",
    wellnessChart: "Wellness Chart",
    dailyTip: "Daily Tip",
    dailyTipText: "Try writing down 3 things you\u2019re grateful for today. Small moments of gratitude can shift your perspective over time.",
    needSupport: "Need more support?",
    needSupportText: "You\u2019re not alone. If things feel overwhelming, reach out to a counsellor.",
    bookSession: "Book a Session →",
  },
  kn: {
    companion: "ಉಮ್ಮನ್ನು ಕೇಳಲು ಯಾವಾಗಲೂ ಇಲ್ಲಿ ಮಾನಸಿಕ ಆರೋಗ್ಯ ಸಹಾಯಕ",
    online: "ಲೈವ್ ಆಗಿದೊೆ",
    delulu: "Delulu ಆಲೋಚಿಸುತ್ತಿದ್ದಾರೆ...",
    typingPlaceholder: "ನಿಮ್ಮ ಮನಸ್ಸಿನಲ್ಲಿ ಏನಿದೆ?",
    emptyTitle: "ನಮಸ್ಕಾರ, ನಾನು Delulu! 💜",
    emptySubtitle: "ನಿಮ್ಮಗಾಗಿ ನಾನಿದ್ದೇನೆ. ಎನ್ನದಾದರೂ ಹೇಳಿಕೊಳ್ಳಿ — ಒತ್ತಡ, ಸಂತೋಷ, ಅಥವಾ ನಿಮ್ಮ ದಿನಚರಿ.",
    send: "ಕಳುಹಿಸಿ",
    listening: "ಕೇಳುತ್ತಿದೊೆ...",
    speaking: "Delulu ಮಾತನಾಡುತ್ತಿದ್ದಾರೆ...",
    stopListening: "ನಿಲ್ಲಿಸಿ",
    stopSpeaking: "ನಿಲ್ಲಿಸಿ",
    wellnessScore: "ಆರೋಗ್ಯ ಅಂಕ",
    moodStreak: "ಮನಸ್ಥಿತಿ ಸರಣಿ",
    recentMoods: "ಇಜೀಚೆಗೆ ಮನಸ್ಥಿತಿ",
    wellnessChart: "ಆರೋಗ್ಯ ಆಲೇಖಚಿತ್ರ",
    dailyTip: "ದೈನಂದಿನ ಸಲಹೆ",
    dailyTipText: "ಇಂದು ನಿಮ್ಮನ್ನು ಸಂತೋಷಪಡಿಸಿದ  3 ವಿಷಯಗಳನ್ನು ಬರೆಯಿರಿ. ಕೃತಜ್ಞತೆಯ ಚಿಕ್ಕ ಕ್ಷಣಗಳು ನಿಮ್ಮ ದೃಷ್ಟಿಕೋನವನ್ನು ಬದಲಾಯಿಸಲು ಸಹಾಯಕವಾಗಲಿದೆ.",
    needSupport: "ಮತ್ತಷ್ಟು ಬೆಂಬಲ ಬೇಕೇ?",
    needSupportText: "ನೀವು ಒಂಟರಲ್ಲ. ಎಲ್ಲಾ ಕಷ್ಟವಾಗಿ ತೋನ್ನಿದರೆ, ಸಲಹಗಾರರನ್ನು ಸಂಪರ್ಕಿಸಿ.",
    bookSession: "ಸೇವೆ ಬುಕ್ ಮಾಡಿ →",
  },
} as const;

const MOOD_CONFIG: Record<MoodTag, { color: string; bg: string; label: string }> = {
  positive: { color: "text-emerald-600", bg: "bg-emerald-50", label: "Positive" },
  neutral:  { color: "text-slate-500",   bg: "bg-slate-50",   label: "Neutral" },
  negative: { color: "text-rose-500",    bg: "bg-rose-50",    label: "Low" },
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
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="text-xs text-slate-400 font-medium animate-pulse">Delulu is typing...</span>
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
              {moodCfg.label}
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

  /* ── Language state ── */
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("delulu_lang") as Language) || "en";
    }
    return "en";
  });

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => {
      const next: Language = prev === "en" ? "kn" : "en";
      localStorage.setItem("delulu_lang", next);
      return next;
    });
  }, []);

  const t = T[language];

  /* ── Voice state ── */
  const [isListening, setIsListening]   = useState(false);
  const [isSpeaking, setIsSpeaking]     = useState(false);
  const [micError, setMicError]         = useState("");
  const inputModeRef                     = useRef<InputMode>("text");
  const recognitionRef                   = useRef<SpeechRecognition | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* ── speak() — TTS ── */
  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    let clean = text.replace(/[\u{1F000}-\u{1FFFF}]/gu, "").trim();
    clean = clean.replace(/\./g, ". ");

    const utt = new SpeechSynthesisUtterance(clean);

    const loadVoicesAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();

      let selectedVoice: SpeechSynthesisVoice | undefined;

      if (language === "kn") {
        // Prefer a Kannada voice; fall back to generic Indian English
        selectedVoice =
          voices.find(v => v.lang === "kn-IN" || v.lang.startsWith("kn")) ||
          voices.find(v => v.lang === "en-IN") ||
          voices.find(v => v.name.toLowerCase().includes("india")) ||
          voices[0];
        utt.lang = "kn-IN";
      } else {
        // English: prefer a calm female voice
        selectedVoice =
          voices.find(v => v.name.toLowerCase().includes("female")) ||
          voices.find(v => v.name.toLowerCase().includes("zira")) ||
          voices.find(v => v.name.toLowerCase().includes("google uk english female")) ||
          voices.find(v => v.name.toLowerCase().includes("samantha")) ||
          voices[0];
        utt.lang = "en-US";
      }

      if (selectedVoice) utt.voice = selectedVoice;
      utt.rate   = 0.9;
      utt.pitch  = 1.2;
      utt.volume = 1;

      utt.onstart = () => setIsSpeaking(true);
      utt.onend   = () => setIsSpeaking(false);
      utt.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utt);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      loadVoicesAndSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = loadVoicesAndSpeak;
    }
  }, [language]);

  /* ── stopSpeaking() ── */
  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

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
    async (text?: string, mode?: InputMode) => {
      const msg = (text || input).trim();
      if (!msg || loading || !userId || userId === "...") return;

      const effectiveMode = mode ?? inputModeRef.current;
      // Reset to text after each voice send
      inputModeRef.current = "text";

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
          body: JSON.stringify({ userId, message: msg, language }),
        });
        const data = await res.json();

        await new Promise(resolve => setTimeout(resolve, 1500));

        if (data.success) {
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
          // ── Conditional output ──
          if (effectiveMode === "voice") {
            speak(data.reply);
          }
        }
      } catch {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { ...optimistic },
          {
            role: "bot",
            content: "I'm having a little moment 😓 Please try again in a bit.",
            moodTag: "neutral",
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    [input, loading, userId, wellnessScore, speak, language],
  );

  /* ── startListening() — STT ── */
  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setMicError("Speech recognition not supported in this browser.");
      return;
    }
    stopSpeaking();
    setMicError("");

    const rec = new SR();
    rec.lang = language === "kn" ? "kn-IN" : "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    recognitionRef.current = rec;

    rec.onstart  = () => setIsListening(true);
    rec.onend    = () => setIsListening(false);
    rec.onerror  = (e) => {
      setIsListening(false);
      if (e.error === "not-allowed" || e.error === "denied") {
        setMicError("Microphone permission denied. Using text input.");
      } else if (e.error !== "aborted") {
        setMicError("Couldn't catch that — please try again.");
      }
    };
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      inputModeRef.current = "voice";
      handleSend(transcript, "voice");
    };

    try { rec.start(); } catch { setMicError("Could not start mic."); }
  }, [handleSend, stopSpeaking]);

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

  const currentMood = moodStreak.length > 0 ? moodStreak[moodStreak.length - 1] : "neutral";

  const getMoodStyle = (mood: MoodTag) => {
    if (mood === "negative") return { filter: "saturate(0.85) opacity(0.96)", backgroundColor: "rgba(248, 250, 252, 0.6)" }; // pale look (slate-50)
    if (mood === "positive") return { filter: "saturate(1.05)", backgroundColor: "rgba(236, 253, 245, 0.4)" }; // slight warmth (emerald-50)
    return { filter: "saturate(1)", backgroundColor: "transparent" };
  };

  const graphData = useMemo(() => {
    return messages
      .filter((m) => m.role === "user" && m.moodTag)
      .slice(-15) // show last 15 check-ins
      .map((m) => {
        let score = 60;
        if (m.moodTag === "negative") score = 30;
        if (m.moodTag === "positive") score = 90;
        return {
          date: new Date(m.timestamp).toLocaleDateString([], { month: "short", day: "numeric" }),
          score,
          mood: m.moodTag
        };
      });
  }, [messages]);

  return (
    <div className="-m-8 p-8 min-h-full transition-all duration-500 ease-in-out" style={getMoodStyle(currentMood as MoodTag)}>
      <div className="max-w-[1300px] space-y-6 mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/20"
          style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
          <HeartHandshake size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800">Delulu <span className="text-violet-500">✦</span></h1>
          <p className="text-sm text-slate-500 font-medium">{t.companion}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {/* Language toggle */}
          <button
            id="delulu-lang-toggle"
            onClick={toggleLanguage}
            title="Switch language"
            className="flex items-center gap-0 rounded-xl border border-violet-200 overflow-hidden text-xs font-bold shadow-sm"
          >
            <span className={`px-3 py-1.5 transition-colors ${
              language === "en" ? "bg-violet-600 text-white" : "bg-white text-slate-500 hover:bg-violet-50"
            }`}>EN</span>
            <span className={`px-3 py-1.5 transition-colors ${
              language === "kn" ? "bg-violet-600 text-white" : "bg-white text-slate-500 hover:bg-violet-50"
            }`}>ಕನ್ನಡ</span>
          </button>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-50 border border-violet-100">
            <Sparkles size={14} className="text-violet-500" />
            <span className="text-xs font-bold text-violet-600">AI Memory Active</span>
          </div>
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
              {isSpeaking ? (
                <p className="text-xs text-violet-500 font-semibold flex items-center gap-1">
                  <Volume2 size={11} className="animate-pulse" />
                  {t.speaking}
                </p>
              ) : isListening ? (
                <p className="text-xs text-rose-500 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping inline-block" />
                  {t.listening}
                </p>
              ) : (
                <p className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  {t.online}
                </p>
              )}
            </div>
            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                title="Stop speaking"
                className="ml-auto text-xs text-violet-500 border border-violet-200 rounded-lg px-2 py-1 hover:bg-violet-50 transition-colors"
              >
                Stop ✕
              </button>
            )}
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
                  <h3 className="text-xl font-bold text-slate-800">Hi {firstName}, I&apos;m Delulu</h3>
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
            {/* Mic error */}
            {micError && (
              <p className="text-[11px] text-rose-500 mb-2 text-center font-medium">{micError}</p>
            )}
            {/* Listening banner */}
            {isListening && (
              <div className="mb-2 flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-rose-50 border border-rose-100">
                <span className="flex gap-0.5">
                  {[0,1,2,3].map(i => (
                    <span key={i} className="w-1 rounded-full bg-rose-400 animate-bounce"
                      style={{ height: `${8 + (i % 2) * 6}px`, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </span>
                <span className="text-xs font-bold text-rose-600">Listening... speak now</span>
              </div>
            )}
            <div className="flex items-end gap-3">
              <textarea
                ref={inputRef}
                id="delulu-message-input"
                value={input}
                onChange={(e) => { setInput(e.target.value); inputModeRef.current = "text"; }}
                onKeyDown={handleKey}
                placeholder={t.typingPlaceholder}
                rows={1}
                disabled={loading || isListening || !userId || userId === "..."}
                className="flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition-all disabled:opacity-50 custom-scrollbar"
                style={{ maxHeight: "120px", overflowY: "auto" }}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 120) + "px";
                }}
              />
              {/* Mic button */}
              <button
                id="delulu-mic-button"
                onClick={isListening ? () => { recognitionRef.current?.stop(); } : startListening}
                disabled={loading || !userId || userId === "..."}
                title={isListening ? "Stop listening" : "Speak to Delulu"}
                className={`w-11 h-11 flex items-center justify-center rounded-2xl text-white shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 shrink-0 ${
                  isListening ? "shadow-rose-400/40" : "shadow-slate-300/40"
                }`}
                style={{ background: isListening
                  ? "linear-gradient(135deg, #f43f5e, #fb7185)"
                  : "linear-gradient(135deg, #6d28d9, #8b5cf6)" }}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              {/* Send button */}
              <button
                id="delulu-send-button"
                onClick={() => handleSend()}
                disabled={loading || !input.trim() || isListening || !userId || userId === "..."}
                className="w-11 h-11 flex items-center justify-center rounded-2xl text-white shadow-md shadow-violet-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:shadow-none shrink-0"
                style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
              >
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
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
                      <span>{cfg.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mental Wellness Trend Graph */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={15} className="text-violet-400" />
              <h3 className="text-sm font-bold text-slate-700">Mental Wellness Trend</h3>
            </div>
            {graphData.length < 2 ? (
              <p className="text-xs text-slate-400 text-center py-3">
                Chat more to see your mood trend over time
              </p>
            ) : (
              <div className="h-32 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={graphData}>
                    <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={3} dot={false} activeDot={{ r: 4, fill: "#8b5cf6" }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const cfg = MOOD_CONFIG[data.mood as MoodTag] || MOOD_CONFIG.neutral;
                          return (
                            <div className="bg-white p-2 rounded-lg shadow-md border border-slate-100 text-xs font-semibold">
                              <p className="text-slate-500 mb-1">{data.date}</p>
                              <p className={cfg.color}>{cfg.label}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                      cursor={{ stroke: '#f1f5f9', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Tips card */}
          <div className="rounded-3xl p-5 border border-violet-100"
            style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)" }}>
            <h3 className="text-sm font-bold text-violet-800 mb-2">Daily Tip</h3>
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
            <Link href="/patient/therapists" className="mt-3 w-full flex items-center justify-center py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #f43f5e, #fb7185)" }}>
              Connect with a Mental Health Specialist →
            </Link>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
