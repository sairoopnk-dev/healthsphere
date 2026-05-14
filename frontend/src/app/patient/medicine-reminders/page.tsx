"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pill, Plus, Trash2, Bell, BellOff, Clock, FileText,
  CheckCircle2, X, AlertCircle, ArrowLeft, ChevronRight
} from "lucide-react";

interface Reminder {
  _id: string;
  medicineName: string;
  dosage: string;
  times: string[];
  notes: string;
  isActive: boolean;
}

interface NotifToast {
  id: string;
  medicine: string;
  dosage: string;
  time: string;
  notes: string;
}

const TIME_OPTIONS = [
  "06:00","06:30","07:00","07:30","08:00","08:30","09:00","09:30",
  "10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30",
  "14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30",
  "18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30",
  "22:00","22:30","23:00","23:30",
];

function fmt12(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default function MedicineRemindersPage() {
  const router = useRouter();
  const [patientId, setPatientId] = useState("");
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [toasts, setToasts] = useState<NotifToast[]>([]);
  const firedRef = useRef<Set<string>>(new Set());

  // Form state
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [times, setTimes] = useState<string[]>(["08:00"]);
  const [notes, setNotes] = useState("");
  const [formErr, setFormErr] = useState("");

  // ─── Auth Check ───────────────────────────────────────────────────────────
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) { router.push("/login"); return; }
    const user = JSON.parse(userStr);
    const id = user.id || user.patientId;
    setPatientId(id);
  }, [router]);

  // ─── Fetch Reminders ──────────────────────────────────────────────────────
  const fetchReminders = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/reminders/${patientId}`);
      const data = await res.json();
      if (data.success) setReminders(data.data);
    } catch { /* offline */ }
    finally { setLoading(false); }
  }, [patientId]);

  useEffect(() => { fetchReminders(); }, [fetchReminders]);

  // ─── Browser Clock-based Alarm (checks every 30s) ─────────────────────────
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const hhmm = `${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}`;

      reminders.forEach((r) => {
        if (r.times.includes(hhmm)) {
          const key = `${r._id}-${hhmm}`;
          if (!firedRef.current.has(key)) {
            firedRef.current.add(key);
            // Browser Notification
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(`💊 Time to take ${r.medicineName}!`, {
                body: `${r.dosage}${r.notes ? " · " + r.notes : ""}`,
                icon: "/favicon.ico",
              });
            }
            // In-app toast
            const toast: NotifToast = { id: key, medicine: r.medicineName, dosage: r.dosage, time: hhmm, notes: r.notes };
            setToasts((prev) => [toast, ...prev]);
            // Auto-dismiss after 10s
            setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== key)), 10000);
          }
        }
      });
    };

    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, [reminders]);

  // ─── Request Notification Permission ─────────────────────────────────────
  const requestPermission = async () => {
    if ("Notification" in window) {
      const perm = await Notification.requestPermission();
      if (perm === "granted") alert("✅ Notifications enabled! You will receive alerts at the scheduled times.");
      else alert("❌ Notifications blocked. Please enable them in your browser settings.");
    }
  };

  // ─── Add Reminder ─────────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr("");
    if (!name.trim()) { setFormErr("Medicine name is required."); return; }
    if (!dosage.trim()) { setFormErr("Dosage is required."); return; }
    if (!times.length) { setFormErr("Add at least one time."); return; }

    setAdding(true);
    try {
      const res = await fetch("http://localhost:8000/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, medicineName: name.trim(), dosage: dosage.trim(), times, notes: notes.trim(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setShowForm(false);
      setName(""); setDosage(""); setTimes(["08:00"]); setNotes("");
      fetchReminders();
    } catch (err: any) { setFormErr(err.message); }
    finally { setAdding(false); }
  };

  // ─── Delete Reminder ─────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await fetch(`http://localhost:8000/api/reminders/${id}`, { method: "DELETE" });
      setReminders((prev) => prev.filter((r) => r._id !== id));
    } catch { /* ignore */ }
  };

  const addTime = () => setTimes((prev) => [...prev, "08:00"]);
  const removeTime = (i: number) => setTimes((prev) => prev.filter((_, idx) => idx !== i));
  const updateTime = (i: number, val: string) => setTimes((prev) => prev.map((t, idx) => idx === i ? val : t));

  const notifGranted = typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted";

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter',sans-serif" }}>

      {/* ── Alarm Toasts ── */}
      <div className="fixed top-5 right-5 z-[100] space-y-3 max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border-2 border-teal-400 rounded-2xl p-4 shadow-2xl shadow-teal-200/50 flex items-start gap-4"
            >
              <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center shrink-0">
                <Bell size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm">💊 Medicine Reminder!</p>
                <p className="font-semibold text-teal-600 text-sm mt-0.5">{t.medicine}</p>
                <p className="text-slate-500 text-xs mt-0.5">{t.dosage} · {fmt12(t.time)}</p>
                {t.notes && <p className="text-slate-400 text-xs mt-0.5 italic">{t.notes}</p>}
              </div>
              <button onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
                className="text-slate-400 hover:text-slate-600 transition-colors shrink-0">
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center gap-5 sticky top-0 z-40">
        <Link href="/patient/overview" className="flex items-center gap-2 text-slate-500 hover:text-teal-600 transition-colors font-semibold text-sm">
          <ArrowLeft size={18} /> Dashboard
        </Link>
        <div className="w-px h-5 bg-slate-200" />
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center">
            <Pill size={18} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800 leading-tight">Medicine Reminders</h1>
            <p className="text-xs text-slate-400 font-medium">Daily tablet alarm tracker</p>
          </div>
        </div>
        <div className="flex-1" />
        <button onClick={requestPermission}
          className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl border transition-all
            ${notifGranted ? "bg-teal-50 text-teal-600 border-teal-200" : "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100"}`}>
          {notifGranted ? <Bell size={15} /> : <BellOff size={15} />}
          {notifGranted ? "Notifications ON" : "Enable Notifications"}
        </button>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-sm hover:shadow-md transition-all">
          <Plus size={18} /> Add Reminder
        </button>
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-4xl mx-auto px-6 py-8">

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-5 mb-8">
          {[
            { label: "Total Reminders",  value: reminders.length,                         color: "teal" },
            { label: "Daily Doses",      value: reminders.reduce((a,r)=>a+r.times.length,0), color: "purple" },
            { label: "Active Today",     value: reminders.filter(r=>r.isActive).length,   color: "emerald" },
          ].map((s) => (
            <div key={s.label} className={`bg-white rounded-2xl p-5 border border-${s.color}-100 shadow-sm`}>
              <p className={`text-${s.color}-500 text-xs font-bold uppercase tracking-widest`}>{s.label}</p>
              <p className={`text-4xl font-black text-${s.color}-600 mt-1`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Reminder List */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reminders.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-slate-200">
            <Pill size={52} className="mx-auto text-slate-200 mb-5" />
            <p className="text-slate-500 font-bold text-lg mb-1">No reminders yet</p>
            <p className="text-slate-400 text-sm mb-6">Click "Add Reminder" to schedule your first medicine alarm.</p>
            <button onClick={() => setShowForm(true)}
              className="bg-teal-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-teal-600 transition-colors inline-flex items-center gap-2">
              <Plus size={18}/> Add Your First Reminder
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {reminders.map((r) => (
                <motion.div key={r._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-5 flex items-start gap-5"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-teal-200">
                    <Pill size={22} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-black text-slate-800 text-lg">{r.medicineName}</h3>
                      <span className="bg-purple-50 text-purple-600 text-xs font-bold px-2.5 py-1 rounded-full">{r.dosage}</span>
                    </div>
                    {r.notes && (
                      <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
                        <FileText size={13} /> {r.notes}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {r.times.map((t, i) => (
                        <span key={i} className="flex items-center gap-1.5 bg-teal-50 text-teal-700 text-xs font-bold px-3 py-1.5 rounded-full border border-teal-100">
                          <Clock size={12} /> {fmt12(t)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(r._id)}
                    className="w-9 h-9 bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 rounded-xl flex items-center justify-center shrink-0 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* ── Add Reminder Modal ── */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => setShowForm(false)}
                className="absolute top-5 right-5 bg-slate-100 hover:bg-slate-200 w-9 h-9 rounded-full flex items-center justify-center text-slate-500 transition-colors">
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-7">
                <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center">
                  <Pill size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">Add Medicine Reminder</h2>
                  <p className="text-slate-400 text-sm">Schedule a daily dose alert</p>
                </div>
              </div>

              <form onSubmit={handleAdd} className="space-y-5">
                {/* Medicine Name */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Medicine Name *</label>
                  <input
                    type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Paracetamol 500mg"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 transition-all"
                  />
                </div>

                {/* Dosage */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Dosage *</label>
                  <input
                    type="text" value={dosage} onChange={(e) => setDosage(e.target.value)}
                    placeholder="e.g. 1 tablet, 2 capsules"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 transition-all"
                  />
                </div>

                {/* Times */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-slate-700">Alarm Times *</label>
                    <button type="button" onClick={addTime}
                      className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1">
                      <Plus size={13} /> Add Time
                    </button>
                  </div>
                  <div className="space-y-2">
                    {times.map((t, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <select value={t} onChange={(e) => updateTime(i, e.target.value)}
                          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-semibold text-slate-700 transition-all">
                          {TIME_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{fmt12(opt)}</option>
                          ))}
                        </select>
                        {times.length > 1 && (
                          <button type="button" onClick={() => removeTime(i)}
                            className="w-9 h-9 bg-red-50 text-red-400 hover:bg-red-100 rounded-xl flex items-center justify-center transition-colors">
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Notes (optional)</label>
                  <input
                    type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Before food, After food, With water"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 transition-all"
                  />
                </div>

                {formErr && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-3 text-sm font-semibold">
                    <AlertCircle size={16} /> {formErr}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={adding}
                    className="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white font-bold shadow-lg shadow-teal-500/30 transition-all flex items-center justify-center gap-2">
                    {adding ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <><CheckCircle2 size={18} /> Save Reminder</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
