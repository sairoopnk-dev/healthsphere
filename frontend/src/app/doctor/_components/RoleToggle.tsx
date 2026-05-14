"use client";

import { usePathname, useRouter } from "next/navigation";
import { Shield, Stethoscope } from "lucide-react";
import { useDoctor } from "../_context/DoctorContext";

/**
 * Admin-only segmented control that lets an ADMIN switch between the Admin
 * dashboard (`/doctor/admin`) and the clinical Doctor dashboard
 * (`/doctor/overview`, etc.).
 *
 * Self-gates on `doctor.doctorRole === 'ADMIN'`; returns null for DOCTOR or
 * null roles so the toggle is never visible to non-admins (Req 5.1–5.3).
 *
 * Each option is sized ≥ 44×44 CSS pixels to satisfy Req 10.6.
 */
const DOCTOR_PATHS = [
  "/doctor/overview",
  "/doctor/weeklyschedule",
  "/doctor/patientrecords",
  "/doctor/clinic",
];

export default function RoleToggle() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { doctor } = useDoctor();

  // Req 5.1, 5.2, 5.3 — visible only when doctorRole === 'ADMIN'.
  if (!doctor || doctor.doctorRole !== "ADMIN") return null;

  const onAdmin  = pathname.startsWith("/doctor/admin");
  const onDoctor = DOCTOR_PATHS.some((p) => pathname.startsWith(p));

  const baseBtn =
    "flex items-center justify-center gap-2 px-4 font-semibold text-sm transition-all duration-200 select-none";
  const sizeBtn = "min-w-[44px] min-h-[44px]";

  return (
    <div
      role="group"
      aria-label="Role toggle"
      className="flex p-1 rounded-xl border border-slate-200 bg-slate-100"
    >
      <button
        type="button"
        aria-pressed={onAdmin}
        onClick={() => router.push("/doctor/admin")}
        className={`${baseBtn} ${sizeBtn} rounded-lg`}
        style={
          onAdmin
            ? {
                background: "#FFFFFF",
                color: "#1E3A8A",
                boxShadow: "0 2px 6px rgba(37, 99, 235, 0.18)",
              }
            : { color: "#64748B", background: "transparent" }
        }
      >
        <Shield size={15} />
        Admin
      </button>
      <button
        type="button"
        aria-pressed={onDoctor}
        onClick={() => router.push("/doctor/overview")}
        className={`${baseBtn} ${sizeBtn} rounded-lg`}
        style={
          onDoctor
            ? {
                background: "#FFFFFF",
                color: "#065F46",
                boxShadow: "0 2px 6px rgba(16, 185, 129, 0.20)",
              }
            : { color: "#64748B", background: "transparent" }
        }
      >
        <Stethoscope size={15} />
        Doctor
      </button>
    </div>
  );
}
