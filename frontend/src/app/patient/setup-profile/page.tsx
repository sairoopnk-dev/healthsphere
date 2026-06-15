"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, User, Ruler, Weight, Droplets, Phone,
  AlertTriangle, CheckCircle2, ArrowRight, Activity, ChevronRight,
} from "lucide-react";

// ── Helper: calculate age from ISO date string ───────────────────────────────
function calcAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

// ── Step indicator ────────────────────────────────────────────────────────────
const STEPS = ["Personal Info", "Health Metrics", "Emergency Contact"];

export default function PatientSetupProfile() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [patientId, setPatientId] = useState("");
  const [isGoogleOnly, setIsGoogleOnly] = useState(false);

  // form fields
  const [name, setName]     = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob]       = useState("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [ecName, setEcName] = useState("");
  const [ecPhone, setEcPhone] = useState("");

  const age = calcAge(dob);

  // Auth guard
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) { router.push("/login"); return; }
    const user = JSON.parse(userStr);
    if (user.role !== "patient") { router.push("/login"); return; }
    // If already completed, skip to dashboard
    if (user.isProfileCompleted) { router.push("/patient/overview"); return; }
    setPatientId(user.id || user.patientId);
    
    if (user.providers?.includes("google") && !user.providers?.includes("email")) {
      setIsGoogleOnly(true);
      if (user.name && user.name !== "Google User") {
        setName(user.name);
      }
    }
  }, [router]);

  // ── Step validation ──────────────────────────────────────────────────────────
  const canProceedStep0 = dob && gender && (!isGoogleOnly || (name.trim() && password.trim().length >= 6));
  const canProceedStep1 = true; // All optional in step 1
  const canSubmit = ecName.trim() && ecPhone.trim();

  const nextStep = () => {
    setError("");
    if (step === 0 && !canProceedStep0) {
      setError("Please fill all required fields correctly (Password must be 6+ chars).");
      return;
    }
    setStep(s => s + 1);
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ecName.trim() || !ecPhone.trim()) {
      setError("Emergency contact name and phone are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/patients/${patientId}/setup`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dob,
          gender,
          height:   height ? Number(height) : undefined,
          weight:   weight ? Number(weight) : undefined,
          bloodGroup,
          emergencyContact: { name: ecName.trim(), phone: ecPhone.trim() },
          ...(isGoogleOnly ? { name: name.trim(), password } : {})
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Setup failed");

      // Update localStorage with completed flag
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        localStorage.setItem("user", JSON.stringify({ ...user, isProfileCompleted: true }));
      }
      router.push("/patient/overview");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Input style helper ───────────────────────────────────────────────────────
  const inputCls = "w-full px-4 py-3 bg-white/10 border border-white/15 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400/50 text-white placeholder-slate-500 font-medium transition-all";
  const labelCls = "block text-sm font-semibold text-slate-300 mb-1.5";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-teal-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="bg-teal-500 p-2 rounded-xl shadow-lg shadow-teal-500/30">
              <Activity size={20} className="text-white" />
            </div>
            <span className="text-xl font-black text-white tracking-tight">HealthSphere</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Setup Your Profile</h1>
          <p className="text-slate-400 text-sm">This is a one-time setup — takes less than a minute.</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-black transition-all ${
                i < step ? "bg-teal-500 text-white" :
                i === step ? "bg-teal-500/20 border-2 border-teal-400 text-teal-300" :
                "bg-white/10 border-2 border-white/10 text-slate-500"
              }`}>
                {i < step ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span className={`text-xs font-semibold hidden sm:block transition-colors ${
                i === step ? "text-teal-300" : i < step ? "text-teal-500" : "text-slate-600"
              }`}>{label}</span>
              {i < STEPS.length - 1 && <ChevronRight size={14} className="text-slate-600" />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">

              {/* ── STEP 0: Personal Info ────────────────────────────────── */}
              {step === 0 && (
                <motion.div key="step0" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="p-8 space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-teal-500/20 rounded-xl flex items-center justify-center">
                      <User size={20} className="text-teal-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-white">Personal Information</h2>
                      <p className="text-slate-400 text-xs">Your DOB will be used to calculate your age automatically.</p>
                    </div>
                  </div>

                  {isGoogleOnly && (
                    <>
                      <div>
                        <label className={labelCls}>Full Name <span className="text-red-400">*</span></label>
                        <input
                          type="text" value={name} onChange={e => setName(e.target.value)} required
                          placeholder="Your Custom Name"
                          className={`${inputCls} px-4`}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Set Password <span className="text-red-400">*</span></label>
                        <input
                          type="password" value={password} onChange={e => setPassword(e.target.value)} required
                          placeholder="••••••••"
                          className={`${inputCls} px-4`}
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className={labelCls}>
                      Date of Birth <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="date" value={dob} onChange={e => setDob(e.target.value)} required
                        max={new Date().toISOString().split("T")[0]}
                        className={`${inputCls} pl-10`}
                      />
                    </div>
                    {age !== null && (
                      <p className="mt-1.5 text-teal-400 text-sm font-semibold">
                        ✅ You are <span className="font-black text-teal-300">{age} years old</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>
                      Gender <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {["Male", "Female", "Other"].map(g => (
                        <button
                          key={g} type="button"
                          onClick={() => setGender(g)}
                          className={`py-3 rounded-xl text-sm font-bold transition-all border ${
                            gender === g
                              ? "bg-teal-500 border-teal-400 text-white shadow-lg shadow-teal-500/30"
                              : "bg-white/5 border-white/10 text-slate-300 hover:border-teal-500/50 hover:text-white"
                          }`}
                        >
                          {g === "Male" ? "♂ Male" : g === "Female" ? "♀ Female" : "⚧ Other"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && <p className="text-red-400 text-sm font-medium bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 flex items-center gap-2"><AlertTriangle size={14} /> {error}</p>}

                  <button
                    type="button" onClick={nextStep}
                    className="w-full flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-teal-500/30 mt-2"
                  >
                    Continue <ArrowRight size={18} />
                  </button>
                </motion.div>
              )}

              {/* ── STEP 1: Health Metrics ───────────────────────────────── */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="p-8 space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                      <Activity size={20} className="text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-white">Health Metrics</h2>
                      <p className="text-slate-400 text-xs">All optional — you can update these anytime.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Height (cm)</label>
                      <div className="relative">
                        <Ruler size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="number" value={height} onChange={e => setHeight(e.target.value)}
                          placeholder="e.g. 170" min="50" max="250"
                          className={`${inputCls} pl-8 text-sm`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Weight (kg)</label>
                      <div className="relative">
                        <Weight size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="number" value={weight} onChange={e => setWeight(e.target.value)}
                          placeholder="e.g. 65" min="10" max="300"
                          className={`${inputCls} pl-8 text-sm`}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Blood Group</label>
                    <div className="grid grid-cols-4 gap-2">
                      {BLOOD_GROUPS.map(bg => (
                        <button key={bg} type="button" onClick={() => setBloodGroup(bg === bloodGroup ? "" : bg)}
                          className={`py-2.5 rounded-xl text-sm font-bold transition-all border ${
                            bloodGroup === bg
                              ? "bg-red-500 border-red-400 text-white shadow-md shadow-red-500/30"
                              : "bg-white/5 border-white/10 text-slate-300 hover:border-red-500/50 hover:text-red-300"
                          }`}
                        >
                          <Droplets size={11} className="inline mr-1 opacity-70" />{bg}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 mt-2">
                    <button type="button" onClick={() => setStep(0)}
                      className="flex-1 py-3.5 rounded-xl border border-white/10 text-slate-300 font-bold hover:bg-white/5 transition-all"
                    >
                      ← Back
                    </button>
                    <button type="button" onClick={() => setStep(2)}
                      className="flex-2 flex-1 flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-teal-500/30"
                    >
                      Continue <ArrowRight size={18} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 2: Emergency Contact ─────────────────────────────── */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="p-8 space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                      <AlertTriangle size={20} className="text-red-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-white">Emergency Contact</h2>
                      <p className="text-slate-400 text-xs">Who should we call in case of an emergency?</p>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>
                      Contact Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text" value={ecName} onChange={e => setEcName(e.target.value)} required
                      placeholder="e.g. Jane Doe (Mother)"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>
                      Phone Number <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel" value={ecPhone} onChange={e => setEcPhone(e.target.value)} required
                        placeholder="+91 98765 43210"
                        className={`${inputCls} pl-9`}
                      />
                    </div>
                  </div>

                  {/* Summary preview */}
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2 text-sm">
                    <p className="text-slate-400 font-semibold text-xs uppercase tracking-widest mb-3">Profile Summary</p>
                    <div className="grid grid-cols-2 gap-y-2">
                      <span className="text-slate-400">Date of Birth</span><span className="text-white font-semibold">{dob}</span>
                      <span className="text-slate-400">Calculated Age</span><span className="text-teal-400 font-bold">{age !== null ? `${age} yrs` : "—"}</span>
                      <span className="text-slate-400">Gender</span><span className="text-white font-semibold">{gender || "—"}</span>
                      <span className="text-slate-400">Height / Weight</span><span className="text-white font-semibold">{height ? `${height} cm` : "—"} / {weight ? `${weight} kg` : "—"}</span>
                      <span className="text-slate-400">Blood Group</span><span className="text-red-400 font-bold">{bloodGroup || "—"}</span>
                    </div>
                  </div>

                  {error && <p className="text-red-400 text-sm font-medium bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 flex items-center gap-2"><AlertTriangle size={14} /> {error}</p>}

                  <div className="flex gap-3 mt-2">
                    <button type="button" onClick={() => setStep(1)}
                      className="flex-1 py-3.5 rounded-xl border border-white/10 text-slate-300 font-bold hover:bg-white/5 transition-all"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit" disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-teal-500/30"
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
