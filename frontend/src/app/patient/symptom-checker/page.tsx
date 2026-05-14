"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Stethoscope,
  ArrowLeft, Calendar, Brain,
  ChevronRight, Send, SkipForward, Mic, MicOff,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MemoryInsights from "../_components/MemoryInsights";
import AIEvolution from "../_components/AIEvolution";

interface SymptomResult {
  severity: number;
  explanation: string;
  recommendation: "home" | "consult";
  possibleConditions?: string[];
}

interface DoctorMatchResult {
  specialization: string;
  urgency: string;
  reason: string;
  alternativeSpecializations?: string[];
}

type Step = "input" | "questions" | "result";

const severityColor = (s: number) =>
  s <= 3 ? "#16a34a" : s <= 6 ? "#d97706" : "#dc2626";

const severityLabel = (s: number) =>
  s <= 3 ? "Mild" : s <= 6 ? "Moderate" : "Severe";

// Step indicator component
function StepIndicator({ current }: { current: Step }) {
  const steps: { key: Step; label: string; num: number }[] = [
    { key: "input",     label: "Describe",  num: 1 },
    { key: "questions", label: "Follow-Up", num: 2 },
    { key: "result",    label: "Results",   num: 3 },
  ];
  const idx = steps.findIndex(s => s.key === current);

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
            i < idx  ? "bg-teal-500 text-white" :
            i === idx ? "bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md scale-110" :
                        "bg-slate-100 text-slate-400"
          }`}>
            {i < idx ? "âœ“" : s.num}
          </div>
          <span className={`text-xs font-bold hidden sm:block ${i === idx ? "text-teal-600" : "text-slate-400"}`}>
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <ChevronRight size={14} className={`${i < idx ? "text-teal-400" : "text-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function SymptomCheckerPage() {

  // â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [step, setStep] = useState<Step>("input");
  const [symptoms, setSymptoms] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const [result, setResult] = useState<SymptomResult | null>(null);
  const [doctorMatch, setDoctorMatch] = useState<DoctorMatchResult | null>(null);

  const [loading, setLoading] = useState(false);   // generate questions
  const [analyzing, setAnalyzing] = useState(false); // final analysis
  const [matchLoading, setMatchLoading] = useState(false);

  const [error, setError] = useState("");
  const [matchError, setMatchError] = useState("");
  const [userId, setUserId] = useState("");
  const [memoryActive, setMemoryActive] = useState(false);

  // Speech-to-Text state
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserId(user.id || user.patientId || "");
      }
    } catch {}
  }, []);


  // â”€â”€ Speech-to-Text Logic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    let currentTranscript = symptoms;

    recognition.onstart = () => {
      setIsListening(true);
      setSpeechError("");
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (final) {
        currentTranscript = currentTranscript ? currentTranscript + " " + final : final;
      }
      
      const displayTranscript = currentTranscript + (interim ? " " + interim : "");
      setSymptoms(displayTranscript.trimStart());
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setSpeechError("Microphone permission denied.");
      } else if (event.error === 'no-speech') {
        // ignore no-speech
      } else {
        setSpeechError("Speech error: " + event.error);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // â”€â”€ Step 1 â†’ Step 2: generate follow-up questions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleAnalyze = async () => {
    if (!symptoms.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setDoctorMatch(null);
    setQuestions([]);
    setAnswers({});
    try {
      const res = await fetch("http://localhost:8000/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to generate questions");
      const questionsArray = data.questions || [];
      const limitedQuestions = questionsArray.slice(0, 5);
      setQuestions(limitedQuestions);
      setStep("questions");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate follow-up questions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // â”€â”€ Step 2 â†’ Step 3: final symptom analysis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSubmitAnswers = async (skip = false) => {
    setAnalyzing(true);
    setError("");
    const payload = {
      symptoms,
      userId,
      // Build answers array only when not skipping
      answers: skip
        ? []
        : questions.map((q, i) => ({ question: q, answer: answers[i] || "" })).filter(a => a.answer.trim()),
    };
    try {
      const res = await fetch("http://localhost:8000/api/ai/symptoms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong");
      setResult(data.data);
      setMemoryActive(!!data.memoryActive);
      setStep("result");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to analyze symptoms. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  // â”€â”€ Book appointment: match doctor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleBookAppointment = async () => {
    if (!symptoms.trim()) return;
    setMatchLoading(true);
    setDoctorMatch(null);
    setMatchError("");
    try {
      const res = await fetch("http://localhost:8000/api/ai/match-doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Doctor matching failed");
      setDoctorMatch(data.data);
    } catch (err: unknown) {
      setMatchError(err instanceof Error ? err.message : "Failed to match doctor. Please try again.");
    } finally {
      setMatchLoading(false);
    }
  };

  const urgencyStyle = (u: string) =>
    u === "emergency" ? "bg-red-50 text-red-700 border-red-200" :
    u === "urgent"    ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                        "bg-green-50 text-green-700 border-green-200";

  const urgencyIcon  = (u: string) => u === "emergency" ? "ðŸš¨" : u === "urgent" ? "âš¡" : "ðŸ“…";
  const urgencyLabel = (u: string) =>
    u === "emergency" ? "Emergency â€” Go to ER Now" :
    u === "urgent"    ? "Urgent â€” See within 48h"  : "Routine Visit";

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Page header */}
      <div className="mb-2 flex items-center justify-center flex-wrap gap-3">

        <div className="flex items-center gap-3">
          {userId && <AIEvolution userId={userId} compact />}
          {memoryActive && (
            <div className="bg-gradient-to-r from-violet-500 to-purple-500 rounded-full px-4 py-2 text-xs font-bold text-white flex items-center gap-1.5 shadow-sm">
              <Brain size={13} />AI Memory Active âœ¨
            </div>
          )}
        </div>
      </div>

      <StepIndicator current={step} />

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-6 py-4 text-red-600 font-semibold text-sm">
          âš ï¸ {error}
        </div>
      )}

      <AnimatePresence mode="wait">

        {/* â•â•â• STEP 1: Symptom Input â•â•â• */}
        {step === "input" && (
          <motion.div key="input"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center">
                  <Stethoscope size={22} className="text-teal-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Describe Your Symptoms</h2>
                  <p className="text-slate-500 text-sm">Be as detailed as possible for better results</p>
                </div>
              </div>

              <button
                onClick={toggleListening}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                  isListening
                    ? "bg-red-50 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse"
                    : "bg-slate-100 text-slate-400 hover:bg-teal-50 hover:text-teal-500"
                }`}
                title={isListening ? "Stop listening" : "Start speaking"}
              >
                {isListening ? <Mic size={22} /> : <MicOff size={22} />}
              </button>
            </div>
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder={isListening ? "Listening..." : "e.g. I have a headache, fever of 38Â°C, and sore throat for the past 2 days..."}
              rows={5}
              className="w-full px-4 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 text-sm font-medium text-slate-700 bg-slate-50 transition-all resize-none"
            />
            {speechError && (
              <p className="text-red-500 text-xs mt-2 font-medium">{speechError}</p>
            )}
            <button
              onClick={handleAnalyze}
              disabled={loading || !symptoms.trim()}
              className={`mt-4 w-full py-3.5 rounded-2xl text-base font-bold transition-all flex items-center justify-center gap-2 ${
                loading || !symptoms.trim()
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:from-teal-600 hover:to-emerald-600 shadow-sm hover:shadow-md"
              }`}
            >
              {loading ? (
                <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Generating Questions...</>
              ) : (
                <>Analyze Symptoms <ChevronRight size={18} /></>
              )}
            </button>
          </motion.div>
        )}

        {/* â•â•â• STEP 2: Follow-Up Questions â•â•â• */}
        {step === "questions" && (
          <motion.div key="questions"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                <Brain size={22} className="text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Follow-Up Questions</h2>
                <p className="text-slate-500 text-sm">All optional â€” answer what you can for a more accurate result</p>
              </div>
            </div>

            {/* Symptom summary chip */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-600 font-medium">
              <span className="text-slate-400 font-semibold text-xs uppercase tracking-wider block mb-1">Your symptoms</span>
              {symptoms}
            </div>

            {/* Questions */}
            <div className="space-y-4">
              {questions.map((q, i) => (
                <div key={i} className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs flex items-center justify-center font-black shrink-0">{i + 1}</span>
                    {q}
                    <span className="ml-auto text-[10px] text-slate-400 font-medium">optional</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Your answer..."
                    value={answers[i] || ""}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 text-sm font-medium text-slate-700 bg-slate-50 transition-all"
                  />
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleSubmitAnswers(true)}
                disabled={analyzing}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                <SkipForward size={16} />Skip &amp; Analyze
              </button>
              <button
                onClick={() => handleSubmitAnswers(false)}
                disabled={analyzing}
                className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  analyzing
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:from-teal-600 hover:to-emerald-600 shadow-sm hover:shadow-md"
                }`}
              >
                {analyzing ? (
                  <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Analyzing...</>
                ) : (
                  <><Send size={16} />Submit &amp; Analyze</>
                )}
              </button>
            </div>

            {/* Back link */}
            <button onClick={() => setStep("input")} className="text-xs text-slate-400 hover:text-slate-600 font-semibold transition-colors flex items-center gap-1">
              <ArrowLeft size={12} />Edit symptoms
            </button>
          </motion.div>
        )}

        {/* â•â•â• STEP 3: Result â•â•â• */}
        {step === "result" && result && (
          <motion.div key="result"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="space-y-6">

            {/* Result Card */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Severity banner */}
              <div className="px-8 py-5 flex items-center justify-between" style={{ backgroundColor: severityColor(result.severity) }}>
                <div>
                  <p className="text-white/80 text-sm font-semibold uppercase tracking-widest">Severity Level</p>
                  <p className="text-white text-2xl font-black mt-0.5">{severityLabel(result.severity)} â€” {result.severity}/10</p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white text-3xl font-black">
                  {result.severity}
                </div>
              </div>

              <div className="p-8 space-y-6">
                {/* Recommendation */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold ${
                  result.recommendation === "home" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                }`}>
                  {result.recommendation === "home" ? "ðŸ  Home Care Recommended" : "ðŸ¥ Consult a Doctor"}
                </div>

                {/* Assessment */}
                <div>
                  <h3 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-2">Assessment</h3>
                  <p className="text-slate-700 leading-relaxed font-medium">{result.explanation}</p>
                </div>

                {/* Possible Conditions */}
                {result.possibleConditions && result.possibleConditions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-3">Possible Conditions</h3>
                    <div className="flex flex-wrap gap-2">
                      {result.possibleConditions.map((c, i) => (
                        <span key={i} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700">{c}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Book appointment */}
                <div className="pt-2 border-t border-slate-100 flex gap-3">
                  <button
                    onClick={() => { setStep("input"); setResult(null); setSymptoms(""); setAnswers({}); }}
                    className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowLeft size={16} />Check Again
                  </button>
                  <button
                    onClick={handleBookAppointment}
                    disabled={matchLoading}
                    className={`flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                      matchLoading
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 shadow-sm hover:shadow-md"
                    }`}
                  >
                    <Calendar size={16} />{matchLoading ? "Finding Doctor..." : "Book Appointment"}
                  </button>
                </div>
              </div>

              <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 font-medium">
                âš ï¸ This is an AI assessment only â€” not a medical diagnosis. Always consult a qualified healthcare professional.
              </div>
            </div>

            {/* Doctor Match error */}
            {matchError && (
              <div className="bg-red-50 border border-red-100 rounded-2xl px-6 py-4 text-red-600 font-semibold text-sm">
                âš ï¸ {matchError}
              </div>
            )}

            {/* Doctor Match Card */}
            {doctorMatch && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-8 py-5 bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white text-2xl">ðŸ©º</div>
                  <div>
                    <p className="text-white/80 text-sm font-semibold uppercase tracking-widest">Recommended Specialist</p>
                    <p className="text-white text-xl font-black mt-0.5">{doctorMatch.specialization}</p>
                  </div>
                </div>
                <div className="p-8 space-y-5">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold border ${urgencyStyle(doctorMatch.urgency)}`}>
                    {urgencyIcon(doctorMatch.urgency)}<span>{urgencyLabel(doctorMatch.urgency)}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-2">Why This Specialist?</h3>
                    <p className="text-slate-700 leading-relaxed font-medium">{doctorMatch.reason}</p>
                  </div>
                  {doctorMatch.alternativeSpecializations && doctorMatch.alternativeSpecializations.length > 0 && (
                    <div>
                      <h3 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-3">Also Consider</h3>
                      <div className="flex flex-wrap gap-2">
                        {doctorMatch.alternativeSpecializations.map((alt, i) => (
                          <span key={i} className="px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-xl text-sm font-semibold text-blue-700">{alt}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-100">
                    <Link
                      href={`/patient/book-appointment?symptoms=${encodeURIComponent(symptoms)}&doctorType=${encodeURIComponent(doctorMatch.specialization)}&severity=${result.severity ?? ""}`}
                      className="w-full py-3.5 rounded-2xl text-base font-bold bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:from-teal-600 hover:to-emerald-600 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <Calendar size={18} />Book This Appointment â†’
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Memory Insights */}
            {userId && (
              <>
                <AIEvolution userId={userId} />
                <MemoryInsights userId={userId} />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
