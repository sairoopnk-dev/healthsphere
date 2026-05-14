"use client";

import { useState, useRef, useCallback } from "react";
import {
  FileText, AlertCircle, X, Sparkles, ChevronDown, ChevronUp,
  Plus, Upload, Calendar, Image, FileIcon, Loader2, CheckCircle2,
  Trash2, ClipboardList, FolderOpen, SquareCheckBig, Square,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePatient } from "../_context/PatientContext";

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  const day   = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year  = date.getFullYear();
  return `${day}-${month}-${year}`;
}

const TYPE_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  xray:        { bg: "bg-blue-100",   text: "text-blue-600",   badge: "bg-blue-50 text-blue-600"   },
  prescription:{ bg: "bg-purple-100", text: "text-purple-600", badge: "bg-purple-50 text-purple-600"},
  lab_report:  { bg: "bg-red-100",    text: "text-red-600",    badge: "bg-red-50 text-red-600"     },
  vaccination: { bg: "bg-green-100",  text: "text-green-600",  badge: "bg-green-50 text-green-600" },
  consultation:{ bg: "bg-teal-100",   text: "text-teal-600",   badge: "bg-teal-50 text-teal-600"   },
};

// ── Confirmation Modal ─────────────────────────────────────────────────────
interface ConfirmDeleteModalProps {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function ConfirmDeleteModal({ count, onConfirm, onCancel, isDeleting }: ConfirmDeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
      >
        {/* Red icon */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
            <Trash2 size={28} className="text-red-500" />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">
            Delete {count === 1 ? "Record" : `${count} Records`}?
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Are you sure you want to delete {count === 1 ? "this record" : `these ${count} records`}?{" "}
            <strong className="text-red-600">This action is permanent and cannot be undone.</strong>
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20 text-sm"
          >
            {isDeleting
              ? <><Loader2 size={16} className="animate-spin" /> Deleting...</>
              : <><Trash2 size={16} /> Delete Permanently</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Upload Modal ───────────────────────────────────────────────────────────
interface UploadModalProps {
  patientId: string;
  onClose: () => void;
  onSuccess: (record: any) => void;
}

function UploadRecordModal({ patientId, onClose, onSuccess }: UploadModalProps) {
  const [file, setFile]             = useState<File | null>(null);
  const [recordDate, setRecordDate] = useState("");
  const [title, setTitle]           = useState("");
  const [recordType, setRecordType] = useState<"report" | "prescription">("report");
  const [uploading, setUploading]   = useState(false);
  const [error, setError]           = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!file)       { setError("Please select a file to upload."); return; }
    if (!recordDate) { setError("Please enter the date of this record."); return; }

    setUploading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("patientId",  patientId);
      fd.append("recordDate", recordDate);
      fd.append("title",      title || file.name);
      fd.append("recordType", recordType);
      fd.append("file",       file);

      const res  = await fetch("http://localhost:8000/api/medical-records/patient-upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      onSuccess(data.record);
      onClose();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setUploading(false);
    }
  };

  const isImage = file && file.type.startsWith("image/");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 p-2 rounded-full text-slate-500">
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center">
            <Upload size={22} className="text-teal-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">Upload Record</h2>
            <p className="text-slate-500 text-sm">PDF report or image scan</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Record Type selector */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Record Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["prescription", "report"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setRecordType(t)}
                  className={`py-2.5 rounded-xl font-bold text-sm border-2 transition-all capitalize ${
                    recordType === t
                      ? t === "prescription"
                        ? "border-purple-500 bg-purple-50 text-purple-700"
                        : "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {t === "prescription" ? "📋 Prescription" : "📁 Other Record"}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {recordType === "prescription"
                ? "Goes into the Prescriptions section"
                : "Goes into Other Records (X-rays, blood reports, etc.)"}
            </p>
          </div>

          {/* File picker */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              File <span className="text-red-500">*</span>
              <span className="text-xs font-normal text-slate-400 ml-1">(PDF, JPG, PNG, max 10 MB)</span>
            </label>
            <input
              type="file" ref={fileRef}
              accept="image/*,.pdf"
              className="hidden"
              onChange={e => { setFile(e.target.files?.[0] || null); }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`w-full border-2 border-dashed rounded-2xl py-6 flex flex-col items-center gap-2 transition-all text-sm font-medium
                ${file ? "border-teal-400 bg-teal-50 text-teal-700" : "border-slate-300 hover:border-teal-400 text-slate-500 hover:text-teal-600"}`}
            >
              {file ? (
                <>
                  {isImage ? <Image size={26} /> : <FileIcon size={26} />}
                  <span className="font-bold truncate max-w-[260px]">{file.name}</span>
                  <span className="text-xs opacity-70">{(file.size / 1024).toFixed(0)} KB · click to change</span>
                </>
              ) : (
                <>
                  <Upload size={26} />
                  <span>Click to select file</span>
                </>
              )}
            </button>
          </div>

          {/* Record date */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Record Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={recordDate}
                onChange={e => setRecordDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="w-full pl-9 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 bg-slate-50 transition-all"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">Enter the <strong>actual date</strong> on the report, not today's date.</p>
          </div>

          {/* Optional title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Title / Label
              <span className="text-xs font-normal text-slate-400 ml-1">(optional — defaults to filename)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Blood Test Report, Chest X-Ray"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 bg-slate-50 transition-all"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle size={14} className="text-red-500 shrink-0" />
              <p className="text-red-600 text-xs font-medium">{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 disabled:from-teal-300 text-white font-bold rounded-xl hover:from-teal-600 hover:to-emerald-600 transition-all shadow-lg shadow-teal-500/20"
          >
            {uploading ? <><Loader2 size={16} className="animate-spin" /> Uploading...</> : <><Upload size={16} /> Upload Record</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Record Card ────────────────────────────────────────────────────────────
interface RecordCardProps {
  rec: any;
  idx: number;
  selected: boolean;
  selectMode: boolean;
  onToggleSelect: (id: string) => void;
  summarizingId: string | null;
  expandedSummary: string | null;
  setExpandedSummary: (id: string | null) => void;
  handleSummarize: (id: string) => void;
  onDeleteSingle: (id: string) => void;
}

function RecordCard({
  rec, idx, selected, selectMode, onToggleSelect,
  summarizingId, expandedSummary, setExpandedSummary, handleSummarize, onDeleteSingle,
}: RecordCardProps) {
  const recId       = rec._id?.toString();
  const hasSummary  = !!rec.aiSummary;
  const isLoading   = summarizingId === recId;
  const isExpanded  = expandedSummary === recId;
  const canSummarize = (rec.type === "prescription" || rec.type === "lab_report" ||
    rec.type === "xray" || rec.type === "vaccination") && !hasSummary;
  const typeColor = TYPE_COLORS[rec.type] || TYPE_COLORS.consultation;

  return (
    <motion.div
      key={recId || idx}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: idx * 0.03 }}
      onClick={() => selectMode && onToggleSelect(recId)}
      className={`bg-white rounded-2xl border shadow-sm transition-all cursor-default ${
        selectMode ? "cursor-pointer" : ""
      } ${
        selected
          ? "border-red-400 ring-2 ring-red-300 shadow-red-100"
          : hasSummary ? "border-purple-200 hover:shadow-md" : "border-slate-100 hover:shadow-md"
      }`}
    >
      {/* Record Header */}
      <div className="p-5 flex items-start gap-4">
        {/* Checkbox (select mode) */}
        {selectMode && (
          <button
            onClick={e => { e.stopPropagation(); onToggleSelect(recId); }}
            className="shrink-0 mt-0.5"
          >
            {selected
              ? <SquareCheckBig size={20} className="text-red-500" />
              : <Square size={20} className="text-slate-300" />}
          </button>
        )}

        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typeColor.bg} ${typeColor.text}`}>
          <FileText size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-bold text-slate-800 text-sm truncate">{rec.title}</h4>
            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black capitalize ${typeColor.badge}`}>
              {rec.type?.replace("_", " ")}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{formatDate(rec.date)}</p>
          <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">{rec.description || rec.notes}</p>
        </div>
      </div>

      {/* Attachments */}
      {rec.attachments?.length > 0 && (
        <div className="px-5 pb-3 flex flex-wrap gap-2">
          {rec.attachments.map((url: string, j: number) =>
            url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
              <a key={j} href={url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
                <img src={url} alt="attachment" className="h-20 w-28 object-cover rounded-xl border border-slate-200 hover:opacity-80 transition-opacity" />
              </a>
            ) : (
              <a key={j} href={url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-all">
                <FileIcon size={12} /> View / Download
              </a>
            )
          )}
        </div>
      )}

      {/* Action Row */}
      <div className="px-5 pb-4 flex items-center gap-2 flex-wrap">
        {canSummarize && (
          <button
            onClick={e => { e.stopPropagation(); handleSummarize(recId!); }}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-bold rounded-xl hover:from-violet-600 hover:to-purple-700 disabled:opacity-60 transition-all shadow-sm shadow-purple-400/30"
          >
            {isLoading
              ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
              : <><Sparkles size={12} /> Summarize</>}
          </button>
        )}
        {hasSummary && (
          <button
            onClick={e => { e.stopPropagation(); setExpandedSummary(isExpanded ? null : recId!); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-bold rounded-xl hover:bg-purple-100 transition-all border border-purple-200"
          >
            <Sparkles size={12} />
            {isExpanded ? "Hide AI Summary" : "View AI Summary"}
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
        {hasSummary && <span className="text-[10px] text-purple-400 font-semibold ml-1">✓ AI Summary available</span>}

        {/* Single delete */}
        {!selectMode && (
          <button
            onClick={e => { e.stopPropagation(); onDeleteSingle(recId!); }}
            className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-200 transition-all"
            title="Delete record"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* AI Summary Panel */}
      <AnimatePresence>
        {hasSummary && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mx-4 mb-4 bg-gradient-to-br from-violet-50 to-purple-50 border border-purple-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Sparkles size={12} className="text-white" />
                </div>
                <span className="text-xs font-black text-purple-700 uppercase tracking-wider">AI Summary</span>
                {rec.summaryGeneratedAt && (
                  <span className="ml-auto text-[10px] text-purple-400 font-medium">
                    Generated {formatDate(rec.summaryGeneratedAt)}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                {rec.aiSummary}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════════════════
export default function PatientMedicalRecords() {
  const {
    timeline, setTimeline,
    profile,
    summarizingId, summaryError, setSummaryError,
    expandedSummary, setExpandedSummary,
    handleSummarize,
  } = usePatient();

  // ── UI state ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]     = useState<"prescriptions" | "reports">("prescriptions");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [justUploaded, setJustUploaded]       = useState(false);

  // Delete state
  const [selectMode, setSelectMode]         = useState(false);
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete]   = useState<{ ids: string[] } | null>(null);
  const [isDeleting, setIsDeleting]         = useState(false);

  const patientId = profile?.patientId || profile?.id;

  // ── Derived lists ──────────────────────────────────────────────────────
  const prescriptions = [...timeline]
    .filter((r: any) => r.recordType === "prescription" || r.type === "prescription")
    .sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  const reports = [...timeline]
    .filter((r: any) => !(r.recordType === "prescription" || r.type === "prescription"))
    .sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  const displayList = activeTab === "prescriptions" ? prescriptions : reports;

  // ── Upload success ──────────────────────────────────────────────────────
  const handleUploadSuccess = useCallback((newRecord: any) => {
    setTimeline((prev: any[]) =>
      [newRecord, ...prev].sort(
        (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
      )
    );
    setJustUploaded(true);
    // Switch tab to match the new upload
    if (newRecord.recordType === "prescription" || newRecord.type === "prescription") {
      setActiveTab("prescriptions");
    } else {
      setActiveTab("reports");
    }
    setTimeout(() => setJustUploaded(false), 3000);
  }, [setTimeline]);

  // ── Select helpers ──────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === displayList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayList.map((r: any) => r._id?.toString())));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  // ── Delete handlers ─────────────────────────────────────────────────────
  const requestDeleteSingle = (id: string) => {
    setConfirmDelete({ ids: [id] });
  };

  const requestDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setConfirmDelete({ ids: Array.from(selectedIds) });
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const { ids } = confirmDelete;
    setIsDeleting(true);
    try {
      if (ids.length === 1) {
        const res = await fetch(`http://localhost:8000/api/medical-records/${ids[0]}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");
      } else {
        const res = await fetch("http://localhost:8000/api/medical-records/bulk", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        if (!res.ok) throw new Error("Bulk delete failed");
      }

      // Remove from local state instantly
      setTimeline((prev: any[]) => prev.filter((r: any) => !ids.includes(r._id?.toString())));
      setSelectedIds(new Set());
      setSelectMode(false);
      setConfirmDelete(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const totalRecords = timeline.length;

  return (
    <div className="space-y-4 max-w-[1400px]">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">

        <div className="flex items-center gap-2 flex-wrap">
          {/* Select mode toggle */}
          {!selectMode ? (
            <button
              onClick={() => setSelectMode(true)}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-2xl font-bold text-sm transition-all"
            >
              <SquareCheckBig size={16} /> Select
            </button>
          ) : (
            <>
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-2xl font-bold text-sm transition-all"
              >
                {selectedIds.size === displayList.length ? <SquareCheckBig size={16} className="text-red-500" /> : <Square size={16} />}
                {selectedIds.size === displayList.length ? "Deselect All" : "Select All"}
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={requestDeleteSelected}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-red-500/20"
                >
                  <Trash2 size={16} /> Delete ({selectedIds.size})
                </button>
              )}
              <button
                onClick={exitSelectMode}
                className="flex items-center gap-2 border border-slate-200 text-slate-500 hover:bg-slate-50 px-4 py-2.5 rounded-2xl font-bold text-sm transition-all"
              >
                <X size={16} /> Cancel
              </button>
            </>
          )}
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-5 py-2.5 rounded-2xl font-bold text-sm hover:from-teal-600 hover:to-emerald-600 transition-all shadow-lg shadow-teal-500/20"
          >
            <Plus size={18} /> Upload Record
          </button>
        </div>
      </div>

      {/* Just-uploaded toast */}
      <AnimatePresence>
        {justUploaded && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4"
          >
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
            <p className="text-emerald-700 font-semibold text-sm">Record uploaded and sorted into your timeline!</p>
          </motion.div>
        )}
      </AnimatePresence>



      {summaryError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-center gap-3">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <p className="text-red-600 text-sm font-medium">{summaryError}</p>
          <button onClick={() => setSummaryError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Sub-section Tabs ── */}
      <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => { setActiveTab("prescriptions"); exitSelectMode(); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "prescriptions" ? "bg-white text-purple-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <ClipboardList size={16} />
          Prescriptions
          {prescriptions.length > 0 && (
            <span className="bg-purple-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {prescriptions.length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab("reports"); exitSelectMode(); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "reports" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <FolderOpen size={16} />
          Other Records
          {reports.length > 0 && (
            <span className="bg-teal-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {reports.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab description strip */}
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold ${
        activeTab === "prescriptions"
          ? "bg-purple-50 text-purple-700 border border-purple-100"
          : "bg-teal-50 text-teal-700 border border-teal-100"
      }`}>
        {activeTab === "prescriptions"
          ? <><ClipboardList size={13} /> Showing all prescription records — sorted latest first</>
          : <><FolderOpen size={13} /> Showing X-rays, blood reports and other uploads — sorted latest first</>}
      </div>

      {/* ── Records Grid ── */}
      {displayList.length === 0 ? (
        <div className="bg-white rounded-3xl p-14 text-center border border-dashed border-slate-200">
          {activeTab === "prescriptions"
            ? <ClipboardList size={48} className="mx-auto text-slate-200 mb-4" />
            : <FolderOpen   size={48} className="mx-auto text-slate-200 mb-4" />}
          <p className="text-slate-400 font-semibold">
            No {activeTab === "prescriptions" ? "prescriptions" : "other records"} yet.
          </p>
          <p className="text-slate-400 text-sm mt-1">
            Upload a {activeTab === "prescriptions" ? "prescription" : "report or scan"} to get started.
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="mt-4 inline-flex items-center gap-2 bg-teal-500 text-white px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-teal-600 transition-colors"
          >
            <Upload size={16} /> Upload Record
          </button>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {displayList.map((rec: any, i: number) => (
              <RecordCard
                key={rec._id?.toString() || i}
                rec={rec}
                idx={i}
                selected={selectedIds.has(rec._id?.toString())}
                selectMode={selectMode}
                onToggleSelect={toggleSelect}
                summarizingId={summarizingId}
                expandedSummary={expandedSummary}
                setExpandedSummary={setExpandedSummary}
                handleSummarize={handleSummarize}
                onDeleteSingle={requestDeleteSingle}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* ── Upload Modal ── */}
      <AnimatePresence>
        {showUploadModal && (
          <UploadRecordModal
            patientId={patientId}
            onClose={() => setShowUploadModal(false)}
            onSuccess={handleUploadSuccess}
          />
        )}
      </AnimatePresence>

      {/* ── Confirm Delete Modal ── */}
      <AnimatePresence>
        {confirmDelete && (
          <ConfirmDeleteModal
            count={confirmDelete.ids.length}
            onConfirm={executeDelete}
            onCancel={() => setConfirmDelete(null)}
            isDeleting={isDeleting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
