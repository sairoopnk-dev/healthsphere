"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity, Stethoscope, UserRound, CreditCard,
  FileText, Pill, Mail, LogOut, ArrowLeft, Calendar,
  CheckCircle2, AlertCircle, Clock, Building2, User,
  ChevronDown, Search, X,
} from "lucide-react";
import { getAvailableTimeSlots } from "@/utils/timeSlots";

const NAV_LINKS = [
  { label: "Profile",         href: "/patient/overview",        icon: UserRound },
  { label: "Appointments",    href: "/patient/appointments",    icon: Calendar },
  { label: "Medical Records", href: "/patient/medical-records", icon: FileText },
  { label: "Medications",     href: "/patient/medications",     icon: Pill },
  { label: "Messages",        href: "/patient/messages",        icon: Mail },
];


function formatDate(d: any) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return typeof d === "string" ? d : "";
  return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
}

// ── Combobox component ────────────────────────────────────────────────────────
interface ComboItem { label: string; sub?: string; value: string }

function Combobox({
  items, value, onChange, onSelect, placeholder, locked,
}: {
  items: ComboItem[];
  value: string;
  onChange: (v: string) => void;
  onSelect: (item: ComboItem) => void;
  placeholder?: string;
  locked?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    if (!value.trim()) return items;
    const q = value.toLowerCase();
    return items.filter(
      i => i.label.toLowerCase().includes(q) || (i.sub || "").toLowerCase().includes(q)
    );
  }, [items, value]);

  function highlight(text: string, query: string) {
    if (!query.trim()) return <span>{text}</span>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <span>{text}</span>;
    return (
      <span>
        {text.slice(0, idx)}
        <mark className="bg-teal-100 text-teal-800 rounded">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </span>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          readOnly={locked}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full px-4 py-3.5 pr-10 border rounded-2xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 text-sm font-medium text-slate-700 bg-slate-50 transition-all ${
            locked ? "cursor-default" : ""
          } ${open ? "border-teal-400" : "border-slate-200"}`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && !locked && (
            <button type="button" onClick={() => { onChange(""); onSelect({ label: "", value: "", sub: "" }); }}
              className="text-slate-300 hover:text-slate-500 transition-colors p-0.5">
              <X size={14}/>
            </button>
          )}
          <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}/>
        </div>
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
          {filtered.map(item => (
            <button
              key={item.value}
              type="button"
              onMouseDown={e => { e.preventDefault(); onSelect(item); onChange(item.label); setOpen(false); }}
              className="w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors border-b border-slate-50 last:border-0"
            >
              <p className="text-sm font-semibold text-slate-800">{highlight(item.label, value)}</p>
              {item.sub && <p className="text-xs text-slate-400 mt-0.5">{highlight(item.sub, value)}</p>}
            </button>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && value.trim() && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl px-4 py-3">
          <p className="text-sm text-slate-400 font-medium">No matches found</p>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
interface DoctorRecord {
  doctorId: string;
  name: string;
  specialization: string;
  hospital: string;
}

import { Suspense } from "react";

function BookAppointmentContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const prefillSymptoms   = searchParams.get("symptoms") || "";
  const prefillDoctorType = searchParams.get("doctorType") || "";
  const prefillSeverity   = Number(searchParams.get("severity") || "0") || null;

  const [patientId,   setPatientId]   = useState("");
  const [patientName, setPatientName] = useState("");

  // ── Doctor / hospital data from DB ──
  const [doctors,         setDoctors]         = useState<DoctorRecord[]>([]);
  const [selectedDoctor,  setSelectedDoctor]  = useState<DoctorRecord | null>(null);
  const [doctorQuery,     setDoctorQuery]     = useState("");
  const [hospitalQuery,   setHospitalQuery]   = useState("");
  const [loadingDoctors,  setLoadingDoctors]  = useState(true);

  // ── Form fields ──
  const [form, setForm] = useState({
    symptoms:   prefillSymptoms,
    doctorType: prefillDoctorType || "",
    date:       "",
    timeSlot:   "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState("");

  // ── Doctor availability (blocked slots) ──
  const [dateFullyBlocked,  setDateFullyBlocked]  = useState(false);
  const [doctorBlockedSlots, setDoctorBlockedSlots] = useState<string[]>([]);
  const [availLoading, setAvailLoading] = useState(false);

  // ── Load patient from localStorage ──
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (raw) {
      const user = JSON.parse(raw);
      setPatientId(user.id || user.patientId || "");
      setPatientName(user.name || "");
    }
  }, []);

  // ── Fetch all doctors from DB ──
  useEffect(() => {
    fetch("http://localhost:8000/api/doctor/all")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setDoctors(data);
      })
      .catch(console.error)
      .finally(() => setLoadingDoctors(false));
  }, []);

  // ── Fetch doctor availability when doctor + date are selected ──
  useEffect(() => {
    if (!selectedDoctor || !form.date) {
      setDateFullyBlocked(false);
      setDoctorBlockedSlots([]);
      return;
    }
    setAvailLoading(true);
    fetch(`http://localhost:8000/api/doctor/slots?doctorId=${selectedDoctor.doctorId}&date=${form.date}`)
      .then(r => r.json())
      .then(data => {
        setDateFullyBlocked(!!data.blocked);
        setDoctorBlockedSlots(Array.isArray(data.blockedSlots) ? data.blockedSlots : []);
        // If currently selected timeSlot got blocked, clear it
        setForm(prev => ({
          ...prev,
          timeSlot: data.blocked || (data.blockedSlots ?? []).includes(prev.timeSlot) ? "" : prev.timeSlot,
        }));
      })
      .catch(() => { setDateFullyBlocked(false); setDoctorBlockedSlots([]); })
      .finally(() => setAvailLoading(false));
  }, [selectedDoctor, form.date]);

  // ── Derived: unique hospitals ──
  const allHospitals = useMemo(() => {
    const set = new Set(doctors.map(d => d.hospital).filter(Boolean));
    return [...set].sort();
  }, [doctors]);

  // ── Filtered doctor list ──
  // Priority: specialization (from AI) → hospital (if selected) → query
  const filteredDoctors = useMemo<ComboItem[]>(() => {
    let list = doctors;

    // If AI-prefilled specialization, filter by it first (loose match)
    const spec = form.doctorType.trim().toLowerCase();
    if (spec) {
      const specFiltered = list.filter(d =>
        d.specialization?.toLowerCase().includes(spec) ||
        spec.includes(d.specialization?.toLowerCase() || "xxxnomatch")
      );
      if (specFiltered.length > 0) list = specFiltered;
    }

    // If hospital chosen, filter by hospital
    if (hospitalQuery && allHospitals.includes(hospitalQuery)) {
      list = list.filter(d => d.hospital === hospitalQuery);
    }

    return list.map(d => ({
      value: d.doctorId,
      label: d.name,
      sub:   `${d.specialization} · ${d.hospital}`,
    }));
  }, [doctors, form.doctorType, hospitalQuery, allHospitals]);

  // ── Hospital combobox items ──
  const hospitalItems = useMemo<ComboItem[]>(() => {
    // If a doctor is selected, lock to that doctor's hospital
    if (selectedDoctor) {
      return [{ value: selectedDoctor.hospital, label: selectedDoctor.hospital }];
    }
    return allHospitals.map(h => ({ value: h, label: h }));
  }, [allHospitals, selectedDoctor]);

  // ── When doctor selected → auto-fill hospital ──
  function onDoctorSelect(item: ComboItem) {
    const doc = doctors.find(d => d.doctorId === item.value) || null;
    setSelectedDoctor(doc);
    if (doc) {
      setHospitalQuery(doc.hospital);
      setForm(prev => ({ ...prev, doctorType: prev.doctorType || doc.specialization }));
    }
    if (!item.value) {
      setSelectedDoctor(null);
    }
  }

  // ── When hospital selected → clear doctor if mismatch ──
  function onHospitalSelect(item: ComboItem) {
    setHospitalQuery(item.label);
    if (selectedDoctor && selectedDoctor.hospital !== item.label) {
      setSelectedDoctor(null);
      setDoctorQuery("");
    }
  }

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const today = new Date().toISOString().split("T")[0];

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate doctor from DB
    if (!selectedDoctor) {
      setError("Please select a valid doctor from the dropdown list.");
      return;
    }
    if (!hospitalQuery || !allHospitals.includes(hospitalQuery)) {
      setError("Please select a valid hospital from the dropdown list.");
      return;
    }
    if (selectedDoctor.hospital !== hospitalQuery) {
      setError("The selected doctor does not belong to the selected hospital.");
      return;
    }
    if (!form.date)     { setError("Please select an appointment date."); return; }
    if (!form.timeSlot) { setError("Please select a time slot."); return; }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId:     patientId   || "guest",
          patientName:   patientName || "Guest Patient",
          doctorId:      selectedDoctor.doctorId,
          doctorName:    selectedDoctor.name,
          hospital:      selectedDoctor.hospital,
          date:          form.date,
          timeSlot:      form.timeSlot,
          severityScore: prefillSeverity,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Booking failed");
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to book appointment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("isLoggedIn");
    router.push("/login");
  };

  function resetForm() {
    setSuccess(false);
    setForm({ symptoms: "", doctorType: "", date: "", timeSlot: "" });
    setSelectedDoctor(null);
    setDoctorQuery("");
    setHospitalQuery("");
    setError("");
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-2 border-b border-slate-100">
          <Activity className="text-teal-500" size={22} />
          <span className="text-xl font-black text-teal-500 tracking-tight">HealthSphere</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <Link href="/patient/overview"
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all font-semibold text-left mb-1">
            <ArrowLeft size={20} className="text-slate-400" />
            <span className="flex-1">Back to Dashboard</span>
          </Link>

          {NAV_LINKS.map((item) => (
            <Link key={item.label} href={item.href}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all font-semibold text-left">
              <item.icon size={20} className="text-slate-400" />
              <span className="flex-1">{item.label}</span>
            </Link>
          ))}

          <div className="pt-3 mt-3 border-t border-slate-100">
            <div className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-teal-50 text-teal-600 font-semibold shadow-sm">
              <Calendar size={20} className="text-teal-500" />
              <span className="flex-1">Book Appointment</span>
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-3xl p-3 border border-slate-100 flex flex-col gap-3">
            <div className="flex items-center gap-3 px-1">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-sm font-black">
                {patientName?.[0]?.toUpperCase() || "P"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-800 truncate leading-tight">{patientName || "Patient"}</p>
                <p className="text-[10px] font-bold text-teal-600 uppercase tracking-tighter mt-0.5">Patient Account</p>
              </div>
            </div>
            <button onClick={handleLogout}
              className="flex items-center justify-center gap-2 py-2 bg-white rounded-xl border border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-600 transition-all text-sm font-semibold">
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Topbar */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Book Appointment</h1>
            <p className="text-sm text-slate-500 mt-0.5">Schedule a visit with a specialist</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-full px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hidden md:block">
            {new Date().toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, month: "2-digit", day: "2-digit", year: "numeric" })}
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-8 py-8">
          <div className="max-w-2xl mx-auto space-y-6">

            {/* ── Success State ── */}
            {success ? (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-8 py-10 flex flex-col items-center text-center gap-5">
                  <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={44} className="text-teal-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800">Appointment Booked!</h2>
                    <p className="text-slate-500 mt-2 font-medium">
                      Your appointment with <span className="text-teal-600 font-bold">{selectedDoctor?.name}</span> at{" "}
                      <span className="text-teal-600 font-bold">{selectedDoctor?.hospital}</span> has been confirmed.
                    </p>
                  </div>

                  <div className="w-full bg-slate-50 rounded-2xl p-6 border border-slate-100 text-left space-y-3 mt-2">
                    <div className="flex items-center gap-3 text-sm">
                      <User size={16} className="text-teal-500 shrink-0" />
                      <span className="text-slate-500 font-semibold w-28">Specialist</span>
                      <span className="text-slate-800 font-bold">{selectedDoctor?.specialization}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Stethoscope size={16} className="text-teal-500 shrink-0" />
                      <span className="text-slate-500 font-semibold w-28">Doctor</span>
                      <span className="text-slate-800 font-bold">{selectedDoctor?.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Building2 size={16} className="text-teal-500 shrink-0" />
                      <span className="text-slate-500 font-semibold w-28">Hospital</span>
                      <span className="text-slate-800 font-bold">{selectedDoctor?.hospital}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar size={16} className="text-teal-500 shrink-0" />
                      <span className="text-slate-500 font-semibold w-28">Date</span>
                      <span className="text-slate-800 font-bold">{formatDate(form.date)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Clock size={16} className="text-teal-500 shrink-0" />
                      <span className="text-slate-500 font-semibold w-28">Time</span>
                      <span className="text-slate-800 font-bold">{form.timeSlot}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 w-full mt-2">
                    <button onClick={resetForm}
                      className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all text-sm">
                      Book Another
                    </button>
                    <Link href="/patient/overview"
                      className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold hover:from-teal-600 hover:to-emerald-600 transition-all shadow-sm text-sm flex items-center justify-center">
                      Go to Dashboard
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* ── Form Card ── */}
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center">
                      <Calendar size={22} className="text-teal-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Appointment Details</h2>
                      <p className="text-slate-500 text-sm">Fill in the details to schedule your visit</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Patient Name */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">
                        Patient Name <span className="text-red-400">*</span>
                      </label>
                      <input type="text" value={patientName} onChange={e => setPatientName(e.target.value)}
                        placeholder="Your full name" required
                        className="w-full px-4 py-3.5 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 text-sm font-medium text-slate-700 bg-slate-50 transition-all" />
                    </div>

                    {/* Symptoms */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Symptoms</label>
                      <textarea value={form.symptoms} onChange={e => set("symptoms", e.target.value)}
                        placeholder="Briefly describe your symptoms (optional)" rows={3}
                        className="w-full px-4 py-3.5 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 text-sm font-medium text-slate-700 bg-slate-50 transition-all resize-none" />
                    </div>

                    {/* Doctor Combobox */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">
                        Doctor <span className="text-red-400">*</span>
                      </label>

                      {loadingDoctors ? (
                        <div className="w-full px-4 py-3.5 border border-slate-200 rounded-2xl bg-slate-50 text-sm text-slate-400 font-medium flex items-center gap-2">
                          <div className="w-3.5 h-3.5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"/>
                          Loading doctors…
                        </div>
                      ) : (
                        <Combobox
                          items={filteredDoctors}
                          value={doctorQuery}
                          onChange={v => { setDoctorQuery(v); if (!v) { setSelectedDoctor(null); setHospitalQuery(""); } }}
                          onSelect={onDoctorSelect}
                          placeholder="Search by name or specialization…"
                        />
                      )}

                      {prefillDoctorType && (
                        <p className="text-xs text-teal-600 font-semibold mt-1.5 flex items-center gap-1">
                          ✨ Filtered by AI recommendation: <span className="font-black">{prefillDoctorType}</span>
                        </p>
                      )}
                      {selectedDoctor && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-teal-700 font-semibold bg-teal-50 border border-teal-100 rounded-xl px-3 py-2">
                          <CheckCircle2 size={13} className="text-teal-500 shrink-0"/>
                          {selectedDoctor.name} — {selectedDoctor.specialization}
                        </div>
                      )}
                    </div>

                    {/* Hospital Combobox */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">
                        Hospital / Clinic <span className="text-red-400">*</span>
                      </label>
                      <Combobox
                        items={hospitalItems}
                        value={hospitalQuery}
                        onChange={v => { setHospitalQuery(v); if (!v && selectedDoctor) { setSelectedDoctor(null); setDoctorQuery(""); } }}
                        onSelect={onHospitalSelect}
                        placeholder="Search hospital…"
                        locked={!!selectedDoctor}
                      />
                      {selectedDoctor && (
                        <p className="text-xs text-slate-400 font-medium mt-1.5">Auto-filled from selected doctor</p>
                      )}
                    </div>

                    {/* Date + Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Date <span className="text-red-400">*</span></label>
                        <input type="date" min={today} value={form.date}
                          onChange={e => { set("date", e.target.value); set("timeSlot", ""); }} required
                          className="w-full px-4 py-3.5 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 text-sm font-semibold text-slate-700 bg-slate-50 transition-all cursor-pointer" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Time Slot <span className="text-red-400">*</span></label>
                        {availLoading ? (
                          <div className="w-full px-4 py-3.5 border border-slate-200 rounded-2xl bg-slate-50 text-sm text-slate-400 font-medium flex items-center gap-2">
                            <div className="w-3.5 h-3.5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"/>
                            Checking availability…
                          </div>
                        ) : dateFullyBlocked ? (
                          <div className="w-full px-4 py-3.5 border border-red-200 rounded-2xl bg-red-50 text-sm text-red-600 font-semibold">
                            🚫 Doctor is on leave this day
                          </div>
                        ) : (() => {
                          const slots = getAvailableTimeSlots(form.date, doctorBlockedSlots);
                          return (
                            <>
                              <select value={form.timeSlot} onChange={e => set("timeSlot", e.target.value)} required
                                className="w-full px-4 py-3.5 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 text-sm font-semibold text-slate-700 bg-slate-50 transition-all appearance-none cursor-pointer">
                                <option value="">{form.date ? (slots.length ? "Select a slot" : "No slots available") : "Pick a date first"}</option>
                                {slots.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                              {doctorBlockedSlots.length > 0 && (
                                <p className="text-[11px] text-orange-600 font-semibold mt-1.5">
                                  ⚡ {doctorBlockedSlots.length} slot{doctorBlockedSlots.length !== 1 ? "s" : ""} unavailable on this date
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Error */}
                    {error && (
                      <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-5 py-4 text-red-600 text-sm font-semibold">
                        <AlertCircle size={18} className="shrink-0" />
                        {error}
                      </div>
                    )}

                    {/* Submit */}
                    <button type="submit" disabled={loading || !selectedDoctor}
                      className={`w-full py-4 rounded-2xl text-base font-bold transition-all flex items-center justify-center gap-2 ${
                        loading || !selectedDoctor
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:from-teal-600 hover:to-emerald-600 shadow-sm hover:shadow-md"
                      }`}>
                      <Calendar size={18} />
                      {loading ? "Booking..." : "Confirm Appointment"}
                    </button>
                  </form>
                </div>

                {/* Info card */}
                <div className="bg-teal-50 border border-teal-100 rounded-2xl px-6 py-5 flex items-start gap-4">
                  <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <Clock size={18} className="text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-teal-800">Appointment Confirmation</p>
                    <p className="text-xs text-teal-600 font-medium mt-0.5 leading-relaxed">
                      Only doctors registered in our system are available for selection. Please arrive 15 minutes before your scheduled time.
                    </p>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}

export default function BookAppointmentPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <BookAppointmentContent />
    </Suspense>
  );
}
