"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Stethoscope, Building2, Award, Briefcase, Clock,
  CheckCircle2, ArrowRight, AlertTriangle, Activity, ChevronRight, User2,
} from "lucide-react";

const SPECIALIZATIONS = [
  "Cardiology", "Dermatology", "Endocrinology", "ENT", "Gastroenterology",
  "General Medicine", "General Surgery", "Gynecology", "Nephrology", "Neurology",
  "Neurosurgery", "Oncology", "Ophthalmology", "Orthopedics", "Pediatrics",
  "Psychiatry", "Pulmonology", "Radiology", "Rheumatology", "Urology",
];

const STEPS = ["Specialization", "Work Details", "Personal Info"];

export default function DoctorSetupProfile() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [doctorId, setDoctorId] = useState("");

  // form fields
  const [specialization, setSpecialization] = useState("");
  const [customSpec, setCustomSpec]         = useState("");
  const [hospital, setHospital]             = useState("");
  const [qualification, setQualification]   = useState("");
  const [designation, setDesignation]       = useState("");
  const [experience, setExperience]         = useState("");
  const [gender, setGender]                 = useState("");

  const finalSpec = specialization === "__custom__" ? customSpec : specialization;

  // Auth guard
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) { router.push("/login"); return; }
    const user = JSON.parse(userStr);
    if (user.role !== "doctor") { router.push("/login"); return; }
    if (user.isProfileCompleted) { router.push("/doctor/overview"); return; }
    setDoctorId(user.id || user.doctorId);
  }, [router]);

  // ── Validation per step ──────────────────────────────────────────────────────
  const canProceedStep0 = finalSpec.trim() !== "";
  const canProceedStep1 = hospital.trim() && qualification.trim() && designation.trim() && experience;

  const nextStep = () => {
    setError("");
    if (step === 0 && !canProceedStep0) { setError("Please select or enter your specialization."); return; }
    if (step === 1 && !canProceedStep1) { setError("Hospital, qualification, designation and experience are required."); return; }
    setStep(s => s + 1);
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gender) { setError("Please select your gender."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`http://localhost:8000/api/doctor/setup/${doctorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specialization: finalSpec,
          hospital:       hospital.trim(),
          qualification:  qualification.trim(),
          designation:    designation.trim(),
          experience:     Number(experience),
          gender,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Setup failed");

      // Mark completed in localStorage
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        localStorage.setItem("user", JSON.stringify({ ...user, isProfileCompleted: true }));
      }
      router.push("/doctor/overview");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-4 py-3 bg-white/10 border border-white/15 rounded-xl outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 text-white placeholder-slate-500 font-medium transition-all";
  const labelCls = "block text-sm font-semibold text-slate-300 mb-1.5";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/8 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="bg-blue-500 p-2 rounded-xl shadow-lg shadow-blue-500/30">
              <Activity size={20} className="text-white" />
            </div>
            <span className="text-xl font-black text-white tracking-tight">HealthSphere</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Doctor Profile Setup</h1>
          <p className="text-slate-400 text-sm">One-time setup — this information will appear on your provider profile.</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-black transition-all ${
                i < step ? "bg-blue-500 text-white" :
                i === step ? "bg-blue-500/20 border-2 border-blue-400 text-blue-300" :
                "bg-white/10 border-2 border-white/10 text-slate-500"
              }`}>
                {i < step ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span className={`text-xs font-semibold hidden sm:block transition-colors ${
                i === step ? "text-blue-300" : i < step ? "text-blue-400" : "text-slate-600"
              }`}>{label}</span>
              {i < STEPS.length - 1 && <ChevronRight size={14} className="text-slate-600" />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">

              {/* ── STEP 0: Specialization ────────────────────────────────── */}
              {step === 0 && (
                <motion.div key="step0" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="p-8 space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <Stethoscope size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-white">Medical Specialization</h2>
                      <p className="text-slate-400 text-xs">Select your primary area of practice.</p>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Specialization <span className="text-red-400">*</span></label>
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                      {SPECIALIZATIONS.map(s => (
                        <button key={s} type="button" onClick={() => setSpecialization(s)}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold text-left transition-all border ${
                            specialization === s
                              ? "bg-blue-500 border-blue-400 text-white shadow-md shadow-blue-500/30"
                              : "bg-white/5 border-white/10 text-slate-300 hover:border-blue-500/40 hover:text-blue-300"
                          }`}
                        >{s}</button>
                      ))}
                      <button type="button" onClick={() => setSpecialization("__custom__")}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold text-left transition-all border ${
                          specialization === "__custom__"
                            ? "bg-blue-500 border-blue-400 text-white"
                            : "bg-white/5 border-white/10 text-slate-300 hover:border-blue-500/40"
                        }`}
                      >+ Other / Custom</button>
                    </div>
                    {specialization === "__custom__" && (
                      <input
                        type="text" value={customSpec} onChange={e => setCustomSpec(e.target.value)}
                        placeholder="Enter your specialization"
                        className={`${inputCls} mt-3`}
                      />
                    )}
                  </div>

                  {error && <p className="text-red-400 text-sm font-medium bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 flex items-center gap-2"><AlertTriangle size={14} /> {error}</p>}

                  <button type="button" onClick={nextStep}
                    className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 mt-2"
                  >
                    Continue <ArrowRight size={18} />
                  </button>
                </motion.div>
              )}

              {/* ── STEP 1: Work Details ──────────────────────────────────── */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="p-8 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                      <Building2 size={20} className="text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-white">Work Details</h2>
                      <p className="text-slate-400 text-xs">Your hospital and credentials.</p>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Hospital / Clinic <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={hospital} onChange={e => setHospital(e.target.value)} required
                        placeholder="e.g. Apollo Hospital, Chennai"
                        className={`${inputCls} pl-9`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Qualification <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <Award size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={qualification} onChange={e => setQualification(e.target.value)} required
                        placeholder="e.g. MBBS, MD, DM"
                        className={`${inputCls} pl-9`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Designation <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <Briefcase size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={designation} onChange={e => setDesignation(e.target.value)} required
                        placeholder="e.g. Senior Consultant, HOD"
                        className={`${inputCls} pl-9`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Years of Experience <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <Clock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="number" value={experience} onChange={e => setExperience(e.target.value)} required
                        min="0" max="60" placeholder="e.g. 8"
                        className={`${inputCls} pl-9`}
                      />
                    </div>
                  </div>

                  {error && <p className="text-red-400 text-sm font-medium bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 flex items-center gap-2"><AlertTriangle size={14} /> {error}</p>}

                  <div className="flex gap-3 mt-2">
                    <button type="button" onClick={() => setStep(0)}
                      className="flex-1 py-3.5 rounded-xl border border-white/10 text-slate-300 font-bold hover:bg-white/5 transition-all"
                    >← Back</button>
                    <button type="button" onClick={nextStep}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/30"
                    >Continue <ArrowRight size={18} /></button>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 2: Personal Info ─────────────────────────────────── */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="p-8 space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                      <User2 size={20} className="text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-white">Personal Info</h2>
                      <p className="text-slate-400 text-xs">Last step! Almost done.</p>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Gender <span className="text-red-400">*</span></label>
                    <div className="grid grid-cols-3 gap-3">
                      {["Male", "Female", "Other"].map(g => (
                        <button key={g} type="button" onClick={() => setGender(g)}
                          className={`py-3 rounded-xl text-sm font-bold transition-all border ${
                            gender === g
                              ? "bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/30"
                              : "bg-white/5 border-white/10 text-slate-300 hover:border-blue-500/50 hover:text-white"
                          }`}
                        >
                          {g === "Male" ? "♂ Male" : g === "Female" ? "♀ Female" : "⚧ Other"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-sm space-y-2">
                    <p className="text-slate-400 font-semibold text-xs uppercase tracking-widest mb-3">Profile Summary</p>
                    <div className="grid grid-cols-2 gap-y-2">
                      <span className="text-slate-400">Specialization</span><span className="text-white font-semibold truncate">{finalSpec || "—"}</span>
                      <span className="text-slate-400">Hospital</span><span className="text-white font-semibold truncate">{hospital || "—"}</span>
                      <span className="text-slate-400">Qualification</span><span className="text-white font-semibold">{qualification || "—"}</span>
                      <span className="text-slate-400">Designation</span><span className="text-white font-semibold">{designation || "—"}</span>
                      <span className="text-slate-400">Experience</span><span className="text-blue-400 font-bold">{experience ? `${experience} yrs` : "—"}</span>
                    </div>
                  </div>

                  {error && <p className="text-red-400 text-sm font-medium bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 flex items-center gap-2"><AlertTriangle size={14} /> {error}</p>}

                  <div className="flex gap-3 mt-2">
                    <button type="button" onClick={() => setStep(1)}
                      className="flex-1 py-3.5 rounded-xl border border-white/10 text-slate-300 font-bold hover:bg-white/5 transition-all"
                    >← Back</button>
                    <button type="submit" disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/30"
                    >
                      {saving ? (
                        <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                      ) : (
                        <><CheckCircle2 size={18} /> Complete Setup</>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
