"use client";

import { useState, useRef, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, X, Lock, Unlock,
  Brain, Loader2, Sparkles, Clock, Ban, CheckCircle, CalendarDays,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDoctor } from "../_context/DoctorContext";

interface PatientSummaryData {
  patientName: string;
  summary: string;
  symptoms: string[];
  interactionCount: number;
  generatedAt: string;
}

// All 30-min slots 9 AM → 9 PM
const ALL_SLOTS = [
  "09:00 AM","09:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM",
  "12:00 PM","12:30 PM","01:00 PM","01:30 PM","02:00 PM","02:30 PM",
  "03:00 PM","03:30 PM","04:00 PM","04:30 PM","05:00 PM","05:30 PM",
  "06:00 PM","06:30 PM","07:00 PM","07:30 PM","08:00 PM","08:30 PM",
  "09:00 PM",
];

export default function DoctorWeeklySchedule() {
  const {
    weekOffset, setWeekOffset, weekDates, blockedDates,
    getSlotsForDay, isExpiredSlot, activeSlot, setActiveSlot,
    today, dayNames, SLOT_TIMES, toYMD, API,
    availabilityMap, updateAvailability, selectedLeaveDate, setSelectedLeaveDate,
  } = useDoctor();

  // Slot Manager open state — now driven by button, not double-click
  const [slotManagerOpen, setSlotManagerOpen] = useState(false);

  // AI Summary state
  const [summaryData, setSummaryData] = useState<PatientSummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [summaryPatientId, setSummaryPatientId] = useState<string | null>(null);

  // Drag-select for slot blocking (inside Slot Manager)
  const dragMode   = useRef<"block" | "unblock" | null>(null);
  const isDragging = useRef(false);
  const [pendingSlots, setPendingSlots] = useState<Set<string>>(new Set());

  // ── Today's date string for min= attribute on date picker
  const todayYMD = new Date().toISOString().split("T")[0];

  // ── Open / close Slot Manager ─────────────────────────────────────────────
  const openSlotManager = () => {
    // Default to today if nothing selected yet
    if (!selectedLeaveDate) setSelectedLeaveDate(todayYMD);
    setSlotManagerOpen(true);
  };

  const closeSlotManager = () => {
    setSlotManagerOpen(false);
    setPendingSlots(new Set());
  };

  // ── Availability helpers for the selected date ────────────────────────────
  const avail = selectedLeaveDate
    ? (availabilityMap[selectedLeaveDate] ?? { fullDayBlocked: false, blockedSlots: [] })
    : { fullDayBlocked: false, blockedSlots: [] };
  const isFullDayBlocked = avail.fullDayBlocked;
  const blockedSlots: string[] = avail.blockedSlots;

  const isSlotBlocked = useCallback((slot: string) => {
    if (isFullDayBlocked) return true;
    return blockedSlots.includes(slot) || pendingSlots.has(slot);
  }, [isFullDayBlocked, blockedSlots, pendingSlots]);

  // ── AI Summary helpers ────────────────────────────────────────────────────
  const fetchPatientSummary = async (patientId: string) => {
    if (summaryPatientId === patientId && summaryData) return;
    setSummaryLoading(true); setSummaryError(""); setSummaryData(null); setSummaryPatientId(patientId);
    try {
      const res = await fetch(`${API}/api/doctor/patient-summary/${patientId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load summary");
      setSummaryData(data.data);
    } catch (err: any) {
      setSummaryError(err.message || "Error loading summary");
    } finally { setSummaryLoading(false); }
  };

  const handleSlotClick = (appt: any) => {
    if (activeSlot === appt._id) { setActiveSlot(null); setSummaryData(null); setSummaryPatientId(null); }
    else { setActiveSlot(appt._id); fetchPatientSummary(appt.patientId); }
  };

  // ── Drag-select inside Slot Manager ──────────────────────────────────────
  const onSlotMouseDown = (slot: string) => {
    if (!selectedLeaveDate || isFullDayBlocked) return;
    isDragging.current = true;
    const willBlock = !blockedSlots.includes(slot);
    dragMode.current = willBlock ? "block" : "unblock";
    setPendingSlots(new Set([slot]));
  };

  const onSlotMouseEnter = (slot: string) => {
    if (!isDragging.current || !selectedLeaveDate || isFullDayBlocked) return;
    setPendingSlots(prev => new Set([...prev, slot]));
  };

  const onSlotMouseUp = useCallback(() => {
    if (!isDragging.current || !selectedLeaveDate) { isDragging.current = false; return; }
    isDragging.current = false;
    const mode = dragMode.current;
    const slots = [...pendingSlots];
    setPendingSlots(new Set());

    let newBlocked = [...blockedSlots];
    if (mode === "block") {
      slots.forEach(s => { if (!newBlocked.includes(s)) newBlocked.push(s); });
    } else {
      newBlocked = newBlocked.filter(s => !slots.includes(s));
    }
    updateAvailability(selectedLeaveDate, false, newBlocked);
  }, [selectedLeaveDate, blockedSlots, pendingSlots, updateAvailability]);

  const toggleFullDay = () => {
    if (!selectedLeaveDate) return;
    const newFull = !isFullDayBlocked;
    updateAvailability(selectedLeaveDate, newFull, newFull ? [] : blockedSlots);
  };

  const clearAllSlots = () => {
    if (!selectedLeaveDate) return;
    updateAvailability(selectedLeaveDate, false, []);
  };

  return (
    <div className="space-y-4" onMouseUp={onSlotMouseUp}>

      {/* ── Controls bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setWeekOffset((w: number) => w - 1)}
            className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-colors">
            <ChevronLeft size={18}/>
          </button>
          <span className="font-bold text-slate-800 text-sm">
            {weekDates[0]
              ? `${String(weekDates[0].getDate()).padStart(2,"0")}-${String(weekDates[0].getMonth()+1).padStart(2,"0")} – ${String(weekDates[6]?.getDate()).padStart(2,"0")}-${String(weekDates[6]?.getMonth()+1).padStart(2,"00")}-${weekDates[6]?.getFullYear()}`
              : ""}
          </span>
          <button onClick={() => setWeekOffset((w: number) => w + 1)}
            className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-colors">
            <ChevronRight size={18}/>
          </button>
          <button onClick={() => setWeekOffset(0)}
            className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
            Today
          </button>
        </div>

        {/* Single button — opens Slot Manager directly */}
        <button
          onClick={openSlotManager}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all bg-red-500 text-white hover:bg-red-600 shadow-sm"
        >
          <Lock size={14}/> Block Leave Dates
        </button>
      </div>

      {/* ── Weekly Grid (display-only) ────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Date Headers */}
        <div className="grid grid-cols-8 border-b border-slate-200">
          <div className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-r border-slate-200 bg-slate-50">Time</div>
          {weekDates.map((date, i) => {
            const ymd = toYMD(date);
            const isToday  = ymd === today;
            const isBlocked = blockedDates.includes(ymd);
            const avMap = availabilityMap[ymd];
            const hasPartialBlocks = !avMap?.fullDayBlocked && (avMap?.blockedSlots?.length ?? 0) > 0;
            const dayAppts = getSlotsForDay(date).length;
            return (
              <div key={i}
                className={`p-4 text-center border-r border-slate-200 last:border-r-0 transition-all
                  ${isBlocked ? "bg-red-50" : isToday ? "bg-blue-50" : ""}`}>
                <p className="text-xs font-bold text-slate-400 uppercase">{dayNames[i]}</p>
                <p className={`text-xl font-black mt-1 ${isToday ? "text-blue-600" : "text-slate-700"}`}>{date.getDate()}</p>
                {isBlocked
                  ? <span className="text-[10px] font-black text-red-500 uppercase">LEAVE</span>
                  : hasPartialBlocks
                  ? <span className="text-[10px] font-black text-orange-500">⚡ {avMap.blockedSlots.length} blocked</span>
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
                const isFullBlocked = blockedDates.includes(ymd);
                const avMap = availabilityMap[ymd];
                const isSlotPartiallyBlocked = !isFullBlocked && (avMap?.blockedSlots?.includes(slot) ?? false);
                const isBlockedCell = isFullBlocked || isSlotPartiallyBlocked;
                const appts = getSlotsForDay(date).filter((a: any) => a.timeSlot === slot);
                const expired = isExpiredSlot(date, slot);

                return (
                  <div key={di} className={`p-1.5 border-r border-slate-100 last:border-r-0 min-h-[52px] transition-colors ${
                    isFullBlocked ? "bg-red-50/30" : isSlotPartiallyBlocked ? "bg-red-50/50" : ""
                  }`}>
                    {isBlockedCell ? (
                      <div className="h-full flex items-center justify-center">
                        <X size={12} className={isFullBlocked ? "text-red-200" : "text-red-300"}/>
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
                                    {summaryData.symptoms.length > 0 && (
                                      <div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Detected Symptoms</p>
                                        <div className="flex flex-wrap gap-1">
                                          {summaryData.symptoms.slice(0, 8).map((s, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-white border border-violet-200/60 rounded-lg text-[9px] font-bold text-violet-700 capitalize">{s}</span>
                                          ))}
                                          {summaryData.symptoms.length > 8 && (
                                            <span className="px-2 py-0.5 bg-violet-100 rounded-lg text-[9px] font-bold text-violet-600">+{summaryData.symptoms.length - 8}</span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    <p className="text-[9px] text-slate-400 font-medium">
                                      Based on {summaryData.interactionCount} interaction{summaryData.interactionCount !== 1 ? "s" : ""}
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

      {/* ── Slot Manager Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {slotManagerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40"
              onClick={closeSlotManager}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 24 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onMouseUp={onSlotMouseUp}
            >
              <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

                {/* Modal Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-violet-50 to-indigo-50 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-violet-100 rounded-2xl flex items-center justify-center">
                      <Clock size={20} className="text-violet-600"/>
                    </div>
                    <div>
                      <p className="font-black text-slate-800">Leave Slot Manager</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Select a date, then block the whole day or specific slots</p>
                    </div>
                  </div>
                  <button onClick={closeSlotManager}
                    className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm">
                    <X size={15} className="text-slate-500"/>
                  </button>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto flex-1">

                  {/* ── STEP 1: Date Picker ─────────────────────────────── */}
                  <div className="px-6 pt-5 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-violet-600 text-white rounded-lg flex items-center justify-center text-xs font-black">1</div>
                      <p className="font-bold text-slate-800 text-sm">Select Date</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                        <input
                          type="date"
                          value={selectedLeaveDate}
                          min={todayYMD}
                          onChange={e => setSelectedLeaveDate(e.target.value)}
                          className="w-full pl-9 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-slate-50 outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 transition-all"
                        />
                      </div>
                      {selectedLeaveDate && (
                        <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-2.5">
                          <p className="text-xs font-bold text-violet-700">
                            {new Date(selectedLeaveDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── STEP 2: Block / Slot Selection ───────────────────── */}
                  {selectedLeaveDate && (
                    <>
                      <div className="px-6 pt-5 pb-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-violet-600 text-white rounded-lg flex items-center justify-center text-xs font-black">2</div>
                            <p className="font-bold text-slate-800 text-sm">Block Availability</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Full-day toggle */}
                            <button onClick={toggleFullDay}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                isFullDayBlocked
                                  ? "bg-red-100 text-red-700 hover:bg-red-200 border border-red-200"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                              }`}>
                              {isFullDayBlocked
                                ? <><CheckCircle size={13}/> Full Day Blocked</>
                                : <><Ban size={13}/> Block Full Day</>}
                            </button>
                            {/* Clear partial */}
                            {!isFullDayBlocked && blockedSlots.length > 0 && (
                              <button onClick={clearAllSlots}
                                className="px-3 py-2 rounded-xl text-xs font-bold bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-100 transition-all">
                                Clear All ({blockedSlots.length})
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Instructions */}
                        <div className="mb-4 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          {isFullDayBlocked ? (
                            <p className="text-xs text-red-600 font-semibold flex items-center gap-1.5">
                              <Ban size={12}/> Full day blocked — all slots unavailable. Click "Full Day Blocked" to restore.
                            </p>
                          ) : (
                            <p className="text-xs text-slate-500 font-medium">
                              <span className="font-bold text-violet-600">Click</span> to toggle a slot ·{" "}
                              <span className="font-bold text-violet-600">Drag</span> across slots to bulk block/unblock.{" "}
                              <span className="text-orange-600 font-bold">{blockedSlots.length}</span> slot{blockedSlots.length !== 1 ? "s" : ""} blocked.
                            </p>
                          )}
                        </div>

                        {/* Slot Grid */}
                        <div
                          className="grid grid-cols-5 gap-2 select-none"
                          onMouseLeave={() => { if (isDragging.current) onSlotMouseUp(); }}
                        >
                          {ALL_SLOTS.map(slot => {
                            const blocked = isSlotBlocked(slot);
                            const pending = pendingSlots.has(slot);
                            return (
                              <div
                                key={slot}
                                onMouseDown={() => onSlotMouseDown(slot)}
                                onMouseEnter={() => onSlotMouseEnter(slot)}
                                className={`px-3 py-2.5 rounded-xl text-xs font-bold text-center cursor-pointer select-none transition-all border ${
                                  isFullDayBlocked
                                    ? "bg-red-50 text-red-300 border-red-100 cursor-not-allowed"
                                    : pending
                                    ? "bg-violet-200 text-violet-800 border-violet-300 scale-95"
                                    : blocked
                                    ? "bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200"
                                }`}>
                                {slot}
                                {blocked && !isFullDayBlocked && (
                                  <div className="text-[9px] mt-0.5 opacity-70">blocked</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="px-6 pb-5 flex items-center gap-4 text-[10px] font-bold text-slate-500 border-t border-slate-50 pt-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-md bg-slate-100 border border-slate-200"/>Available
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-md bg-red-100 border border-red-200"/>Blocked
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-md bg-violet-200 border border-violet-300"/>Selecting (drag)
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0 flex items-center justify-between">
                  <p className="text-xs text-slate-400 font-medium">
                    Changes save automatically. Affected appointments will be cancelled.
                  </p>
                  <button
                    onClick={closeSlotManager}
                    className="px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-colors shadow-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
