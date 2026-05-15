"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Stethoscope,
  UserRound,
  Eye,
  EyeOff,
  Shield,
  Heart,
  Activity,
  Pill,
  Brain,
  Thermometer,
  Plus,
  Droplets,
  Footprints,
  Moon,
  Apple,
  Zap,
  Wind,
} from "lucide-react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import LoginNavbar from "./_components/LoginNavbar";

/* ─── health facts data ─── */
const healthFacts = [
  {
    icon: Droplets,
    color: "#0ea5e9",
    tag: "Hydration",
    title: "Stay Hydrated",
    body: "Drinking 8 glasses of water daily improves metabolism, skin health, and cognitive performance by up to 30%.",
  },
  {
    icon: Footprints,
    color: "#10b981",
    tag: "Fitness",
    title: "Walk More, Live Longer",
    body: "Just 30 minutes of walking daily reduces the risk of heart disease by 35% and boosts mood significantly.",
  },
  {
    icon: Brain,
    color: "#8b5cf6",
    tag: "Mental Health",
    title: "Mind Matters",
    body: "Mental health is as vital as physical health. 5 minutes of mindfulness daily can reduce anxiety by 40%.",
  },
  {
    icon: Moon,
    color: "#6366f1",
    tag: "Sleep",
    title: "Sleep is Medicine",
    body: "7–9 hours of quality sleep strengthens immunity, sharpens memory, and reduces chronic disease risk.",
  },
  {
    icon: Apple,
    color: "#f59e0b",
    tag: "Nutrition",
    title: "Eat the Rainbow",
    body: "Consuming 5 servings of fruits and vegetables daily lowers cancer risk by up to 20% and boosts energy.",
  },
  {
    icon: Zap,
    color: "#10b981",
    tag: "Prevention",
    title: "Early Detection Saves Lives",
    body: "Regular health screenings can detect diseases early, reducing treatment complexity and risk by 60%.",
  },
  {
    icon: Wind,
    color: "#0ea5e9",
    tag: "Breathing",
    title: "Breathe Deeply",
    body: "Deep breathing exercises for 5 minutes lower cortisol levels, reduce blood pressure, and calm the nervous system.",
  },
];

/* ─── health facts carousel component ─── */
function HealthFactsCarousel() {
  const [active, setActive] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);

  useEffect(() => {
    const id = setInterval(() => {
      setDir(1);
      setPrev(active);
      setActive(a => (a + 1) % healthFacts.length);
    }, 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const go = (i: number) => {
    setDir(i > active ? 1 : -1);
    setPrev(active);
    setActive(i);
  };

  const card = healthFacts[active];
  const CardIcon = card.icon;

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Main card */}
      <div className="relative h-[240px] overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={active}
            custom={dir}
            variants={{
              enter: (d: number) => ({ opacity: 0, x: d * 40, y: 8, scale: 0.95 }),
              center: ({ opacity: 1, x: 0, y: 0, scale: 1 }),
              exit: (d: number) => ({ opacity: 0, x: d * -40, y: -8, scale: 0.95 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.05, y: -3 }}
            className="absolute inset-0 health-fact-card rounded-[2rem] p-8 cursor-default flex flex-col justify-center"
          >
            {/* Tag + icon row */}
            <div className="flex items-center justify-between mb-5">
              <span
                className="text-[12px] font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full"
                style={{
                  background: `${card.color}22`,
                  color: card.color,
                  border: `1px solid ${card.color}33`,
                }}
              >
                {card.tag}
              </span>
              <div
                className="p-3 rounded-2xl"
                style={{ background: `${card.color}18`, color: card.color }}
              >
                <CardIcon size={22} />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-white font-extrabold text-xl mb-3 leading-snug">
              {card.title}
            </h3>

            {/* Body */}
            <p className="text-white/70 text-base leading-relaxed line-clamp-3">
              {card.body}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center gap-2 justify-center mt-2">
        {healthFacts.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            className="transition-all duration-300 rounded-full"
            style={{
              width: i === active ? "20px" : "6px",
              height: "6px",
              background: i === active
                ? "linear-gradient(90deg, #10b981, #0ea5e9)"
                : "rgba(255,255,255,0.2)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
const floatingIcons = [
  { Icon: Heart, size: 28, x: "8%", y: "20%", delay: 0, dur: 7 },
  { Icon: Activity, size: 22, x: "18%", y: "60%", delay: 1.4, dur: 8 },
  { Icon: Stethoscope, size: 24, x: "28%", y: "38%", delay: 0.7, dur: 6.5 },
  { Icon: Pill, size: 18, x: "14%", y: "80%", delay: 2.1, dur: 7.5 },
  { Icon: Brain, size: 26, x: "5%", y: "50%", delay: 0.3, dur: 9 },
  { Icon: Thermometer, size: 20, x: "22%", y: "15%", delay: 1.8, dur: 6 },
  { Icon: Plus, size: 16, x: "35%", y: "70%", delay: 0.9, dur: 8.5 },
  { Icon: Heart, size: 14, x: "40%", y: "25%", delay: 2.5, dur: 7 },
  { Icon: Activity, size: 18, x: "10%", y: "90%", delay: 1.1, dur: 6 },
];

/* ─── typewriter ─── */
function useTypewriter(texts: string[], speed = 65, pause = 2400) {
  const [display, setDisplay] = useState("");
  const [idx, setIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = texts[idx];
    let t: ReturnType<typeof setTimeout>;
    if (!deleting && charIdx <= current.length) {
      t = setTimeout(() => { setDisplay(current.slice(0, charIdx)); setCharIdx(c => c + 1); }, speed);
    } else if (!deleting && charIdx > current.length) {
      t = setTimeout(() => setDeleting(true), pause);
    } else if (deleting && charIdx >= 0) {
      t = setTimeout(() => { setDisplay(current.slice(0, charIdx)); setCharIdx(c => c - 1); }, speed / 2);
    } else {
      setDeleting(false);
      setIdx(i => (i + 1) % texts.length);
      setCharIdx(0);
    }
    return () => clearTimeout(t);
  }, [charIdx, deleting, idx, texts, speed, pause]);

  return display;
}

/* ══════════════════════════════════════════════════════════════
   LOGIN PAGE
   ══════════════════════════════════════════════════════════════ */
export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState<"patient" | "doctor">("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const pageRef = useRef<HTMLDivElement>(null);

  const isPatient = role === "patient";

  const typed = useTypewriter([
    "Smarter Diagnoses",
    "Personalized Diet Plans",
    "Instant Appointments",
    "AI Health Insights",
  ]);

  /* global parallax */
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!pageRef.current) return;
    const { width, height } = pageRef.current.getBoundingClientRect();
    setMouse({
      x: (e.clientX / width - 0.5) * 30,
      y: (e.clientY / height - 0.5) * 30,
    });
  };

  /* ── Firebase (logic unchanged) ── */
  useEffect(() => {
    (async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) { setLoading(true); await processGoogleLoginResult(result); }
      } catch { setError("Sign-in cancelled or failed. Please try again."); }
      finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processGoogleLoginResult = async (result: any) => {
    const storedRole = localStorage.getItem("pendingGoogleRole") || role;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/${storedRole}/register`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: result.user.displayName || "Google User",
        email: result.user.email,
        password: "google_login_dummy_password",
        contactNumber: "0000000000",
        role: storedRole,
      }),
    });
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: result.user.email, password: "google_login_dummy_password", role: storedRole }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Google Login failed");
    localStorage.setItem("user", JSON.stringify({ ...data, role: storedRole }));
    if (result.user.email) localStorage.setItem("userEmail", result.user.email);
    if (data.name) localStorage.setItem("userName", data.name);
    localStorage.setItem("isLoggedIn", "true");
    localStorage.removeItem("pendingGoogleRole");
    if (!data.isProfileCompleted) router.push(`/${storedRole}/setup-profile`);
    else if (storedRole === "doctor" && data.hospitalId == null) router.push("/doctor/setup-hospital");
    else if (storedRole === "patient") router.push("/patient/overview");
    else router.push("/doctor/overview");
  };

  const handleGoogleLogin = async () => {
    setError(""); setLoading(true);
    localStorage.setItem("pendingGoogleRole", role);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await processGoogleLoginResult(result);
      setLoading(false);
    } catch (err: any) {
      if (
        err.code === "auth/popup-closed-by-user" ||
        err.code === "auth/popup-blocked" ||
        err.message?.includes("Cross-Origin-Opener-Policy")
      ) {
        setError("Popup blocked. Switching to redirect…");
        signInWithRedirect(auth, provider);
      } else {
        setError("Sign-in failed. Please try again.");
        setLoading(false);
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");
      localStorage.setItem("user", JSON.stringify({ ...data, role }));
      if (email) localStorage.setItem("userEmail", email);
      if (data.name) localStorage.setItem("userName", data.name);
      localStorage.setItem("isLoggedIn", "true");
      if (!data.isProfileCompleted) router.push(`/${role}/setup-profile`);
      else if (role === "doctor" && data.hospitalId == null) router.push("/doctor/setup-hospital");
      else if (role === "patient") router.push("/patient/overview");
      else router.push("/doctor/overview");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ══════════════════ RENDER ══════════════════ */
  return (
    <div
      ref={pageRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-screen w-full flex flex-col lg:flex-row items-center justify-center overflow-x-hidden overflow-y-auto lg:overflow-hidden pt-16 pb-12 lg:py-0"
    >
      {/* ── Navbar ── */}
      <LoginNavbar />
      {/* ── Full-screen animated gradient background ── */}
      <div className="absolute inset-0 login-gradient-bg" />

      {/* ── Glow orbs (parallax) ── */}
      <div
        className="absolute w-[700px] h-[700px] rounded-full blur-[140px] opacity-25 pointer-events-none"
        style={{
          background: "radial-gradient(circle, #10b981 0%, transparent 65%)",
          top: "-10%", left: "-5%",
          transform: `translate(${mouse.x * 0.6}px, ${mouse.y * 0.6}px)`,
          transition: "transform 0.5s ease-out",
        }}
      />
      <div
        className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-20 pointer-events-none"
        style={{
          background: "radial-gradient(circle, #0ea5e9 0%, transparent 65%)",
          bottom: "-10%", right: "30%",
          transform: `translate(${mouse.x * -0.4}px, ${mouse.y * -0.4}px)`,
          transition: "transform 0.5s ease-out",
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full blur-[100px] opacity-15 pointer-events-none"
        style={{
          background: "radial-gradient(circle, #6366f1 0%, transparent 65%)",
          top: "40%", left: "40%",
          transform: `translate(${mouse.x * 0.2}px, ${mouse.y * 0.2}px)`,
          transition: "transform 0.5s ease-out",
        }}
      />

      {/* ── SVG waves at bottom ── */}
      <svg
        className="absolute bottom-0 left-0 w-full pointer-events-none"
        viewBox="0 0 1440 220"
        preserveAspectRatio="none"
        style={{
          transform: `translateX(${mouse.x * 0.2}px)`,
          transition: "transform 0.4s ease-out",
        }}
      >
        <path className="login-wave login-wave-1" fill="rgba(16,185,129,0.12)"
          d="M0,160L60,149C120,139,240,117,360,122C480,128,600,160,720,154C840,149,960,107,1080,101C1200,96,1320,128,1380,144L1440,160L1440,220L0,220Z" />
        <path className="login-wave login-wave-2" fill="rgba(14,165,233,0.09)"
          d="M0,192L60,181C120,171,240,149,360,138C480,128,600,128,720,144C840,160,960,192,1080,186C1200,181,1320,139,1380,117L1440,96L1440,220L0,220Z" />
      </svg>

      {/* ── Floating health icons (left half only) ── */}
      {floatingIcons.map(({ Icon, size, x, y, delay, dur }, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none text-white/[0.07]"
          style={{ left: x, top: y }}
          animate={{ y: [0, -20, 0], rotate: [0, 6, -6, 0] }}
          transition={{ duration: dur, delay, repeat: Infinity, ease: "easeInOut" }}
        >
          <Icon size={size} />
        </motion.div>
      ))}



      {/* ── LEFT branding block (mid-screen, desktop) ── */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="relative lg:absolute lg:left-10 lg:top-1/2 lg:-translate-y-1/2 z-10 max-w-xs w-full text-center lg:text-left flex flex-col items-center lg:items-start mb-8 lg:mb-0"
      >
        <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-3">
          Your Health.
          <br />
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Simplified.
          </span>
        </h1>
        <p className="text-white/45 text-sm leading-relaxed mb-5">
          AI-powered healthcare assistant<br />for smarter decisions
        </p>
        <div className="flex items-center justify-center lg:justify-start gap-2 text-white/60 text-sm font-medium">
          <Activity size={14} className="text-emerald-400 shrink-0" />
          <span>{typed}</span>
          <span className="login-cursor">|</span>
        </div>
      </motion.div>

      {/* ── Health facts carousel — centered in the gap ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="relative lg:absolute z-10 w-full max-w-[340px] lg:max-w-[420px] mb-12 lg:mb-0 lg:top-1/2 lg:-translate-y-1/2 lg:left-[calc(55%-222px)] lg:-translate-x-[45%]"
      >
        <HealthFactsCarousel />
      </motion.div>

      {/* ══════════ FLOATING GLASS LOGIN CARD ══════════ */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-20 w-full max-w-[420px] mx-4 lg:mr-16 lg:ml-auto"
      >
        <div className="login-glass-card rounded-3xl p-8 lg:p-9">

          {/* Card top: logo + heading */}
          <div className="mb-7">
            {/* Mobile logo */}
            <div className="flex items-center gap-3 mb-5 md:hidden">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/25">
                <Heart size={22} className="text-white" />
              </div>
              <span className="text-white font-bold text-lg">HealthSphere</span>
            </div>

            <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
            <p className="text-white/45 text-sm">Sign in to continue to your dashboard</p>
          </div>

          {/* Role toggle */}
          <div className="flex p-1 rounded-2xl mb-6 bg-white/10">
            {(["patient", "doctor"] as const).map((r) => {
              const active = role === r;
              const RIcon = r === "patient" ? UserRound : Stethoscope;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300"
                  style={
                    active
                      ? {
                        background: "rgba(255,255,255,0.15)",
                        color: "#fff",
                        boxShadow: `0 2px 12px ${isPatient ? "rgba(16,185,129,0.3)" : "rgba(37,99,235,0.3)"}`,
                        backdropFilter: "blur(8px)",
                      }
                      : { color: "rgba(255,255,255,0.4)" }
                  }
                >
                  <RIcon size={15} />
                  {r === "patient" ? "Patient" : "Doctor"}
                </button>
              );
            })}
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input"
                placeholder="name@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input pr-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-emerald-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-red-300 text-sm font-medium text-center bg-red-500/10 rounded-xl py-2 px-3 border border-red-400/20"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              whileHover={{ scale: 1.015, boxShadow: "0 10px 35px rgba(16,185,129,0.45)" }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-60 login-btn-gradient mt-1"
            >
              {loading ? "Signing In…" : `Sign In as ${isPatient ? "Patient" : "Doctor"}`}
            </motion.button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-white/30 font-medium">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full font-semibold py-3.5 rounded-xl transition-all flex justify-center items-center gap-2.5 login-google-btn"
            >
              <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
              </svg>
              Sign in with Google
            </button>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 mt-7">
            <Shield size={13} className="text-white/30" />
            <p className="text-sm text-white/40">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Register here
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
