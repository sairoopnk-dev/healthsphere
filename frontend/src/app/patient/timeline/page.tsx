"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Calendar as CalendarIcon, Stethoscope,
  Pill, BarChart2, FileText, Image as ImageIcon,
  Heart, ChevronDown, ChevronUp, Clock, AlertCircle,
  Filter, Eye,
} from "lucide-react";
import { usePatient } from "../_context/PatientContext";

// ── Entry type → display meta ─────────────────────────────────────────────
const TYPE_META: Record<string, { color: string; bg: string; border: string; icon: any; label: string }> = {
  consultation:  { color: "text-teal-700",   bg: "bg-teal-50",    border: "border-teal-200",   icon: Stethoscope, label: "Consultation" },
  appointment:   { color: "text-cyan-700",   bg: "bg-cyan-50",    border: "border-cyan-200",   icon: CalendarIcon, label: "Appointment" },
  prescription:  { color: "text-violet-700", bg: "bg-violet-50",  border: "border-violet-200", icon: Pill,         label: "Prescription" },
  lab_report:    { color: "text-red-700",    bg: "bg-red-50",     border: "border-red-200",    icon: BarChart2,    label: "Lab Report" },
  xray:          { color: "text-blue-700",   bg: "bg-blue-50",    border: "border-blue-200",   icon: ImageIcon,    label: "X-Ray / Scan" },
  report:        { color: "text-orange-700", bg: "bg-orange-50",  border: "border-orange-200", icon: FileText,     label: "Report" },
  vaccination:   { color: "text-green-700",  bg: "bg-green-50",   border: "border-green-200",  icon: Heart,        label: "Vaccination" },
};

const DEFAULT_META = TYPE_META.consultation;

// ── Single timeline entry ─────────────────────────────────────────────────
function TimelineEntry({ entry, formatDate }: { entry: any; formatDate: (d: any) => string }) {
  const [open, setOpen] = useState(false);
  const meta = TYPE_META[entry.category] || DEFAULT_META;
  const Icon = meta.icon;

  const hasDetails =
    entry.diagnosis ||
    entry.reportUrl ||
    (entry.attachments?.length > 0) ||
    entry.imageUrl ||
    entry.description ||
    entry.notes ||
    (entry.medicines?.length > 0);

  return (
    <div className="flex gap-4 relative group">
      {/* Timeline dot */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 -ml-10 relative z-10 shadow-md ${meta.bg} ${meta.color} border ${meta.border}`}>
        <Icon size={16} />
      </div>

      {/* Card */}
      <div className={`flex-1 bg-white rounded-2xl border shadow-sm transition-all overflow-hidden ${
        open ? `border-2 ${meta.border}` : "border-slate-100 hover:border-slate-200 hover:shadow-md"
      } group-hover:-translate-y-0.5`}>
        {/* Top colour strip */}
        <div className={`h-0.5 w-full ${meta.bg.replace("50", "200")}`} />

        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <p className="font-bold text-slate-800 text-sm truncate">{entry.title}</p>
              {entry.doctorName && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {entry.doctorName.replace(/^Dr\.?\s*/i, "Dr. ")}
                  {entry.hospital ? ` · ${entry.hospital}` : ""}
                </p>
              )}
            </div>
            <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${meta.bg} ${meta.color}`}>
              {meta.label}
            </span>
          </div>

          {/* Date + Time row */}
          <div className="flex items-center gap-4 text-xs text-slate-500 font-semibold mb-3">
            <span className="flex items-center gap-1.5">
              <CalendarIcon size={11} className="text-slate-400" />
              {formatDate(entry.date)}
            </span>
            {entry.timeSlot && (
              <span className="flex items-center gap-1.5">
                <Clock size={11} className="text-slate-400" />
                {entry.timeSlot}
              </span>
            )}
          </div>

          {/* Status for appointments */}
          {entry.entryType === "appointment" && entry.status && (
            <span className={`inline-flex text-[10px] font-black uppercase px-2.5 py-1 rounded-full mb-3 ${
              entry.status === "completed" ? "bg-green-100 text-green-700" :
              entry.status === "cancelled" ? "bg-red-100 text-red-600" :
              "bg-teal-100 text-teal-700"
            }`}>{entry.status}</span>
          )}

          {/* Expand / collapse button */}
          {hasDetails && (
            <button
              onClick={() => setOpen(!open)}
              className={`w-full flex items-center justify-between text-xs font-bold border-t border-slate-100 pt-3 transition-colors ${
                open ? `${meta.color}` : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Eye size={13} />
                {open ? "Collapse" : (entry.entryType === "appointment" ? "View Diagnosis & Report" : "View Details")}
              </span>
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}

          {/* Expandable body */}
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-4 space-y-3">

                  {/* Description / notes */}
                  {entry.description && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Notes</p>
                      <p className="text-xs text-slate-700 leading-relaxed">{entry.description}</p>
                    </div>
                  )}

                  {/* Prescription notes */}
                  {entry.notes && !entry.description && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Doctor&apos;s Notes</p>
                      <p className="text-xs text-slate-700 leading-relaxed">{entry.notes}</p>
                    </div>
                  )}

                  {/* Medicines list (prescriptions) — Name + Dosage only */}
                  {entry.medicines?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Medicines</p>
                      <div className="space-y-2">
                        {entry.medicines.map((med: any, j: number) => (
                          <div
                            key={j}
                            className="flex items-center justify-between bg-violet-50 border border-violet-100 rounded-xl px-3 py-2.5"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Pill size={13} className="text-violet-500 shrink-0" />
                              <span className="text-xs font-bold text-slate-800 truncate">{med.medicineName}</span>
                            </div>
                            <span className="ml-3 shrink-0 text-xs font-semibold text-violet-700 bg-white border border-violet-200 px-2.5 py-1 rounded-lg">
                              {med.dosage}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Diagnosis (appointments) */}
                  {entry.entryType === "appointment" && (
                    <div className={`${meta.bg} border ${meta.border} rounded-xl p-3`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${meta.color}`}>Diagnosis</p>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        {entry.diagnosis || "No diagnosis recorded yet."}
                      </p>
                    </div>
                  )}

                  {/* Report URL (appointment) */}
                  {entry.entryType === "appointment" && (
                    entry.reportUrl ? (
                      <a
                        href={entry.reportUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg border ${meta.border} ${meta.color} ${meta.bg} hover:opacity-80 transition-opacity`}
                      >
                        <FileText size={13} /> View Report / File
                      </a>
                    ) : (
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                        <AlertCircle size={11} /> No report attached
                      </div>
                    )
                  )}

                  {/* Attachments (records) */}
                  {entry.attachments?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Attachments</p>
                      <div className="flex flex-wrap gap-2">
                        {entry.attachments.map((url: string, j: number) => (
                          <a key={j} href={url} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                            <FileText size={11} /> View File {j + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Image preview (for scan/xray records) */}
                  {entry.imageUrl && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Image / Scan</p>
                      <img
                        src={entry.imageUrl} alt="Medical scan"
                        className="w-full max-h-48 rounded-xl object-cover border border-slate-100"
                      />
                      <a href={entry.imageUrl} target="_blank" rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-teal-700 transition-colors">
                        <Eye size={11} /> View Full Size
                      </a>
                    </div>
                  )}

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── Filter tabs ───────────────────────────────────────────────────────────
const FILTERS = [
  { key: "all",          label: "All" },
  { key: "prescription", label: "Prescriptions" },
  { key: "lab_report",   label: "Lab Reports" },
  { key: "xray",         label: "Scans / X-Rays" },
  { key: "report",       label: "Reports" },
  { key: "vaccination",  label: "Vaccinations" },
];

// ══════════════════════════════════════════════════════════════════════════
// Page
// ══════════════════════════════════════════════════════════════════════════
export default function PatientTimeline() {
  const { profile, timeline, formatDate } = usePatient();
  const [filter, setFilter] = useState("all");
  const [backendEntries, setBackendEntries] = useState<any[]>([]);
  const [backendLoading, setBackendLoading] = useState(true);

  const patientId = profile?.patientId || profile?.id;

  // Load merged timeline from backend endpoint
  useEffect(() => {
    if (!patientId || patientId === "...") return;
    fetch(`http://localhost:8000/api/appointments/patient/${patientId}/timeline`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data?.length) {
          setBackendEntries(data.data);
        }
      })
      .catch(() => {})
      .finally(() => setBackendLoading(false));
  }, [patientId]);

  // Fallback: merge from context if backend returns empty (records only — no appointments)
  const contextEntries = [
    ...timeline.map((t: any) => ({
      _id:        t._id,
      entryType:  "record",
      category:   t.type || "consultation",
      title:      t.title,
      doctorName: t.doctorName || t.doctor || "",
      date:       t.date,
      description: t.description || t.notes || "",
      attachments: t.attachments || [],
      imageUrl:   t.imageUrl || "",
      recordType: t.recordType || "report",
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const entries = backendEntries.length > 0 ? backendEntries : contextEntries;

  const filtered = filter === "all"
    ? entries
    : entries.filter(e => e.category === filter || e.entryType === filter);

  return (
    <div className="max-w-3xl mx-auto space-y-6">


      {/* ── Filter Chips ── */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => {
          const count = f.key === "all"
            ? entries.length
            : entries.filter(e => e.category === f.key || e.entryType === f.key).length;
          if (f.key !== "all" && count === 0) return null;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                filter === f.key
                  ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
              }`}
            >
              <Filter size={10} className={filter === f.key ? "text-white" : "text-slate-400"} />
              {f.label}
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                filter === f.key ? "bg-white text-slate-900" : "bg-slate-100 text-slate-500"
              }`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Entries ── */}
      {backendLoading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-slate-500 font-semibold">
          <div className="w-6 h-6 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
          Loading timeline...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-14 text-center border border-slate-100 shadow-sm">
          <Activity size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-500 font-bold">No {filter === "all" ? "" : filter} entries yet.</p>
          <p className="text-slate-400 text-sm mt-1">
            Completed appointments and uploaded records appear here automatically.
          </p>
        </div>
      ) : (
        <div className="relative pl-10">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-teal-300 via-slate-200 to-slate-100 rounded-full" />
          <div className="space-y-5">
            <AnimatePresence>
              {filtered.map((entry: any, i: number) => (
                <motion.div
                  key={entry._id || entry.appointmentId || i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <TimelineEntry entry={entry} formatDate={formatDate} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
