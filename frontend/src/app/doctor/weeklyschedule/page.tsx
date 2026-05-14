"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X, Lock, Unlock, AlertCircle, Brain, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDoctor } from "../_context/DoctorContext";

interface PatientSummaryData {
  patientName: string;
  summary: string;
  symptoms: string[];
  interactionCount: number;
  generatedAt: string;
}

export default function DoctorWeeklySchedule() {
  const {
    weekOffset, setWeekOffset, weekDates, blockedDates, leaveMode, setLeaveMode,
    toggleBlock, getSlotsForDay, isExpiredSlot, activeSlot, setActiveSlot,
    today, dayNames, SLOT_TIMES, toYMD, API,
  } = useDoctor();

  // AI Summary state
  const [summaryData, setSummaryData] = useState<PatientSummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [summaryPatientId, setSummaryPatientId] = useState<string | null>(null);

  const fetchPatientSummary = async (patientId: string) => {
    if (summaryPatientId === patientId && summaryData) return; // already loaded
    setSummaryLoading(true);
    setSummaryError("");
    setSummaryData(null);
    setSummaryPatientId(patientId);
    try {
      const res = await fetch(`${API}/api/doctor/patient-summary/${patientId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load summary");
      setSummaryData(data.data);
    } catch (err: any) {
      setSummaryError(err.message || "Error loading summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSlotClick = (appt: any) => {
    if (activeSlot === appt._id) {
      setActiveSlot(null);
      setSummaryData(null);
      setSummaryPatientId(null);
    } else {
      setActiveSlot(appt._id);
      fetchPatientSummary(appt.patientId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setWeekOffset((w: number) => w - 1)}
            className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-colors">
            <ChevronLeft size={18}/>
          </button>
          <span className="font-bold text-slate-800 text-sm">
            {weekDates[0] ? `${String(weekDates[0].getDate()).padStart(2,"0")}-${String(weekDates[0].getMonth()+1).padStart(2,"0")} – ${String(weekDates[6]?.getDate()).padStart(2,"0")}-${String(weekDates[6]?.getMonth()+1).padStart(2,"0")}-${weekDates[6]?.getFullYear()}` : ""}
          </span>
          <button onClick={() => setWeekOffset((w: number) => w + 1)}
            className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-colors">
            <ChevronRight size={18}/>
          </button>
          <button onClick={() => setWeekOffset(0)}
            className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">Today</button>
        </div>
        <button onClick={() => setLeaveMode(!leaveMode)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${leaveMode ? "bg-red-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
          {leaveMode ? <><Unlock size={14}/> Exit Leave Mode</> : <><Lock size={14}/> Block Leave Dates</>}
        </button>
      </div>

      {leaveMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-amber-600 shrink-0"/>
          <p className="text-amber-800 text-sm font-medium">
            <strong>Leave Mode Active:</strong> Click any date header to toggle leave. Patients cannot book on blocked dates.
          </p>
        </div>
      )}

      {/* Weekly Grid */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Date Headers */}
        <div className="grid grid-cols-8 border-b border-slate-200">
          <div className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-r border-slate-200 bg-slate-50">Time</div>
          {weekDates.map((date, i) => {
            const ymd = toYMD(date);
            const isToday = ymd === today;
            const isBlocked = blockedDates.includes(ymd);
            const dayAppts = getSlotsForDay(date).length;
            return (
              <div key={i} onClick={() => leaveMode && toggleBlock(ymd)}
                className={`p-4 text-center border-r border-slate-200 last:border-r-0 transition-all
                  ${leaveMode ? "cursor-pointer hover:bg-red-50" : ""}
                  ${isBlocked ? "bg-red-50" : isToday ? "bg-blue-50" : ""}`}>
                <p className="text-xs font-bold text-slate-400 uppercase">{dayNames[i]}</p>
                <p className={`text-xl font-black mt-1 ${isToday ? "text-blue-600" : "text-slate-700"}`}>{date.getDate()}</p>
                {isBlocked
                  ? <span className="text-[10px] font-black text-red-500 uppercase">LEAVE</span>
                  : dayAppts > 0
                    ? <span className="text-[10px] font-black text-teal-500">{dayAppts} appt{dayAppts > 1 ? "s" : ""}</span>
                    : null
                }
              </div>
            );
          })}
        </div>

        {/* Time Slot Rows */}
        <div className="overflow-y-auto max-h-[500px]">
          {SLOT_TIMES.map(slot => (
            <div key={slot} className="grid grid-cols-8 border-b border-slate-100 last:border-b-0">
              <div className="p-3 px-4 text-xs font-bold text-slate-400 border-r border-slate-200 flex items-center bg-slate-50/50">{slot}</div>
              {weekDates.map((date, di) => {
                const ymd = toYMD(date);
                const isBlocked = blockedDates.includes(ymd);
                const appts = getSlotsForDay(date).filter((a: any) => a.timeSlot === slot);
                const expired = isExpiredSlot(date, slot);

                return (
                  <div key={di} className={`p-1.5 border-r border-slate-100 last:border-r-0 min-h-[52px] ${isBlocked ? "bg-red-50/30" : ""}`}>
                    {isBlocked ? (
                      <div className="h-full flex items-center justify-center">
                        <X size={12} className="text-red-200"/>
                      </div>
                    ) : appts.map((appt: any) => (
                      <div key={appt._id} className="relative">
                        <button onClick={() => handleSlotClick(appt)}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all leading-tight ${
                            expired ? "bg-slate-100 text-slate-300 line-through" : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                          }`}>
                          <p className="truncate">{appt.patientName?.split(" ")[0]}</p>
                          <p className="opacity-60 font-mono truncate text-[9px]">{appt.patientId}</p>
                        </button>
                        <AnimatePresence>
                          {activeSlot === appt._id && (
                            <motion.div initial={{ opacity:0, y:-6, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, scale:0.95 }}
                              className="absolute top-full left-0 z-30 bg-white border border-blue-200 rounded-2xl shadow-2xl min-w-[320px] mt-1 overflow-hidden">

                              {/* Patient Info Header */}
                              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-blue-100">
                                <p className="text-[10px] text-blue-500 font-black uppercase mb-1">Patient Info</p>
                                <p className="font-bold text-slate-800 text-sm">{appt.patientName}</p>
                                <p className="text-xs text-slate-500 font-mono mt-0.5">{appt.patientId}</p>
                                <div className="mt-2 space-y-1">
                                  <p className="text-[10px] text-slate-400">{slot} · {String(date.getDate()).padStart(2,"0")}-{String(date.getMonth()+1).padStart(2,"0")}-{date.getFullYear()}</p>
                                  <p className="text-[10px] text-slate-400">{appt.hospital}</p>
                                  <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full ${expired ? "bg-slate-100 text-slate-400" : "bg-teal-50 text-teal-600"}`}>
                                    {expired ? "Completed" : "Scheduled"}
                                  </span>
                                </div>
                              </div>

                              {/* AI Symptom Summary */}
                              <div className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                                    <Brain size={12} className="text-white" />
                                  </div>
                                  <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest">AI-Generated Summary</p>
                                  <Sparkles size={10} className="text-amber-400" />
                                </div>

                                {summaryLoading ? (
                                  <div className="flex items-center gap-2 py-4 justify-center text-violet-500">
                                    <Loader2 size={14} className="animate-spin" />
                                    <span className="text-xs font-semibold">Analyzing patient history...</span>
                                  </div>
                                ) : summaryError ? (
                                  <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                                    <p className="text-xs text-red-600 font-medium">{summaryError}</p>
                                  </div>
                                ) : summaryData ? (
                                  <div className="space-y-3">
                                    <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-3 border border-violet-100/50">
                                      <p className="text-xs text-slate-700 leading-relaxed font-medium">{summaryData.summary}</p>
                                    </div>

                                    {/* Symptom tags */}
                                    {summaryData.symptoms.length > 0 && (
                                      <div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Detected Symptoms</p>
                                        <div className="flex flex-wrap gap-1">
                                          {summaryData.symptoms.slice(0, 8).map((s, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-white border border-violet-200/60 rounded-lg text-[9px] font-bold text-violet-700 capitalize">
                                              {s}
                                            </span>
                                          ))}
                                          {summaryData.symptoms.length > 8 && (
                                            <span className="px-2 py-0.5 bg-violet-100 rounded-lg text-[9px] font-bold text-violet-600">
                                              +{summaryData.symptoms.length - 8}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    <p className="text-[9px] text-slate-400 font-medium">
                                      Based on {summaryData.interactionCount} interaction{summaryData.interactionCount !== 1 ? 's' : ''}
                                    </p>
                                  </div>
                                ) : null}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
