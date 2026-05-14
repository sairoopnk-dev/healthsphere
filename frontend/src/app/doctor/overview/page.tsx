"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Lock, Award, Stethoscope, Star, ArrowUp, AlertTriangle,
  CheckCircle, Zap, X, Brain, Sparkles, Loader2, Clock, Building2,
} from "lucide-react";
import { useDoctor } from "../_context/DoctorContext";
import ClinicLocation from "../_components/ClinicLocation";

// ── Severity helpers ──────────────────────────────────────────────────────────
function severityMeta(score: number | null | undefined) {
  if (!score) return { label: "N/A", color: "bg-slate-100 text-slate-400", border: "border-slate-200", bg: "", dot: "bg-slate-300" };
  if (score <= 3) return { label: "Low",      color: "bg-green-100 text-green-700",  border: "border-green-200",  bg: "bg-green-50/40",   dot: "bg-green-500"  };
  if (score <= 6) return { label: "Moderate", color: "bg-amber-100 text-amber-700",  border: "border-amber-200",  bg: "bg-amber-50/40",   dot: "bg-amber-500"  };
  return           { label: "High",     color: "bg-red-100 text-red-700",    border: "border-red-300",    bg: "bg-red-50/50",     dot: "bg-red-500"    };
}

function parseTime(slot: string): number {
  const match = slot.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

interface PatientSummaryData {
  patientName: string;
  summary: string;
  symptoms: string[];
  interactionCount: number;
  generatedAt: string;
}

export default function DoctorOverview() {
  const { doctor, doctorProfile, appointments, blockedDates, totalApptThisWeek, today, formatDate, API } = useDoctor();

  // Local priority state
  const [priorityIds, setPriorityIds] = useState<Set<string>>(new Set());
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // AI Summary modal state
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<PatientSummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  // Today's appointments — exclude past slots, sort by time (earliest to latest)
  const todayAppts = useMemo(() => {
    const nowMinutes = (() => {
      const n = new Date();
      return n.getHours() * 60 + n.getMinutes();
    })();

    const list = appointments.filter((a: any) => {
      if (a.date !== today) return false;
      if (a.status === "completed" || a.status === "cancelled") return false;
      const slotMinutes = parseTime(a.timeSlot);
      return slotMinutes >= nowMinutes;
    });

    return list.sort((a: any, b: any) => {
      return parseTime(a.timeSlot) - parseTime(b.timeSlot);
    });
  }, [appointments, today]);

  async function handlePrioritize(e: React.MouseEvent, appt: any) {
    e.stopPropagation(); // Don't open modal
    setLoadingId(appt.appointmentId);
    try {
      await fetch(`${API}/api/appointments/${appt.appointmentId}/prioritize`, {
        method: "PATCH",
      });
      setPriorityIds(prev => new Set([...prev, appt.appointmentId]));
    } catch (e) {
      console.error("Prioritize failed:", e);
    } finally {
      setLoadingId(null);
    }
  }

  async function handlePatientClick(appt: any) {
    setSelectedAppt(appt);
    setSummaryData(null);
    setSummaryError("");
    setSummaryLoading(true);

    try {
      const res = await fetch(`${API}/api/doctor/patient-summary/${appt.patientId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load summary");
      setSummaryData(data.data);
    } catch (err: any) {
      setSummaryError(err.message || "Error generating summary");
    } finally {
      setSummaryLoading(false);
    }
  }

  function closeModal() {
    setSelectedAppt(null);
    setSummaryData(null);
    setSummaryError("");
  }

  return (
    <div className="space-y-8">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-5">
        {[
          { label: "Appointments This Week", value: totalApptThisWeek,             icon: Calendar,   color: "bg-blue-500"   },
          { label: "Leave Days Blocked",      value: blockedDates.length,           icon: Lock,       color: "bg-red-500"    },
          { label: "Years Experience",         value: doctorProfile?.experience || "—", icon: Award, color: "bg-purple-500" },
          { label: "Specialization",           value: doctorProfile?.specialization || "—", icon: Stethoscope, color: "bg-teal-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
              <Icon size={20} className="text-white"/>
            </div>
            <p className="text-2xl font-black text-slate-800">{value}</p>
            <p className="text-xs text-slate-400 font-semibold mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Clinic Location */}
      {doctor?.id && (
        <ClinicLocation doctorId={doctor.id} />
      )}

      {/* Today's Appointments */}
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Calendar size={20} className="text-white"/>
            </div>
            <h2 className="text-base font-black text-slate-700 uppercase tracking-wider">
              Today&apos;s Appointments
            </h2>
            {todayAppts.length > 0 && (
              <span className="ml-auto bg-blue-100 text-blue-600 text-xs font-black px-3 py-1 rounded-full">
                {todayAppts.length} scheduled
              </span>
            )}
          </div>

          {/* Severity legend */}
          {todayAppts.length > 0 && (
            <div className="flex items-center gap-4 mb-5 px-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Severity:</span>
              {[{ label: "Low (1–3)", dot: "bg-green-500" }, { label: "Moderate (4–6)", dot: "bg-amber-500" }, { label: "High (7–10)", dot: "bg-red-500" }].map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${s.dot}`}/>
                  <span className="text-[10px] text-slate-500 font-semibold">{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {todayAppts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle size={44} className="mx-auto text-slate-200 mb-3"/>
              <p className="text-slate-400 font-semibold">No appointments today</p>
              <p className="text-slate-300 text-sm mt-1">Enjoy your free day!</p>
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {todayAppts.map((a: any, index: number) => {
                const isPri = a.isPriority || priorityIds.has(a.appointmentId);
                const meta  = severityMeta(a.severityScore);
                const isLoading = loadingId === a.appointmentId;
                const isNext = index === 0; // Bonus: Highlight next upcoming appointment

                return (
                  <div
                    key={a.appointmentId}
                    onClick={() => handlePatientClick(a)}
                    className={`relative flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
                      isNext
                        ? "border-violet-400 bg-violet-50/60 shadow-md shadow-violet-100 ring-2 ring-violet-200 mt-2"
                        : isPri
                        ? "border-blue-300 bg-blue-50/60 shadow-md shadow-blue-100"
                        : `${meta.border} ${meta.bg} hover:border-blue-200`
                    }`}
                  >
                    {isNext && (
                      <div className="absolute -top-3 left-6 bg-violet-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm z-10 flex items-center gap-1">
                        <Clock size={10} />
                        Up Next
                      </div>
                    )}
                    {/* Avatar */}
                    <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0 shadow-md ${isPri ? "bg-blue-600" : "bg-slate-700"}`}>
                      {a.patientName?.[0]?.toUpperCase()}
                      {isPri && (
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                          <Star size={10} className="text-white fill-white"/>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-800 truncate">{a.patientName}</p>
                        {isPri && (
                          <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                            <Zap size={8}/> Priority
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{a.hospital}</p>
                    </div>

                    {/* Severity badge */}
                    <div className="shrink-0 flex flex-col items-center gap-1">
                      <div className={`flex items-center gap-1.5 text-[11px] font-black px-2.5 py-1 rounded-xl ${meta.color}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}/>
                        {meta.label}
                      </div>
                      {a.severityScore && (
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {a.severityScore}/10
                        </span>
                      )}
                    </div>

                    {/* Time slot */}
                    <span className="shrink-0 bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl">
                      {a.timeSlot}
                    </span>

                    {/* Prioritize button */}
                    {!isPri && (
                      <button
                        onClick={(e) => handlePrioritize(e, a)}
                        disabled={isLoading}
                        title="Move to top and notify patient"
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 text-xs font-bold hover:bg-amber-100 transition-colors disabled:opacity-50"
                      >
                        {isLoading ? (
                          <span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"/>
                        ) : (
                          <ArrowUp size={13}/>
                        )}
                        Prioritize
                      </button>
                    )}
                    {isPri && (
                      <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-100 text-blue-600 text-xs font-bold">
                        <AlertTriangle size={12}/>
                        Notified
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══════ Patient Summary Modal ═══════ */}
      <AnimatePresence>
        {selectedAppt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal}>
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 relative">
                <button onClick={closeModal} className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors">
                  <X size={16} className="text-white" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white text-2xl font-black backdrop-blur-sm">
                    {selectedAppt.patientName?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">{selectedAppt.patientName}</h2>
                    <p className="text-blue-200 text-sm font-medium mt-0.5">{selectedAppt.patientId}</p>
                  </div>
                </div>
              </div>

              {/* Appointment Details */}
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Appointment Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5">
                    <Clock size={14} className="text-blue-500" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold">Time</p>
                      <p className="text-sm font-bold text-slate-700">{selectedAppt.timeSlot}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5">
                    <Calendar size={14} className="text-teal-500" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold">Date</p>
                      <p className="text-sm font-bold text-slate-700">{formatDate(selectedAppt.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5">
                    <Building2 size={14} className="text-purple-500" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold">Hospital</p>
                      <p className="text-sm font-bold text-slate-700 truncate">{selectedAppt.hospital}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5">
                    <Stethoscope size={14} className="text-orange-500" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold">Severity</p>
                      <div className="flex items-center gap-1.5">
                        {(() => {
                          const meta = severityMeta(selectedAppt.severityScore);
                          return (
                            <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${meta.color}`}>
                              {meta.label} {selectedAppt.severityScore ? `(${selectedAppt.severityScore}/10)` : ""}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Summary Section */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Brain size={14} className="text-white" />
                  </div>
                  <h3 className="text-xs font-black text-violet-600 uppercase tracking-widest">AI-Generated Summary</h3>
                  <Sparkles size={12} className="text-amber-400" />
                </div>

                {summaryLoading ? (
                  <div className="flex items-center gap-3 py-8 justify-center">
                    <Loader2 size={20} className="animate-spin text-violet-500" />
                    <span className="text-sm font-semibold text-violet-500">Analyzing patient history...</span>
                  </div>
                ) : summaryError ? (
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                    <p className="text-sm text-red-600 font-medium">{summaryError}</p>
                  </div>
                ) : summaryData ? (
                  <div className="space-y-4">
                    {/* Summary paragraph */}
                    <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-4 border border-violet-100/50">
                      <p className="text-sm text-slate-700 leading-relaxed font-medium">
                        {summaryData.summary}
                      </p>
                    </div>

                    {/* Symptom tags */}
                    {summaryData.symptoms.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Recent Symptoms</p>
                        <div className="flex flex-wrap gap-1.5">
                          {summaryData.symptoms.slice(0, 10).map((s, i) => (
                            <span key={i} className="px-2.5 py-1 bg-white border border-violet-200/60 rounded-lg text-xs font-semibold text-violet-700 capitalize">
                              {s}
                            </span>
                          ))}
                          {summaryData.symptoms.length > 10 && (
                            <span className="px-2.5 py-1 bg-violet-100 rounded-lg text-xs font-bold text-violet-600">
                              +{summaryData.symptoms.length - 10} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-slate-400 font-medium">
                      Based on {summaryData.interactionCount} interaction{summaryData.interactionCount !== 1 ? "s" : ""} · Generated just now
                    </p>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
