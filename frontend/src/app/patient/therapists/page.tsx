"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity, Stethoscope, UserRound, CreditCard,
  FileText, Pill, Mail, LogOut, ArrowLeft, Calendar,
  CheckCircle2, AlertCircle, Clock, Building2, User, MapPin, Brain
} from "lucide-react";
import { getAvailableTimeSlots } from "@/utils/timeSlots";

const NAV_LINKS = [
  { label: "Profile",         href: "/patient/overview",        icon: UserRound },
  { label: "Appointments",    href: "/patient/appointments",    icon: Calendar },
  { label: "Medical Records", href: "/patient/medical-records", icon: FileText },
  { label: "Medications",     href: "/patient/medications",     icon: Pill },
  { label: "Messages",        href: "/patient/messages",        icon: Mail },
];

interface DoctorRecord {
  doctorId: string;
  name: string;
  specialization: string;
  hospital: string;
}

export default function TherapistsPage() {
  const router = useRouter();

  const [patientId,   setPatientId]   = useState("");
  const [patientName, setPatientName] = useState("");

  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  // Booking state
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorRecord | null>(null);
  const [form, setForm] = useState({ date: "", timeSlot: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (raw) {
      const user = JSON.parse(raw);
      setPatientId(user.id || user.patientId || "");
      setPatientName(user.name || "");
    }
  }, []);

  useEffect(() => {
    fetch("http://localhost:8000/api/doctor/all")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setDoctors(data);
      })
      .catch(console.error)
      .finally(() => setLoadingDoctors(false));
  }, []);

  // Filter for mental health specialists
  const therapists = useMemo(() => {
    const validSpecs = ["Psychiatrist", "Therapist", "Psychologist", "Counselor"];
    const filtered = doctors.filter(d => 
      validSpecs.some(spec => d.specialization?.toLowerCase().includes(spec.toLowerCase()))
    );
    // Mock distance for display purposes based on string hash
    return filtered.map(d => {
      let hash = 0;
      for (let i = 0; i < d.doctorId.length; i++) hash += d.doctorId.charCodeAt(i);
      const distance = ((hash % 15) + 1.2).toFixed(1);
      return { ...d, distance };
    }).sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
  }, [doctors]);

  const today = new Date().toISOString().split("T")[0];

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) return;
    if (!form.date) { setError("Please select an appointment date."); return; }
    if (!form.timeSlot) { setError("Please select a time slot."); return; }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:8000/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId:     patientId || "guest",
          patientName:   patientName || "Guest Patient",
          doctorId:      selectedDoctor.doctorId,
          doctorName:    selectedDoctor.name,
          hospital:      selectedDoctor.hospital,
          date:          form.date,
          timeSlot:      form.timeSlot,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Booking failed");
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err.message || "Failed to book appointment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("isLoggedIn");
    router.push("/login");
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-2 border-b border-slate-100">
          <Activity className="text-violet-500" size={22} />
          <span className="text-xl font-black text-violet-500 tracking-tight">HealthSphere</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <Link href="/patient/delulu"
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all font-semibold text-left mb-1">
            <ArrowLeft size={20} className="text-slate-400" />
            <span className="flex-1">Back to Delulu</span>
          </Link>

          {NAV_LINKS.map((item) => (
            <Link key={item.label} href={item.href}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all font-semibold text-left">
              <item.icon size={20} className="text-slate-400" />
              <span className="flex-1">{item.label}</span>
            </Link>
          ))}

          <div className="pt-3 mt-3 border-t border-slate-100">
            <div className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-violet-50 text-violet-600 font-semibold shadow-sm">
              <Brain size={20} className="text-violet-500" />
              <span className="flex-1">Find a Therapist</span>
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-3xl p-3 border border-slate-100 flex flex-col gap-3">
            <div className="flex items-center gap-3 px-1">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-black">
                {patientName?.[0]?.toUpperCase() || "P"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-800 truncate leading-tight">{patientName || "Patient"}</p>
                <p className="text-[10px] font-bold text-violet-600 uppercase tracking-tighter mt-0.5">Patient Account</p>
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
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Available Therapists Near You</h1>
            <p className="text-sm text-slate-500 mt-0.5">Connect with a Mental Health Specialist</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-full px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hidden md:block">
            {new Date().toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, month: "2-digit", day: "2-digit", year: "numeric" })}
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-8 py-8">
          <div className="max-w-4xl mx-auto space-y-6">

            {success ? (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-8 py-10 flex flex-col items-center text-center gap-5">
                  <div className="w-20 h-20 bg-violet-50 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={44} className="text-violet-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800">Therapy Session Booked!</h2>
                    <p className="text-slate-500 mt-2 font-medium">
                      Your session with <span className="text-violet-600 font-bold">{selectedDoctor?.name}</span> at{" "}
                      <span className="text-violet-600 font-bold">{selectedDoctor?.hospital}</span> has been confirmed.
                    </p>
                  </div>

                  <div className="w-full max-w-lg bg-slate-50 rounded-2xl p-6 border border-slate-100 text-left space-y-3 mt-2">
                    <div className="flex items-center gap-3 text-sm">
                      <User size={16} className="text-violet-500 shrink-0" />
                      <span className="text-slate-500 font-semibold w-28">Specialist</span>
                      <span className="text-slate-800 font-bold">{selectedDoctor?.specialization}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Stethoscope size={16} className="text-violet-500 shrink-0" />
                      <span className="text-slate-500 font-semibold w-28">Doctor</span>
                      <span className="text-slate-800 font-bold">{selectedDoctor?.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Building2 size={16} className="text-violet-500 shrink-0" />
                      <span className="text-slate-500 font-semibold w-28">Hospital</span>
                      <span className="text-slate-800 font-bold">{selectedDoctor?.hospital}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar size={16} className="text-violet-500 shrink-0" />
                      <span className="text-slate-500 font-semibold w-28">Date</span>
                      <span className="text-slate-800 font-bold">{form.date}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Clock size={16} className="text-violet-500 shrink-0" />
                      <span className="text-slate-500 font-semibold w-28">Time</span>
                      <span className="text-slate-800 font-bold">{form.timeSlot}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-2">
                    <Link href="/patient/overview"
                      className="px-8 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold hover:from-violet-600 hover:to-purple-600 transition-all shadow-sm text-sm flex items-center justify-center">
                      Go to Dashboard
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {loadingDoctors ? (
                  <div className="flex justify-center p-12">
                    <div className="w-10 h-10 border-4 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : therapists.length === 0 ? (
                  <div className="text-center p-12 bg-white rounded-3xl border border-slate-100 shadow-sm text-slate-500">
                    <Brain size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="font-semibold text-lg">No specialists found in your area.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {therapists.map((doc) => (
                      <div key={doc.doctorId} className="bg-white border border-slate-200 rounded-3xl overflow-hidden hover:shadow-lg hover:border-violet-200 transition-all p-5 flex flex-col group">
                        
                        <div className="flex gap-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center shrink-0 border border-violet-200">
                            <Brain size={28} className="text-violet-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-slate-800 truncate">{doc.name}</h3>
                            <p className="text-sm font-semibold text-violet-600 mt-0.5">{doc.specialization}</p>
                            <div className="flex flex-col gap-1.5 mt-2">
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate">
                                <Building2 size={14} className="shrink-0" />
                                <span className="truncate">{doc.hospital}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                <MapPin size={14} className="text-emerald-500 shrink-0" />
                                <span>{doc.distance} km away</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-3 flex-1 justify-end">
                          {selectedDoctor?.doctorId === doc.doctorId ? (
                            <form onSubmit={handleBook} className="bg-slate-50 rounded-2xl p-4 border border-violet-100 animate-fade-in-up">
                              <div className="space-y-3">
                                <div>
                                  <label className="text-xs font-bold text-slate-600 mb-1 block">Date</label>
                                  <input type="date" min={today} value={form.date} required
                                    onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value, timeSlot: "" }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-violet-400 bg-white" />
                                </div>
                                <div>
                                  <label className="text-xs font-bold text-slate-600 mb-1 block">Time Slot</label>
                                  <select value={form.timeSlot} required
                                    onChange={(e) => setForm(prev => ({ ...prev, timeSlot: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-violet-400 bg-white">
                                    <option value="">{form.date ? "Select a slot" : "Pick a date first"}</option>
                                    {getAvailableTimeSlots(form.date).map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                </div>
                                
                                {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
                                
                                <div className="flex gap-2 pt-2">
                                  <button type="button" onClick={() => setSelectedDoctor(null)}
                                    className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors">
                                    Cancel
                                  </button>
                                  <button type="submit" disabled={loading}
                                    className="flex-1 py-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50">
                                    {loading ? "Booking..." : "Confirm Booking"}
                                  </button>
                                </div>
                              </div>
                            </form>
                          ) : (
                            <button
                              onClick={() => { setSelectedDoctor(doc); setForm({ date: "", timeSlot: "" }); setError(""); }}
                              className="w-full py-2.5 rounded-xl border border-violet-200 text-violet-600 font-bold hover:bg-violet-50 hover:border-violet-300 transition-all text-sm group-hover:bg-violet-50"
                            >
                              Book Appointment
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
