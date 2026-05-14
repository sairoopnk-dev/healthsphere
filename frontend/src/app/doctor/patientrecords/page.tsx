"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Plus, Pill, FileText, CheckCircle2,
  AlertCircle, Image as ImageIcon, Paperclip, Send, Stethoscope,
  Trash2, Calendar as CalendarIcon,
  User, Building2, Download, Eye
} from "lucide-react";
import { useDoctor } from "../_context/DoctorContext";
import MedicineCard from "../_components/MedicineCard";
import { extractCondition } from "@/utils/prescriptionParser";

// ── Type badge colours ───────────────────────────────────────────────────
const TYPE_META: Record<string, { color: string; bg: string; border: string; icon: any; label: string }> = {
  consultation: { color: "text-teal-700",   bg: "bg-teal-50",   border: "border-teal-200",   icon: Stethoscope, label: "Consultation" },
  appointment:  { color: "text-cyan-700",   bg: "bg-cyan-50",   border: "border-cyan-200",   icon: CalendarIcon, label: "Appointment" },
  prescription: { color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200", icon: Pill,         label: "Prescription" },
  lab_report:   { color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",    icon: FileText,     label: "Lab Report" },
  xray:         { color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200",   icon: Eye,          label: "X-Ray / Scan" },
  report:       { color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", icon: FileText,     label: "Report" },
  vaccination:  { color: "text-green-700",  bg: "bg-green-50",  border: "border-green-200",  icon: FileText,     label: "Vaccination" },
};
const DEFAULT_META = TYPE_META.consultation;

function isImg(url: string) { return /\.(jpg|jpeg|png|gif|webp)$/i.test(url); }

// ── Record Detail Modal ───────────────────────────────────────────────
function RecordDetailModal({ entry, formatDate, onClose }: { entry: any; formatDate: (d:any)=>string; onClose: ()=>void }) {
  const meta = TYPE_META[entry.type || entry.category] || DEFAULT_META;
  const allFiles: { url: string; label: string; docType: string }[] = [];
  (entry.documents || []).forEach((d: any) => allFiles.push({ url: d.fileUrl, label: d.label || d.type, docType: d.type }));
  (entry.attachments || []).forEach((url: string, i: number) => allFiles.push({ url, label: `File ${i+1}`, docType: "other" }));

  const sections = [
    { label: "Prescriptions",  items: allFiles.filter(a => a.docType === "prescription") },
    { label: "X-Rays / Scans", items: allFiles.filter(a => a.docType === "xray") },
    { label: "Lab Reports",    items: allFiles.filter(a => a.docType === "blood_report") },
    { label: "Other Files",    items: allFiles.filter(a => a.docType === "other") },
  ].filter(s => s.items.length > 0);
  if (!sections.length && allFiles.length) sections.push({ label: "Files", items: allFiles });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden">
        <div className={`px-7 py-5 flex items-center gap-4 ${meta.bg}`}>
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${meta.bg} ${meta.color} border ${meta.border} shadow shrink-0`}>
            <meta.icon size={18}/>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-[10px] font-black uppercase tracking-widest ${meta.color}`}>{meta.label}</p>
            <h3 className="text-lg font-black text-slate-800 truncate">{entry.title}</h3>
            <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-slate-500 font-semibold">
              {entry.doctorName   && <span className="flex items-center gap-1"><User size={10}/>{entry.doctorName}</span>}
              {entry.hospitalName && <span className="flex items-center gap-1"><Building2 size={10}/>{entry.hospitalName}</span>}
              <span className="flex items-center gap-1"><CalendarIcon size={10}/>{formatDate(entry.date || entry.createdAt)}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition shadow shrink-0"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-7 space-y-6">
          {(entry.diagnosis || entry.description || entry.notes) && (
            <div className={`rounded-2xl p-4 border ${meta.border} ${meta.bg}`}>
              <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${meta.color}`}>{entry.diagnosis ? "Diagnosis" : "Notes"}</p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{entry.diagnosis || entry.description || entry.notes}</p>
            </div>
          )}

          {entry.medicines?.length > 0 && (
            <div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">💊 Medicines</p>
              <div className="space-y-2">
                {entry.medicines.map((m: any, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Pill size={13} className="text-violet-500 shrink-0"/>
                      <span className="text-sm font-bold text-slate-800">{m.name || m.medicineName}</span>
                      {m.type && <span className="text-[10px] bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-bold capitalize">{m.type}</span>}
                    </div>
                    <p className="text-xs text-violet-700 font-semibold shrink-0 ml-2">
                      {[m.dosage, m.frequency, m.duration ? m.duration : m.durationDays ? m.durationDays+"d" : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sections.length > 0 ? sections.map(sec => (
            <div key={sec.label}>
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">📎 {sec.label}</p>
              <div className="grid grid-cols-2 gap-3">
                {sec.items.map((item, i) => isImg(item.url) ? (
                  <div key={i} className="relative group rounded-2xl overflow-hidden border border-slate-200">
                    <img src={item.url} alt={item.label} className="w-full h-36 object-cover"/>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <a href={item.url} target="_blank" rel="noreferrer" className="p-2 bg-white rounded-xl"><Eye size={16} className="text-slate-700"/></a>
                      <a href={item.url} download className="p-2 bg-white rounded-xl"><Download size={16} className="text-slate-700"/></a>
                    </div>
                    <p className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[10px] px-2 py-1 font-semibold truncate">{item.label}</p>
                  </div>
                ) : (
                  <div key={i} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    <FileText size={18} className="text-blue-500 shrink-0"/>
                    <span className="text-xs font-semibold text-slate-700 flex-1 truncate">{item.label}</span>
                    <div className="flex gap-1">
                      <a href={item.url} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-slate-200 rounded-lg"><Eye size={13} className="text-slate-500"/></a>
                      <a href={item.url} download className="p-1.5 hover:bg-slate-200 rounded-lg"><Download size={13} className="text-slate-500"/></a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )) : (
            <div className="text-center py-8 text-slate-400 text-sm">
              <FileText size={36} className="mx-auto mb-3 text-slate-200"/>
              No documents attached.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── EHR Card ────────────────────────────────────────────────────────────────────
function EHRCard({ entry, formatDate, onClick }: { entry: any; formatDate:(d:any)=>string; onClick:()=>void }) {
  const meta = TYPE_META[entry.type || entry.category] || DEFAULT_META;
  const meds: any[] = entry.medicines || [];
  const attachCount = (entry.documents?.length || 0) + (entry.attachments?.length || 0);

  return (
    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:0.97}}
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden group"
    >
      <div className={`h-1 w-full ${meta.bg.replace("50","200")}`}/>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${meta.bg} ${meta.color} shrink-0`}><meta.icon size={16}/></div>
            <div className="min-w-0">
              <h4 className="font-bold text-slate-800 text-sm truncate max-w-[210px]">{entry.title}</h4>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{formatDate(entry.date || entry.createdAt)}</p>
            </div>
          </div>
          <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${meta.bg} ${meta.color}`}>{meta.label}</span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-semibold mb-3">
          {entry.doctorName   && <span className="flex items-center gap-1"><User size={11} className="text-slate-400"/>{entry.doctorName}</span>}
          {entry.hospitalName && <span className="flex items-center gap-1"><Building2 size={11} className="text-slate-400"/>{entry.hospitalName}</span>}
        </div>

        {(entry.diagnosis || entry.description || entry.notes) && (
          <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">🩺 {entry.diagnosis || entry.description || entry.notes}</p>
        )}

        {meds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {meds.slice(0,3).map((m:any, i:number) => (
              <span key={i} className="flex items-center gap-1 text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-full">
                <Pill size={9}/>{m.name || m.medicineName}
              </span>
            ))}
            {meds.length > 3 && <span className="text-[10px] text-slate-400 font-bold">+{meds.length-3} more</span>}
          </div>
        )}

        <div className="flex items-center justify-between pt-2.5 border-t border-slate-50">
          <span className="text-[10px] text-slate-400">
            {attachCount > 0 ? `📎 ${attachCount} file${attachCount>1?"s":""}` : "No attachments"}
          </span>
          <span className="text-[10px] font-bold text-blue-600 group-hover:underline flex items-center gap-0.5">View Details <Eye size={10}/></span>
        </div>
      </div>
    </motion.div>
  );
}

export default function DoctorPatientRecords() {
  const ctx = useDoctor();
  const {
    searchId, setSearchId, accessStep, setAccessStep,
    accessError, setAccessError, accessLoading, patientData, setPatientData,
    patientTimeline, handleSearch, handleVerify, formatDate,
    showAddRecord, setShowAddRecord, newRecord, setNewRecord,
    uploading, attachedFiles, setAttachedFiles, fileRef, handleAddRecord,
    rxTitle, setRxTitle, rxNotes, setRxNotes, rxMeds, setRxMeds,
    addMed, removeMed, updateMed, emptyMed, savedPatients, setSavedPatients, openPatientRecords,
    doctor, API, showToast
  } = ctx;

  // Stable toast callback passed to MedicineCard to avoid re-render cascade
  const handleToast = useCallback((msg: string, type: "success" | "error") => {
    showToast(msg, type);
  }, [showToast]);

  // Refs to avoid stale closures in stable callbacks (context setters are plain, not React dispatch)
  const rxNotesRef = useRef(rxNotes);
  const rxTitleRef = useRef(rxTitle);
  useEffect(() => { rxNotesRef.current = rxNotes; }, [rxNotes]);
  useEffect(() => { rxTitleRef.current = rxTitle; }, [rxTitle]);

  // Append a transcript to Notes (called from each MedicineCard after voice fill)
  const handleAppendNotes = useCallback((transcript: string) => {
    const sep = rxNotesRef.current.trim() ? " " : "";
    setRxNotes(rxNotesRef.current + sep + transcript);
  }, [setRxNotes]);

  // Set Prescription Title from extracted condition (only if currently empty)
  const handleSetTitle = useCallback((condition: string) => {
    if (!rxTitleRef.current.trim()) setRxTitle(condition);
  }, [setRxTitle]);

  const [filterQuery, setFilterQuery] = useState("");
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; type: "single" | "bulk"; targetId?: string }>({ open: false, type: "single" });
  const [deleting, setDeleting] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  // Filter and Sort Alphabetically
  const filteredPatients = savedPatients
    .filter((p: any) => p.name.toLowerCase().includes(filterQuery.toLowerCase()))
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  const toggleSelectPatient = (e: React.MouseEvent, pid: string) => {
    e.stopPropagation();
    setSelectedPatients(prev => prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]);
  };

  const handleSingleDelete = async () => {
    if (!deleteModal.targetId || !doctor) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/api/doctor/saved-patients/${doctor.id}/${deleteModal.targetId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to remove patient");
      
      // Optimistic UI Update
      setSavedPatients(savedPatients.filter(p => p.patientId !== deleteModal.targetId));
      setSelectedPatients(prev => prev.filter(id => id !== deleteModal.targetId));
      showToast("Patient removed successfully", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setDeleting(false);
      setDeleteModal({ open: false, type: "single" });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPatients.length === 0 || !doctor) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/api/doctor/saved-patients/bulk`, {
        method: 'DELETE',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId: doctor.id, patientIds: selectedPatients })
      });
      if (!res.ok) throw new Error("Failed to remove patients");

      // Optimistic UI Update
      setSavedPatients(savedPatients.filter(p => !selectedPatients.includes(p.patientId)));
      setSelectedPatients([]);
      showToast("Selected patients removed", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setDeleting(false);
      setDeleteModal({ open: false, type: "bulk" });
    }
  };

  return (
    <div className="max-w-3xl space-y-5 relative">
      {/* Confirmation Modal */}
      <AnimatePresence>
        {deleteModal.open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Remove Patient{deleteModal.type === "bulk" ? "s" : ""}</h3>
              <p className="text-slate-500 text-sm mb-6">
                Are you sure you want to remove {deleteModal.type === "bulk" ? `${selectedPatients.length} patients` : "this patient"} from your list?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteModal({ open: false, type: "single" })} disabled={deleting}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
                  Cancel
                </button>
                <button onClick={deleteModal.type === "single" ? handleSingleDelete : handleBulkDelete} disabled={deleting}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center">
                  {deleting ? "Removing..." : "Remove"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Search & Add Step */}
      {accessStep === "search" && (
        <div className="space-y-6">
          {/* Add New Patient Card */}
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
            className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
                <Plus size={24} className="text-blue-500"/>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-900 mb-1">Add Patient</h2>
                <p className="text-slate-500 mb-5 text-sm">Enter the Patient ID to securely access and save patient records to your list.</p>
                <form onSubmit={handleSearch} className="flex gap-3 max-w-sm">
                  <input type="text" value={searchId} onChange={e => setSearchId(e.target.value)} required
                    placeholder="PID-XXXXX"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/50 outline-none font-bold tracking-wider"/>
                  <button type="submit" disabled={accessLoading}
                    className="bg-blue-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-blue-700 disabled:bg-blue-400 transition-colors shadow-md shadow-blue-600/20">
                    {accessLoading ? "..." : "Add"}
                  </button>
                </form>
                {accessError && <p className="text-red-500 text-sm mt-3 font-medium">{accessError}</p>}
              </div>
            </div>
          </motion.div>

          {/* Saved Patients List */}
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <User size={20} className="text-blue-600"/> Saved Patients
              </h2>
              <div className="flex items-center gap-3">
                {selectedPatients.length > 0 && (
                  <button onClick={() => setDeleteModal({ open: true, type: "bulk" })}
                    className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-2 rounded-xl text-sm font-bold border border-red-200 hover:bg-red-100 transition-colors">
                    <Trash2 size={16} /> Delete Selected ({selectedPatients.length})
                  </button>
                )}
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search by name..." 
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm font-medium w-64"
                  />
                </div>
              </div>
            </div>

            {savedPatients.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl">
                <User size={32} className="mx-auto text-slate-300 mb-3"/>
                <p className="text-slate-500 font-medium">No saved patients yet.</p>
                <p className="text-slate-400 text-sm mt-1">Add a patient using their PID above.</p>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-slate-500 font-medium">No patients found matching "{filterQuery}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredPatients.map((p: any) => (
                  <div
                    key={p.patientId}
                    onClick={() => openPatientRecords(p.patientId)}
                    className="flex flex-col items-start p-4 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-md hover:bg-blue-50/30 transition-all text-left group cursor-pointer relative"
                  >
                    <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setDeleteModal({ open: true, type: "single", targetId: p.patientId }); }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 w-full mb-2 pr-10">
                      <div onClick={(e) => toggleSelectPatient(e, p.patientId)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          selectedPatients.includes(p.patientId) ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300 hover:border-blue-400"
                        }`}>
                        {selectedPatients.includes(p.patientId) && <CheckCircle2 size={14} className="text-white" />}
                      </div>
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <h3 className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors truncate pr-2">{p.name}</h3>
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full shrink-0">
                          {p.patientId}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 ml-8">
                      Contact: {p.contactNumber || "N/A"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}



      {/* Patient View */}
      {accessStep === "view" && patientData && (
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="space-y-5">
          {/* Patient Header */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-teal-500/30">
                  {patientData.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">{patientData.name}</h2>
                  <div className="flex flex-wrap gap-3 mt-1">
                    <span className="text-xs text-slate-500 font-semibold">{patientData.patientId}</span>
                    <span className="text-xs text-slate-500">Age {patientData.age}</span>
                    <span className="text-xs text-slate-500">{patientData.gender}</span>
                    <span className="text-xs bg-red-50 text-red-600 font-black px-2 py-0.5 rounded-full">{patientData.bloodGroup}</span>
                  </div>
                  <div className="flex gap-3 mt-1">
                    <span className="text-xs text-slate-400">{patientData.email}</span>
                    <span className="text-xs text-slate-400">{patientData.contactNumber}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAddRecord(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-700 shadow-md shadow-blue-600/20">
                  <Plus size={16}/> Add Record
                </button>
                <button onClick={() => { setAccessStep("search"); setPatientData(null); setSearchId(""); }}
                  className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-200">Close</button>
              </div>
            </div>
          </div>

          {/* Add Record Modal */}
          <AnimatePresence>
            {showAddRecord && (
              <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                className="bg-white rounded-3xl p-7 border-2 border-blue-200 shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-black text-slate-800 flex items-center gap-2 text-lg">
                    <Plus size={20} className="text-blue-600"/> New Medical Record
                  </h3>
                  <button onClick={() => { setShowAddRecord(false); setAttachedFiles([]); setRxMeds([{...emptyMed}]); setRxTitle(""); setRxNotes(""); }}
                    className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200">
                    <X size={16}/>
                  </button>
                </div>

                {/* Record Type */}
                <div className="mb-5">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Record Type</label>
                  <select value={newRecord.type} onChange={e => setNewRecord((r: any) => ({...r, type: e.target.value}))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 font-semibold text-sm bg-slate-50">
                    <option value="prescription">💊 Prescription</option>
                    <option value="consultation">🩺 Consultation Note</option>
                    <option value="lab_report">🔬 Lab Report</option>
                    <option value="xray">🩻 X-Ray / Scan</option>
                    <option value="vaccination">💉 Vaccination</option>
                  </select>
                </div>

                {/* Prescription Builder */}
                {newRecord.type === "prescription" ? (
                  <div className="space-y-5">

                    {/* Prescription Title */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Prescription Title <span className="text-red-500">*</span></label>
                      <input type="text" value={rxTitle} onChange={e => setRxTitle(e.target.value)}
                        placeholder="e.g. High Fever (auto-filled when you use medicine mic)"
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 font-semibold text-sm"/>
                    </div>

                    {/* Notes — auto-appended by medicine mics, also manually editable */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">
                        Notes <span className="text-slate-400 font-medium">(optional — appended automatically from each medicine mic)</span>
                      </label>
                      <textarea value={rxNotes} onChange={e => setRxNotes(e.target.value)}
                        placeholder="Auto-filled when you use the 🎙️ button on each medicine below."
                        rows={3}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 font-medium text-sm resize-none"/>
                    </div>

                    <div className="space-y-4">
                      <AnimatePresence>
                        {rxMeds.map((med: any, idx: number) => (
                          <MedicineCard
                            key={idx}
                            med={med}
                            index={idx}
                            total={rxMeds.length}
                            onUpdate={updateMed}
                            onRemove={removeMed}
                            onToast={handleToast}
                            onAppendNotes={handleAppendNotes}
                            onSetTitle={handleSetTitle}
                            disabled={uploading}
                          />
                        ))}
                      </AnimatePresence>
                      <button onClick={addMed}
                        className="w-full border-2 border-dashed border-blue-300 text-blue-600 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-50 transition-all text-sm font-bold">
                        <Plus size={16}/> Add Another Medicine
                      </button>
                    </div>

                    {/* File attachments */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Attach Files <span className="text-slate-400 font-medium">(optional)</span></label>
                      <input type="file" ref={fileRef} accept="image/*,.pdf" multiple
                        onChange={e => setAttachedFiles((prev: File[]) => [...prev, ...Array.from(e.target.files || [])])}
                        className="hidden"/>
                      <button type="button" onClick={() => fileRef.current?.click()}
                        className="w-full border-2 border-dashed border-slate-300 hover:border-blue-400 text-slate-500 hover:text-blue-600 py-4 rounded-2xl flex flex-col items-center gap-1.5 transition-all font-medium text-sm group">
                        <Paperclip size={18} className="group-hover:scale-110 transition-transform"/>
                        <span>Click to attach files</span>
                        <span className="text-xs text-slate-400">Images, PDFs · Max 10MB each</span>
                      </button>
                      {attachedFiles.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {attachedFiles.map((f: File, i: number) => (
                            <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
                              <ImageIcon size={13} className="text-blue-500 shrink-0"/>
                              <span className="text-xs font-medium text-slate-600 flex-1 truncate">{f.name}</span>
                              <span className="text-xs text-slate-400 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                              <button onClick={() => setAttachedFiles((prev: File[]) => prev.filter((_: File, j: number) => j !== i))} className="text-slate-300 hover:text-red-400 shrink-0"><X size={12}/></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 justify-end">
                      <button onClick={() => { setShowAddRecord(false); setAttachedFiles([]); setRxMeds([{...emptyMed}]); setRxTitle(""); setRxNotes(""); }}
                        className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Cancel</button>
                      <button onClick={handleAddRecord}
                        disabled={uploading || !rxTitle || rxMeds.every((m: any) => !m.medicineName || !m.dosage || !m.frequency || !m.durationDays)}
                        className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 flex items-center gap-2 shadow-md shadow-blue-600/20">
                        <Send size={15}/>{uploading ? "Saving..." : "Save Prescription"}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Non-prescription form */
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Title</label>
                        <input type="text" value={newRecord.title} onChange={e => setNewRecord((r: any) => ({...r, title: e.target.value}))} placeholder="e.g. Blood Test Results" required
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 font-semibold text-sm"/>
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Description / Findings</label>
                      <textarea value={newRecord.description} onChange={e => setNewRecord((r: any) => ({...r, description: e.target.value}))} placeholder="Detailed notes..." rows={4} required
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 font-medium text-sm resize-none"/>
                    </div>
                    <div className="mb-5">
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Attach Images / Reports</label>
                      <input type="file" ref={fileRef} accept="image/*,.pdf" multiple onChange={e => setAttachedFiles(Array.from(e.target.files || []))} className="hidden"/>
                      <button type="button" onClick={() => fileRef.current?.click()}
                        className="w-full border-2 border-dashed border-slate-300 hover:border-blue-400 text-slate-500 hover:text-blue-600 py-5 rounded-2xl flex flex-col items-center gap-2 transition-all font-medium text-sm group">
                        <Paperclip size={22} className="group-hover:scale-110 transition-transform"/> Click to attach files
                        <span className="text-xs text-slate-400">Images, PDFs · Max 10MB each</span>
                      </button>
                      {attachedFiles.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {attachedFiles.map((f: File, i: number) => (
                            <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
                              <ImageIcon size={14} className="text-blue-500 shrink-0"/>
                              <span className="text-xs font-medium text-slate-600 flex-1 truncate">{f.name}</span>
                              <span className="text-xs text-slate-400">{(f.size/1024).toFixed(0)} KB</span>
                              <button onClick={() => setAttachedFiles((prev: File[]) => prev.filter((_: File,j: number) => j !== i))} className="text-slate-300 hover:text-red-400"><X size={12}/></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => { setShowAddRecord(false); setAttachedFiles([]); }}
                        className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Cancel</button>
                      <button onClick={handleAddRecord} disabled={uploading || !newRecord.title || !newRecord.description}
                        className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2 shadow-md shadow-blue-600/20">
                        <Send size={15}/>{uploading ? "Uploading..." : "Save & Send to Patient"}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* EHR Record Cards */}
          <div className="bg-white rounded-3xl p-7 shadow-sm border border-slate-100">
            <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 text-base">
              <FileText size={18} className="text-blue-600"/> Medical History
              <span className="ml-auto text-xs font-semibold text-slate-400">{patientTimeline.length} record{patientTimeline.length !== 1 ? "s" : ""}</span>
            </h3>
            {patientTimeline.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl">
                <FileText size={40} className="mx-auto text-slate-200 mb-3"/>
                <p className="text-slate-400 text-sm">No records yet. Add the first record above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <AnimatePresence>
                  {(() => {
                    const seen = new Set<string>();
                    return [...patientTimeline]
                      .sort((a: any, b: any) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime())
                      .filter((r: any) => {
                        const key = r._id || r.appointmentId || `${r.title}-${r.date}`;
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                      })
                      .map((entry: any) => (
                        <EHRCard
                          key={entry._id || entry.appointmentId || entry.title}
                          entry={entry}
                          formatDate={formatDate}
                          onClick={() => setSelectedRecord(entry)}
                        />
                      ));
                  })()}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Record Detail Modal */}
          <AnimatePresence>
            {selectedRecord && (
              <RecordDetailModal
                entry={selectedRecord}
                formatDate={formatDate}
                onClose={() => setSelectedRecord(null)}
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

