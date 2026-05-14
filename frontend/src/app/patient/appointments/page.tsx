"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon, Stethoscope, Clock, CheckCircle2,
  XCircle, ChevronDown, ChevronUp, FileText, AlertCircle,
  ArrowUpDown, History, Hourglass, Mic, MapPin,
} from "lucide-react";
import { usePatient } from "../_context/PatientContext";

const VoiceAssistant = dynamic(() => import("../_components/VoiceAssistant"), { ssr: false });
const HospitalMapPreview = dynamic(() => import("../_components/HospitalMapPreview"), { ssr: false });

// ── Status chip ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    scheduled: "bg-teal-100   text-teal-700",
    completed: "bg-green-100  text-green-700",
    cancelled: "bg-red-100    text-red-600",
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${map[status] || "bg-slate-100 text-slate-500"}`}>
      {status}
    </span>
  );
}

// ── Single appointment card ────────────────────────────────────────────────
function AppointmentCard({
  appt,
  formatDate,
  isPast = false,
  showMap = false,
  onToggleMap,
  patientLat,
  patientLng,
}: {
  appt: any;
  formatDate: (d: any) => string;
  isPast?: boolean;
  showMap?: boolean;
  onToggleMap?: () => void;
  patientLat?: number | null;
  patientLng?: number | null;
}) {
  const [open, setOpen] = useState(false);

  const accentFrom = isPast ? "from-slate-400 to-slate-500" : "from-teal-400 to-emerald-500";
  const borderHover = isPast
    ? "hover:border-slate-300"
    : "hover:border-teal-200";
  const hasDiagnosis = !!appt.diagnosis;
  const hasReport = !!appt.reportUrl;

  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${borderHover} hover:shadow-md transition-all overflow-hidden`}>
      {/* Header strip */}
      <div className={`h-1 w-full bg-gradient-to-r ${accentFrom}`} />

      <div className="p-5">
        {/* Row 1: icon + doctor + status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isPast ? "bg-slate-50" : "bg-teal-50"}`}>
              <Stethoscope size={18} className={isPast ? "text-slate-500" : "text-teal-600"} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm leading-tight">{appt.doctorName}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{appt.hospital}</p>
            </div>
          </div>
          <StatusBadge status={appt.status} />
        </div>

        {/* Row 2: Date + Time */}
        <div className="flex gap-4 text-xs text-slate-600 mb-4">
          <div className="flex items-center gap-1.5">
            <CalendarIcon size={12} className="text-slate-400" />
            <span className="font-semibold">{formatDate(appt.date)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-slate-400" />
            <span className="font-semibold">{appt.timeSlot}</span>
          </div>
        </div>

        {/* Expand button — only for past with diagnosis/report */}
        {isPast && (hasDiagnosis || hasReport) && (
          <button
            onClick={() => setOpen(o => !o)}
            className="w-full flex items-center justify-between text-xs font-bold border-t border-slate-100 pt-3 text-slate-400 hover:text-teal-700 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <FileText size={12} />
              {open ? "Collapse" : "View Diagnosis & Report"}
            </span>
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}

        {/* View Location toggle — upcoming only */}
        {!isPast && onToggleMap && (
          <button
            onClick={onToggleMap}
            className={`w-full flex items-center justify-between text-xs font-bold pt-3 transition-colors ${
              !(hasDiagnosis || hasReport) ? "border-t border-slate-100" : ""
            } ${showMap ? "text-teal-600" : "text-slate-400 hover:text-teal-600"}`}
          >
            <span className="flex items-center gap-1.5">
              <MapPin size={12} />
              {showMap ? "Hide Location" : "View Location"}
            </span>
            {showMap ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 space-y-3">
                {hasDiagnosis && (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                    <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Diagnosis</p>
                    <p className="text-xs text-slate-700 leading-relaxed">{appt.diagnosis}</p>
                  </div>
                )}
                {hasReport ? (
                  <a
                    href={appt.reportUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg border border-teal-200 text-teal-700 bg-teal-50 hover:opacity-80 transition-opacity"
                  >
                    <FileText size={12} /> View Report
                  </a>
                ) : (
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <AlertCircle size={11} /> No report attached
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map expansion */}
        <AnimatePresence>
          {showMap && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="pt-3">
                <HospitalMapPreview
                  doctorId={appt.doctorId}
                  doctorName={appt.doctorName}
                  hospitalName={appt.hospital}
                  patientLat={patientLat}
                  patientLng={patientLng}
                  compact
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Tab button ─────────────────────────────────────────────────────────────
function TabBtn({
  active,
  onClick,
  icon: Icon,
  label,
  count,
  color,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${active
          ? `${color} shadow-sm`
          : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
        }`}
    >
      <Icon size={15} />
      {label}
      <span className={`text-[11px] px-2 py-0.5 rounded-full font-black ${active ? "bg-white/30 text-inherit" : "bg-slate-100 text-slate-500"
        }`}>
        {count}
      </span>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Page
// ══════════════════════════════════════════════════════════════════════════
export default function PatientAppointments() {
  const {
    upcomingAppointments,
    pastAppointments,
    appointmentsLoading,
    openAppt,
    formatDate,
    refreshAppointments,
    setMessages,
    profile,
  } = usePatient();

  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [showVoice, setShowVoice] = useState(false);
  const [showMapId, setShowMapId] = useState<string | null>(null);

  // Patient's default address for distance calc
  const defaultAddr = profile?.addresses?.find((a: any) => a.isDefault) || profile?.addresses?.[0] || null;

  // Re-fetch appointments after voice booking
  const refreshAfterVoiceBook = useCallback(async (apptData?: any) => {
    // 1) Show notification locally
    if (apptData) {
      setMessages((prev: any[]) => [{
        id: Date.now(),
        type: "appointment",
        text: `Voice Booking: Appointment scheduled with ${apptData.doctorName} on ${formatDate(apptData.date)} at ${apptData.timeSlot}`,
        date: "Just Now",
        isNew: true
      }, ...prev]);
    }
    // 2) Refresh patient appointments from DB
    await refreshAppointments();
  }, [refreshAppointments, setMessages, formatDate]);

  // Upcoming → ascending (nearest first) — already sorted by backend
  const sortedUpcoming = [...upcomingAppointments];

  // Past → descending (most recent first) — already sorted by backend
  const sortedPast = [...pastAppointments];

  if (appointmentsLoading) {
    return (
      <div className="max-w-[1400px] flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-teal-600 font-bold text-lg">
          <div className="w-6 h-6 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          Loading appointments...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] space-y-8">


      {/* ── Tabs + Book Button ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <TabBtn
            active={tab === "upcoming"}
            onClick={() => setTab("upcoming")}
            icon={Hourglass}
            label="Upcoming"
            count={upcomingAppointments.length}
            color="bg-teal-500 border-teal-500 text-white"
          />
          <TabBtn
            active={tab === "past"}
            onClick={() => setTab("past")}
            icon={History}
            label="Past"
            count={pastAppointments.length}
            color="bg-slate-700 border-slate-700 text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVoice(true)}
            className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-700 transition-colors"
          >
            <Mic size={15} />
            Voice Book
          </button>
          <button
            onClick={openAppt}
            className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-teal-600 transition-colors"
          >
            + Book New
          </button>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        {tab === "upcoming" ? (
          <motion.section
            key="upcoming"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Upcoming Appointments</h3>
                <p className="text-slate-400 text-xs mt-0.5">Sorted earliest → latest</p>
              </div>
            </div>

            {sortedUpcoming.length === 0 ? (
              <div className="bg-white rounded-3xl p-14 border border-dashed border-slate-200 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center">
                  <CalendarIcon size={30} className="text-teal-400" />
                </div>
                <div>
                  <p className="text-slate-700 font-bold text-lg">No upcoming appointments</p>
                  <p className="text-slate-400 text-sm mt-1">Use the &quot;Book New&quot; button to schedule a visit.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {sortedUpcoming.map((a: any, i: number) => (
                  <motion.div
                    key={a.appointmentId || a._id || i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <AppointmentCard
                      appt={a}
                      formatDate={formatDate}
                      isPast={false}
                      showMap={showMapId === (a.appointmentId || a._id)}
                      onToggleMap={() => setShowMapId(p => p === (a.appointmentId || a._id) ? null : (a.appointmentId || a._id))}
                      patientLat={defaultAddr?.lat}
                      patientLng={defaultAddr?.lng}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>
        ) : (
          <motion.section
            key="past"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Past Appointments</h3>
                <p className="text-slate-400 text-xs mt-0.5">Sorted latest → earliest</p>
              </div>
            </div>

            {sortedPast.length === 0 ? (
              <div className="bg-white rounded-3xl p-14 border border-dashed border-slate-200 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <History size={30} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-slate-700 font-bold text-lg">No past appointments</p>
                  <p className="text-slate-400 text-sm mt-1">Completed and cancelled appointments will appear here.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {sortedPast.map((a: any, i: number) => (
                  <motion.div
                    key={a.appointmentId || a._id || i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <AppointmentCard appt={a} formatDate={formatDate} isPast={true} />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* Voice Assistant Overlay */}
      <AnimatePresence>
        {showVoice && (
          <VoiceAssistant
            onClose={() => setShowVoice(false)}
            onBooked={(apptData) => {
              // Trigger notification and DB refresh
              refreshAfterVoiceBook(apptData);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
