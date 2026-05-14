"use client";

import { usePathname } from "next/navigation";
import { BarChart2, Calendar, Search, Activity, Shield } from "lucide-react";
import LanguageSwitcher from "../../../components/LanguageSwitcher";
import RoleToggle from "./RoleToggle";

const TITLES: Record<string, { label: string; icon: any }> = {
  "/doctor/overview":       { label: "Overview",        icon: BarChart2 },
  "/doctor/weeklyschedule": { label: "Weekly Schedule", icon: Calendar },
  "/doctor/patientrecords": { label: "Patient Records", icon: Search },
  "/doctor/admin":          { label: "Admin Console",   icon: Shield },
};

export default function DoctorTopbar() {
  const pathname = usePathname();
  const page = TITLES[pathname] || { label: "Dashboard", icon: BarChart2 };
  const PageIcon = page.icon;

  const now = new Date();
  const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const dateStr = `${dayNames[now.getDay()]}, ${String(now.getDate()).padStart(2,"0")}-${String(now.getMonth()+1).padStart(2,"0")}-${now.getFullYear()}`;

  return (
    <header
      className="sticky top-0 z-30 px-8 h-16 flex items-center justify-between border-b"
      style={{
        background: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderColor: "rgba(226, 232, 240, 0.6)",
      }}
    >
      {/* Left: page title with icon */}
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #1E3A8A, #2563EB)" }}
        >
          <PageIcon size={15} className="text-white"/>
        </div>
        <div>
          <h1 className="text-base font-black" style={{ color: "#0F172A" }}>{page.label}</h1>
          <p className="text-[11px] font-medium" style={{ color: "#64748B" }}>{dateStr}</p>
        </div>
      </div>

      {/* Right: role toggle (admin only) + language + status */}
      <div className="flex items-center gap-3">
        <RoleToggle />
        <LanguageSwitcher />
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "#F0FFF4", border: "1px solid #BBF7D0" }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#22C55E" }}/>
          <span className="text-[11px] font-semibold" style={{ color: "#16A34A" }}>Online</span>
        </div>
      </div>
    </header>
  );
}
