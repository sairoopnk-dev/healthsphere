"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar as CalendarIcon, FileText, Pill, Activity, Mail, LayoutDashboard, Stethoscope, Salad, Settings, LogOut, Brain } from "lucide-react";
import { usePatient } from "../_context/PatientContext";

const NAV = [
  { name: "Overview",        href: "/patient/overview",        icon: LayoutDashboard },
  { name: "Appointments",    href: "/patient/appointments",    icon: CalendarIcon },
  { name: "Medical Records", href: "/patient/medical-records", icon: FileText },
  { name: "Medications",     href: "/patient/medications",     icon: Pill },
  { name: "Timeline",        href: "/patient/timeline",        icon: Activity },
  { name: "Diet Plan",       href: "/patient/diet-plan",       icon: Salad },
  { name: "Health Report",   href: "/patient/health-report",   icon: Brain },
  { name: "Messages",        href: "/patient/messages",        icon: Mail },
];

export default function PatientSidebar() {
  const pathname = usePathname();
  const { profile, messages, setShowSettings, handleLogout } = usePatient();
  const unreadCount = messages.filter((m: any) => m.isNew).length;

  return (
    <aside className="w-64 flex flex-col shrink-0 border-r" style={{ background: "#FFFFFF", borderColor: "#E5E7EB" }}>
      {/* ── Logo ─────────────────────────────────────────────────── */}
      <div className="p-6 flex items-center gap-2.5 border-b" style={{ borderColor: "#F0FDF4" }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md animate-glow-ring-green"
          style={{ background: "linear-gradient(135deg, #10B981, #06B6D4)" }}
        >
          <Activity className="text-white" size={18}/>
        </div>
        <span className="text-xl font-black tracking-tight" style={{ color: "#10B981" }}>HealthSphere</span>
      </div>

      {/* ── Navigation ──────────────────────────────────────────── */}
      <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto custom-scrollbar">
        {(() => {
          const checkIsActive = (route: string) => {
            if (route === "/patient/symptom-checker") {
              return pathname.includes("symptom-checker");
            }
            return pathname === route;
          };

          return (
            <>
              {NAV.map(item => {
                const isActive = checkIsActive(item.href);
                const isMessageItem = item.name === "Messages";
                const badgeCount = isMessageItem ? unreadCount : 0;
                return (
                  <Link key={item.name} href={item.href}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-left group relative ${
                      isActive
                        ? "text-white shadow-md"
                        : "text-slate-500 hover:bg-emerald-50/60 hover:text-slate-700"
                    }`}
                    style={isActive ? {
                      background: "linear-gradient(135deg, #10B981, #06B6D4)",
                      boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)",
                    } : {}}
                  >
                    <div className="relative">
                      <item.icon size={19} className={isActive ? "text-white" : "text-slate-400 group-hover:text-emerald-500"} />
                      {badgeCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-orange-500 border-2 border-white rounded-full text-[8px] font-black flex items-center justify-center text-white">{badgeCount}</span>}
                    </div>
                    <span className="flex-1 text-sm">{item.name}</span>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white/70"/>}
                  </Link>
                );
              })}

              {/* Symptom checker CTA */}
              <div className="pt-3 mt-3 border-t" style={{ borderColor: "#F0FDF4" }}>
                {(() => {
                  const isActive = checkIsActive("/patient/symptom-checker");
                  return (
                    <Link href="/patient/symptom-checker"
                      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-semibold text-left transition-all duration-200 group ${
                        isActive
                          ? "text-white animate-gradient-shift shadow-md"
                          : "text-slate-500 hover:bg-emerald-50/60 hover:text-slate-700"
                      }`}
                      style={isActive ? {
                        background: "linear-gradient(135deg, #10B981, #06B6D4, #10B981)",
                        backgroundSize: "200% 200%",
                        boxShadow: "0 4px 15px rgba(16, 185, 129, 0.25)",
                      } : {}}
                    >
                      <Stethoscope size={19} className={isActive ? "text-white transition-transform" : "text-slate-400 group-hover:text-emerald-500 group-hover:rotate-12 transition-transform"}/>
                      <span className="flex-1 text-sm">Check Symptoms</span>
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white/70"/>}
                    </Link>
                  );
                })()}
              </div>
            </>
          );
        })()}
      </nav>

      {/* ── User card + actions ─────────────────────────────────── */}
      <div className="p-4 border-t" style={{ borderColor: "#F0FDF4" }}>
        <div className="rounded-2xl p-3 border" style={{ background: "#F0FDF4", borderColor: "#D1FAE5" }}>
          <div className="flex items-center gap-3 px-1 mb-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black shadow-inner overflow-hidden"
              style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}
            >
              {profile.profilePicture ? (
                <img src={profile.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                profile.name?.[0]?.toUpperCase() || "P"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black truncate leading-tight" style={{ color: "#064E3B" }}>{profile.name}</p>
              <p className="text-[10px] font-bold uppercase tracking-tighter mt-0.5" style={{ color: "#10B981" }}>Patient Account</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setShowSettings(true)}
              className="flex-1 flex items-center justify-center py-2 bg-white rounded-xl border transition-all duration-200 card-hover"
              style={{ borderColor: "#D1FAE5", color: "#6B7280" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#10B981"; e.currentTarget.style.color = "#10B981"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#D1FAE5"; e.currentTarget.style.color = "#6B7280"; }}
            >
              <Settings size={16}/>
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center py-2 bg-white rounded-xl border transition-all duration-200 card-hover"
              style={{ borderColor: "#D1FAE5", color: "#6B7280" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#EF4444"; e.currentTarget.style.color = "#EF4444"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#D1FAE5"; e.currentTarget.style.color = "#6B7280"; }}
            >
              <LogOut size={16}/>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
