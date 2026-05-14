"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DoctorProvider } from "./_context/DoctorContext";
import DoctorSidebar from "./_components/DoctorSidebar";
import DoctorTopbar from "./_components/DoctorTopbar";
import RoleRouterEffect from "./_components/RoleRouterEffect";

// Dashboard routes get the sidebar + topbar chrome.
const DASHBOARD_ROUTES = [
  "/doctor/overview",
  "/doctor/weeklyschedule",
  "/doctor/patientrecords",
  "/doctor/clinic",
  "/doctor/admin",
];

// Post-login doctor routes that need DoctorProvider context (for doctor.id,
// doctor.hospitalId, doctor.doctorRole, updateHospitalMembership) but render
// without the sidebar chrome — mirrors the pattern used by setup-profile.
const PROVIDED_STANDALONE_ROUTES = [
  "/doctor/setup-hospital",
];

export default function DoctorLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isDashboardRoute = DASHBOARD_ROUTES.some(r => pathname?.startsWith(r));
  const isProvidedStandalone = PROVIDED_STANDALONE_ROUTES.some(r => pathname?.startsWith(r));

  // Routes that sit completely outside the provider (e.g. setup-profile manages
  // its own auth redirect on first login).
  if (!isDashboardRoute && !isProvidedStandalone) {
    return (
      <div style={{ background: "#F8FAFC", minHeight: "100vh", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
        {children}
      </div>
    );
  }

  // Setup-hospital and similar standalone routes: wrap in DoctorProvider for
  // context access, run the Role_Router, but skip the sidebar chrome.
  if (isProvidedStandalone) {
    return (
      <DoctorProvider>
        <RoleRouterEffect />
        <div style={{ background: "#F8FAFC", minHeight: "100vh", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
          {children}
        </div>
      </DoctorProvider>
    );
  }

  // Full dashboard shell.
  return (
    <DoctorProvider>
      <RoleRouterEffect />
      <div className="min-h-screen relative" style={{ background: "#F8FAFC", fontFamily: "'Inter', sans-serif" }}>
        {/* Subtle radial highlight — top-right corner */}
        <div
          className="fixed top-0 right-0 w-[600px] h-[600px] pointer-events-none z-0"
          style={{ background: "radial-gradient(circle at top right, rgba(37,99,235,0.04) 0%, transparent 60%)" }}
        />
        <DoctorSidebar />
        <div className="ml-64 min-h-screen relative z-10">
          <DoctorTopbar />
          <div className="p-8">
            {children}
          </div>
        </div>
      </div>
    </DoctorProvider>
  );
}
