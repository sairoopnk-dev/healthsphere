"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { PhoneCall } from "lucide-react";
import { PatientProvider } from "./_context/PatientContext";
import PatientSidebar from "./_components/PatientSidebar";
import PatientTopbar from "./_components/PatientTopbar";
import PatientModals from "./_components/PatientModals";
import { useState } from "react";

// Pages that use the full dashboard shell (sidebar + topbar)
const DASHBOARD_ROUTES = [
  "/patient/overview", "/patient/appointments", "/patient/medical-records",
  "/patient/medications", "/patient/timeline", "/patient/diet-plan", "/patient/messages",
  "/patient/health-report", "/patient/symptom-checker", "/patient/delulu",
];

export default function PatientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isDashboardRoute = DASHBOARD_ROUTES.some(r => pathname.startsWith(r));

  // Non-dashboard pages (setup-profile, symptom-checker, etc.) render without shell
  if (!isDashboardRoute) {
    return (
      <div style={{ background: "#F0FDF4", minHeight: "100vh", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
        {children}
      </div>
    );
  }

  // Dashboard pages get the full shell
  return (
    <PatientProvider>
      <div className="flex h-screen overflow-hidden relative" style={{ background: "#F0FDF4", fontFamily: "'Inter', sans-serif" }}>
        {/* Subtle radial highlight — top-right corner */}
        <div
          className="fixed top-0 right-0 w-[600px] h-[600px] pointer-events-none z-0"
          style={{ background: "radial-gradient(circle at top right, rgba(16,185,129,0.05) 0%, transparent 60%)" }}
        />
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <PatientSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10 w-full">
          <PatientTopbar toggleSidebar={() => setSidebarOpen(true)} />
          <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 custom-scrollbar w-full max-w-full">
            {children}
          </div>
        </main>
        <PatientModals />

        {/* Floating SOS Button */}
        <button
          type="button"
          className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-50 flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold px-4 py-2 md:px-5 md:py-3 rounded-full shadow-lg shadow-red-500/30 border border-red-400/20 hover:scale-105 hover:shadow-[0_10px_25px_rgba(239,68,68,0.5)] active:scale-95 transition-all duration-300"
        >
          <PhoneCall size={18} className="animate-pulse" />
          <span className="tracking-widest">SOS</span>
        </button>
      </div>
    </PatientProvider>
  );
}
