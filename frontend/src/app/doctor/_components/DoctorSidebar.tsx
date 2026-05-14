"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Stethoscope, Calendar, Search, BarChart2, LogOut, Award, BriefcaseMedical, Mail, AlertTriangle, Lock } from "lucide-react";
import { useDoctor } from "../_context/DoctorContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const NAV = [
  { id: "overview",        href: "/doctor/overview",        label: "Overview",        icon: BarChart2 },
  { id: "weeklyschedule",  href: "/doctor/weeklyschedule",  label: "Weekly Schedule", icon: Calendar },
  { id: "patientrecords",  href: "/doctor/patientrecords",  label: "Patient Records", icon: Search },
] as const;

export default function DoctorSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { doctor, doctorProfile, totalApptThisWeek } = useDoctor();

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  async function confirmLogout() {
    try {
      await signOut(auth);
      localStorage.clear();
      router.push("/login");
    } catch (err: any) {
      console.error("Logout error:", err.message);
    }
  }

  return (
    <>
      <div
        className="fixed left-0 top-0 bottom-0 w-64 flex flex-col z-40 shadow-2xl"
        style={{ background: "linear-gradient(180deg, #0F172A 0%, #1E293B 100%)" }}
      >
        {/* ── Logo ─────────────────────────────────────────────────── */}
        <div className="px-6 py-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl shadow-lg animate-glow-ring"
              style={{ background: "linear-gradient(135deg, #1E3A8A, #2563EB)" }}
            >
              <Stethoscope size={22} className="text-white"/>
            </div>
            <div>
              <p className="font-black text-white text-lg leading-tight tracking-tight">HealthSphere</p>
              <p className="text-xs font-semibold" style={{ color: "#60A5FA" }}>Provider Portal</p>
            </div>
          </div>
        </div>

        {/* ── Doctor profile card ──────────────────────────────────── */}
        {doctorProfile && (
          <div className="px-4 py-4 border-b border-white/[0.06]">
            <div className="rounded-2xl p-4" style={{ background: "rgba(30, 58, 138, 0.15)", border: "1px solid rgba(37, 99, 235, 0.15)" }}>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg animate-gradient-shift"
                  style={{ background: "linear-gradient(135deg, #2563EB, #6366F1, #2563EB)" }}
                >
                  {doctor.name?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm truncate">{doctor.name}</p>
                  <p className="text-xs truncate" style={{ color: "#93C5FD" }}>{doctorProfile.designation || doctorProfile.specialization}</p>
                  {doctor?.id && (
                    <p className="text-[10px] font-mono mt-0.5 truncate" style={{ color: "#60A5FA" }}>
                      ID: {doctor.id}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl p-2 text-center" style={{ background: "rgba(30, 58, 138, 0.25)" }}>
                  <p className="text-xs font-bold" style={{ color: "#93C5FD" }}>{doctorProfile.experience || 0}yrs</p>
                  <p className="text-[10px]" style={{ color: "#64748B" }}>Experience</p>
                </div>
                <div className="rounded-xl p-2 text-center" style={{ background: "rgba(30, 58, 138, 0.25)" }}>
                  <p className="text-xs font-bold" style={{ color: "#93C5FD" }}>{totalApptThisWeek}</p>
                  <p className="text-[10px]" style={{ color: "#64748B" }}>This Week</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Navigation ──────────────────────────────────────────── */}
        <nav className="px-4 py-5 flex-1 space-y-1.5">
          {NAV.map(({ id, href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link key={id} href={href}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative ${
                  isActive
                    ? "text-white shadow-lg"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
                }`}
                style={isActive ? { background: "linear-gradient(135deg, #1E3A8A, #2563EB)", boxShadow: "0 4px 15px rgba(37, 99, 235, 0.35)" } : {}}
              >
                {isActive && <div className="absolute inset-0 rounded-xl" style={{ background: "linear-gradient(135deg, #1E3A8A, #2563EB)", opacity: 0.1 }}/>}
                <Icon size={18} className={isActive ? "text-white" : "text-slate-500 group-hover:text-blue-400"}/>
                {label}
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white"/>}
              </Link>
            );
          })}
        </nav>

        {/* ── Doctor info + logout ─────────────────────────────────── */}
        {doctorProfile && (
          <div className="px-4 pb-4 space-y-2">
            <div className="rounded-xl p-3 text-xs space-y-2" style={{ background: "rgba(30, 58, 138, 0.1)", border: "1px solid rgba(37, 99, 235, 0.08)" }}>
              <div className="flex items-center gap-2" style={{ color: "#94A3B8" }}>
                <BriefcaseMedical size={13} className="shrink-0" style={{ color: "#60A5FA" }}/>
                <span className="truncate">{doctorProfile.hospital}</span>
              </div>
              <div className="flex items-center gap-2" style={{ color: "#94A3B8" }}>
                <Award size={13} className="shrink-0" style={{ color: "#60A5FA" }}/>
                <span className="truncate">{doctorProfile.qualification}</span>
              </div>
              <div className="flex items-center gap-2" style={{ color: "#94A3B8" }}>
                <Mail size={13} className="shrink-0" style={{ color: "#60A5FA" }}/>
                <span className="truncate">{doctor.email}</span>
              </div>
            </div>
            <button
              onClick={() => setShowLogoutModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{ color: "#94A3B8" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#F87171"; e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#94A3B8"; e.currentTarget.style.background = "transparent"; }}
            >
              <LogOut size={16}/> Sign Out
            </button>
          </div>
        )}
      </div>

      {/* ── Logout Confirmation Modal ──────────────────────────────── */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div
            className="absolute inset-0 glass-dark"
            onClick={() => setShowLogoutModal(false)}
          />
          <div className="relative glass rounded-3xl shadow-2xl p-8 w-full max-w-sm mx-4 z-10 animate-fade-in-up">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={32} className="text-red-500"/>
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800">Confirm Logout</h2>
                <p className="text-slate-500 text-sm mt-1">Are you sure you want to logout?</p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 px-5 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors shadow-lg"
                  style={{ boxShadow: "0 4px 15px rgba(239, 68, 68, 0.3)" }}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
