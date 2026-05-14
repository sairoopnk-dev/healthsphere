"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pill, CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
  Stethoscope, Timer, History, Activity, Info, Clock, Bell, BellOff,
  Sun, Sunset, Moon, X,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
interface Medicine {
  _id: string;
  medicineName: string;
  type: string;
  dosage: string;
  frequency: string;
  instructions: string;
  durationDays: number;
  prescribedDate: string;
  endDate: string;
  status: "active" | "completed";
  daysLeft?: number;
  doctorName: string;
  prescriptionTitle: string;
  prescriptionId: string;
}

interface SavedReminder {
  _id: string;
  medicineName: string;
  times: string[];
}

// ── Time slot config ────────────────────────────────────────────────────────
const PERIODS = [
  {
    id: "morning",
    label: "Morning",
    icon: Sun,
    color: "text-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-200",
    slots: ["06:00","06:30","07:00","07:30","08:00","08:30","09:00","09:30","10:00"],
  },
  {
    id: "afternoon",
    label: "Afternoon",
    icon: Sunset,
    color: "text-orange-500",
    bg: "bg-orange-50",
    border: "border-orange-200",
    slots: ["12:00","12:30","13:00","13:30","14:00","14:30","15:00"],
  },
  {
    id: "evening",
    label: "Evening",
    icon: Moon,
    color: "text-indigo-500",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    slots: ["18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30","22:00"],
  },
] as const;

function fmt12(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h < 12 ? "AM" : "PM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDate(d: string | Date) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return `${String(date.getDate()).padStart(2,"0")}-${String(date.getMonth()+1).padStart(2,"0")}-${date.getFullYear()}`;
}

const TYPE_ICONS: Record<string, string> = {
  tablet:"💊", syrup:"🧪", capsule:"💊", injection:"💉",
  drops:"💧", ointment:"🧴", other:"🩺",
};

function formatFrequency(freq: string): string {
  if (!freq) return "—";
  const f = freq.toLowerCase().trim();
  if (f.includes("once") || f === "1" || f.includes("1x") || f.includes("od") || f.includes("daily"))
    return "Once a day";
  if (f.includes("twice") || f === "2" || f.includes("2x") || f.includes("bd") || f.includes("bid"))
    return "Twice a day";
  if (f.includes("thrice") || f === "3" || f.includes("3x") || f.includes("td") || f.includes("tid"))
    return "Thrice a day";
  return freq;
}

function DaysLeftBadge({ daysLeft }: { daysLeft: number }) {
  const color =
    daysLeft <= 1 ? "bg-red-100 text-red-700 border-red-200" :
    daysLeft <= 3 ? "bg-orange-100 text-orange-700 border-orange-200" :
    daysLeft <= 7 ? "bg-amber-100 text-amber-700 border-amber-200" :
                    "bg-teal-100 text-teal-700 border-teal-200";
  const label = daysLeft === 0 ? "Expires today" : daysLeft === 1 ? "1 day left" : `${daysLeft} days left`;
  return (
    <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${color}`}>
      <Timer size={11} /> {label}
    </span>
  );
}

// ── Reminder Time Picker Modal ─────────────────────────────────────────────
interface ReminderPickerProps {
  med: Medicine;
  patientId: string;
  existingTimes: string[];
  onSave: (times: string[]) => void;
  onClose: () => void;
}

function ReminderPickerModal({ med, patientId, existingTimes, onSave, onClose }: ReminderPickerProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [selectedTimes, setSelectedTimes]   = useState<string[]>(existingTimes);
  const [saving, setSaving]                 = useState(false);

  const toggleTime = (t: string) => {
    setSelectedTimes(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  };

  const handleSave = async () => {
    if (selectedTimes.length === 0) return;
    setSaving(true);
    try {
      await fetch("http://localhost:8000/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          medicineName: med.medicineName,
          dosage: med.dosage,
          times: selectedTimes,
          timezone: "Asia/Kolkata",
        }),
      });
      onSave(selectedTimes);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93 }}
        className="bg-white rounded-3xl p-7 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
      >
        <button onClick={onClose} className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 p-2 rounded-full text-slate-500">
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center text-2xl shrink-0">
            {TYPE_ICONS[med.type] || "💊"}
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 leading-tight">{med.medicineName}</h2>
            <p className="text-sm text-slate-500 font-medium">{med.dosage} · {formatFrequency(med.frequency)}</p>
          </div>
        </div>

        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Select Reminder Times</p>

        {/* Period selector */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPeriod(selectedPeriod === p.id ? null : p.id)}
              className={`py-3 rounded-xl border-2 font-bold text-sm flex flex-col items-center gap-1 transition-all ${
                selectedPeriod === p.id
                  ? `${p.bg} ${p.border} ${p.color} border-2`
                  : "border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
            >
              <p.icon size={18} />
              {p.label}
            </button>
          ))}
        </div>

        {/* Time slots for selected period */}
        <AnimatePresence>
          {selectedPeriod && (() => {
            const period = PERIODS.find(p => p.id === selectedPeriod)!;
            return (
              <motion.div
                key={selectedPeriod}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-4"
              >
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  {period.label} · {selectedPeriod === "morning" ? "6 AM – 10 AM"
                    : selectedPeriod === "afternoon" ? "12 PM – 3 PM"
                    : "6 PM – 10 PM"}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {period.slots.map(t => (
                    <button
                      key={t}
                      onClick={() => toggleTime(t)}
                      className={`py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                        selectedTimes.includes(t)
                          ? `${period.bg} ${period.border} ${period.color}`
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {fmt12(t)}
                    </button>
                  ))}
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* Selected times summary */}
        {selectedTimes.length > 0 && (
          <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 mb-4">
            <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-2">Selected reminders</p>
            <div className="flex flex-wrap gap-1.5">
              {[...selectedTimes].sort().map(t => (
                <span key={t} className="flex items-center gap-1 bg-white border border-violet-200 text-violet-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  <Clock size={10} /> {fmt12(t)}
                  <button onClick={() => toggleTime(t)} className="ml-1 text-violet-400 hover:text-violet-700">×</button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || selectedTimes.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-500 to-purple-600 disabled:from-violet-300 text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-500/20 text-sm"
          >
            {saving ? "Saving..." : <><Bell size={15} /> Set Reminder</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════════════════
interface MedicationsTabProps { profile: any; }

export default function MedicationsTab({ profile }: MedicationsTabProps) {
  const [activeMeds,  setActiveMeds]  = useState<Medicine[]>([]);
  const [pastMeds,    setPastMeds]    = useState<Medicine[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [section,     setSection]     = useState<"active" | "past">("active");
  const [expanded,    setExpanded]    = useState<string | null>(null);

  // Reminder UI state
  const [reminderPickerMed, setReminderPickerMed]   = useState<Medicine | null>(null);
  // Map of medicineId → saved reminder times
  const [reminderTimes, setReminderTimes]           = useState<Record<string, string[]>>({});
  // Set of medicineIds currently "glowing" (reminder fired)
  const [glowingIds, setGlowingIds]                 = useState<Set<string>>(new Set());
  // Track active intervals for cleanup
  const checkIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const patientId = profile?.patientId || profile?.id;

  useEffect(() => {
    if (!patientId) return;
    loadMedications(patientId);
    loadSavedReminders(patientId);
  }, [profile?.patientId, profile?.id]);

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      checkIntervals.current.forEach(t => clearInterval(t));
    };
  }, []);

  const loadMedications = async (pid: string) => {
    setLoading(true); setError("");
    try {
      const [aRes, pRes] = await Promise.all([
        fetch(`http://localhost:8000/api/prescriptions/${pid}/active`),
        fetch(`http://localhost:8000/api/prescriptions/${pid}/past`),
      ]);
      const aData = await aRes.json();
      const pData = await pRes.json();
      if (aData.success) setActiveMeds(aData.medications || []);
      if (pData.success) setPastMeds(pData.medications || []);
    } catch {
      setError("Failed to load medications. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  const loadSavedReminders = async (pid: string) => {
    try {
      const res  = await fetch(`http://localhost:8000/api/reminders/${pid}`);
      const data = await res.json();
      if (data.success && data.data?.length) {
        const map: Record<string, string[]> = {};
        (data.data as SavedReminder[]).forEach(r => {
          map[r.medicineName] = r.times;
        });
        setReminderTimes(map);
      }
    } catch {}
  };

  // ── Reminder scheduler (client-side minute check) ────────────────────────
  useEffect(() => {
    // Clear old intervals
    checkIntervals.current.forEach(t => clearInterval(t));
    checkIntervals.current.clear();

    // For each medicine that has saved reminders, check every minute
    Object.entries(reminderTimes).forEach(([medName, times]) => {
      const med = activeMeds.find(m => m.medicineName === medName);
      if (!med) return;

      // Don't schedule if past endDate
      const endDate = new Date(med.endDate);
      if (endDate < new Date()) return;

      const intervalId = setInterval(() => {
        const now  = new Date();
        const hh   = String(now.getHours()).padStart(2, "0");
        const mm   = String(now.getMinutes()).padStart(2, "0");
        const nowT = `${hh}:${mm}`;
        if (times.includes(nowT)) {
          // Fire glow
          setGlowingIds(prev => new Set(prev).add(med._id));
          // Also push to notification messages via context if desired
        }
      }, 60_000); // check every 60 seconds

      checkIntervals.current.set(medName, intervalId);
    });

    return () => {
      checkIntervals.current.forEach(t => clearInterval(t));
    };
  }, [reminderTimes, activeMeds]);

  const dismissGlow = (medId: string) => {
    setGlowingIds(prev => {
      const next = new Set(prev);
      next.delete(medId);
      return next;
    });
  };

  const handleReminderSaved = (med: Medicine, times: string[]) => {
    setReminderTimes(prev => ({ ...prev, [med.medicineName]: times }));
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-500 font-medium">Loading your medications...</p>
    </div>
  );

  const displayList = section === "active" ? activeMeds : pastMeds;

  return (
    <div className="max-w-[1100px] space-y-6">



      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertCircle size={18} className="text-red-500 shrink-0" />
          <p className="text-red-600 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* ── Section Tabs ── */}
      <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
        <button onClick={() => setSection("active")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            section === "active" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          <Activity size={16} /> Active Medications
          {activeMeds.length > 0 && <span className="bg-teal-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{activeMeds.length}</span>}
        </button>
        <button onClick={() => setSection("past")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            section === "past" ? "bg-white text-slate-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          <History size={16} /> Past Medications
          {pastMeds.length > 0 && <span className="bg-slate-400 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{pastMeds.length}</span>}
        </button>
      </div>

      {/* ── Section Header ── */}
      <div className="flex items-center gap-3">
        <div className={`w-2 h-8 rounded-full ${section === "active" ? "bg-teal-500" : "bg-slate-400"}`} />
        <div>
          <h3 className="font-black text-slate-800 text-lg">
            {section === "active" ? "Active Medications" : "Past Medications"}
          </h3>
          <p className="text-slate-500 text-xs">
            {section === "active"
              ? "Currently prescribed — auto-expire when duration ends"
              : "Complete medication history — permanently stored"}
          </p>
        </div>
      </div>

      {/* ── Medication Cards ── */}
      <AnimatePresence mode="wait">
        {displayList.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-white rounded-3xl p-14 border border-dashed border-slate-200 flex flex-col items-center gap-3">
            {section === "active" ? (
              <><Pill size={40} className="text-slate-200" /><p className="text-slate-500 font-bold">No active medications</p></>
            ) : (
              <><History size={40} className="text-slate-200" /><p className="text-slate-500 font-bold">No past medications yet</p></>
            )}
          </motion.div>
        ) : (
          <motion.div key={section} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayList.map((med, idx) => {
              const isDetailsOpen = expanded === med._id;
              const isActive      = med.status === "active";
              const isGlowing     = glowingIds.has(med._id);
              const savedTimes    = reminderTimes[med.medicineName] || [];
              const hasReminder   = savedTimes.length > 0;

              return (
                <motion.div
                  key={med._id || idx}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`bg-white rounded-2xl border shadow-sm transition-all overflow-hidden ${
                    isGlowing
                      ? "border-violet-400 shadow-violet-300 shadow-lg ring-2 ring-violet-300 animate-pulse-subtle"
                      : isActive
                        ? "border-teal-100 hover:border-teal-200 hover:shadow-md"
                        : "border-slate-100 opacity-85 hover:opacity-100"
                  }`}
                  style={isGlowing ? {
                    boxShadow: "0 0 0 3px rgba(139,92,246,0.25), 0 8px 24px rgba(139,92,246,0.2)",
                  } : undefined}
                >
                  {/* Colored top strip */}
                  <div className={`h-1.5 w-full ${
                    isGlowing ? "bg-gradient-to-r from-violet-400 to-purple-500 animate-pulse"
                    : isActive ? "bg-gradient-to-r from-teal-400 to-emerald-500"
                    : "bg-gradient-to-r from-slate-300 to-slate-400"}`} />

                  <div className="p-5">
                    {/* ROW 1: Icon + Name + Status (top-right only) */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                          isGlowing ? "bg-violet-50" : isActive ? "bg-teal-50" : "bg-slate-100"}`}>
                          {TYPE_ICONS[med.type] || "💊"}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-slate-800 text-base leading-tight truncate">{med.medicineName}</h4>
                          <p className="text-sm font-semibold text-slate-500 capitalize mt-0.5">{med.dosage}</p>
                        </div>
                      </div>

                      {/* Status badge — ONCE at top-right */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {isActive ? (
                          <>
                            {isGlowing ? (
                              <span className="bg-violet-100 text-violet-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
                                🔔 Reminder!
                              </span>
                            ) : (
                              <span className="bg-teal-100 text-teal-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                                ● Active
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="flex items-center gap-1 bg-slate-100 text-slate-500 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                            <CheckCircle2 size={10} /> Completed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Glow alert bar */}
                    {isGlowing && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mb-3 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2">
                          <Bell size={15} className="text-violet-500 animate-bounce shrink-0" />
                          <p className="text-xs font-bold text-violet-800">
                            Reminder: Take <strong>{med.medicineName}</strong> ({med.dosage})
                          </p>
                        </div>
                        <button
                          onClick={() => dismissGlow(med._id)}
                          className="shrink-0 bg-violet-500 hover:bg-violet-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Done ✓
                        </button>
                      </motion.div>
                    )}



                    {/* Reminder times display (if set) */}
                    {hasReminder && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {savedTimes.sort().map(t => (
                          <span key={t} className="flex items-center gap-1 bg-violet-50 border border-violet-100 text-violet-700 text-[10px] font-bold px-2 py-1 rounded-full">
                            <Bell size={9} /> {fmt12(t)}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action row: Set Reminder (active only) + View Details */}
                    <div className="flex gap-2 mb-0">
                      {isActive && (
                        <button
                          onClick={() => setReminderPickerMed(med)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                            hasReminder
                              ? "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50"
                          }`}
                          title={hasReminder ? "Edit reminder times" : "Set reminder"}
                        >
                          {hasReminder ? <><Bell size={12} /> Edit Reminder</> : <><BellOff size={12} /> Set Reminder</>}
                        </button>
                      )}
                      <button
                        onClick={() => setExpanded(isDetailsOpen ? null : med._id)}
                        className="flex-1 flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 hover:from-teal-50 hover:to-emerald-50 hover:border-teal-200 border border-slate-100 transition-all text-xs font-bold text-slate-600 hover:text-teal-700"
                      >
                        <span className="flex items-center gap-1.5">
                          <Info size={13} />
                          {isDetailsOpen ? "Hide Details" : "View Details"}
                        </span>
                        {isDetailsOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </div>

                    {/* Collapsible detail section */}
                    <AnimatePresence>
                      {isDetailsOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{ opacity: 1, height: "auto", marginTop: 10 }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2.5 pt-1">
                            <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl p-3">
                              <Stethoscope size={14} className="text-blue-400 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-wider mb-0.5">Prescribed by</p>
                                <p className="text-xs font-bold text-slate-700 truncate">{med.doctorName}</p>
                                <p className="text-[10px] text-slate-400 truncate">{med.prescriptionTitle}</p>
                              </div>
                            </div>
                            {med.instructions && (
                              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-wider mb-1">Instructions</p>
                                <p className="text-xs text-amber-800 font-medium leading-relaxed">{med.instructions}</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── How it works ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700 leading-relaxed">
          <strong>How it works:</strong> Active medications auto-expire when their duration ends.
          Set daily reminders per medicine — choose Morning, Afternoon, or Evening time slots.
          When a reminder fires, the card glows with a violet pulse. Click <strong>"Done ✓"</strong> to dismiss it.
        </div>
      </div>

      {/* ── Reminder Picker Modal ── */}
      <AnimatePresence>
        {reminderPickerMed && (
          <ReminderPickerModal
            med={reminderPickerMed}
            patientId={patientId}
            existingTimes={reminderTimes[reminderPickerMed.medicineName] || []}
            onSave={(times) => handleReminderSaved(reminderPickerMed, times)}
            onClose={() => setReminderPickerMed(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Small sub-component ────────────────────────────────────────────────────
function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
        {icon} {label}
      </div>
      <p className="text-xs font-bold text-slate-700">{value}</p>
    </div>
  );
}
