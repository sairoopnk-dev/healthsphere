"use client";

import { Building2, MapPin, Stethoscope, Users, Clock } from "lucide-react";
import { useDoctor } from "../_context/DoctorContext";
import ClinicLocation from "../_components/ClinicLocation";
import HospitalSettings from "../_components/HospitalSettings";

export default function ClinicPage() {
  const { doctor, doctorProfile } = useDoctor();

  const hospitalName = doctorProfile?.hospitalName || doctor?.hospitalName || "Your Clinic";
  const specialty    = doctorProfile?.specialty    || doctor?.specialty    || "General Practice";
  const doctorId     = doctor?.id || "";

  return (
    <div className="space-y-8">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Clinic Setup</h1>
          <p className="text-slate-400 text-sm font-medium mt-1">
            Manage your hospital location, details, and profile visibility.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-600 px-4 py-2 rounded-xl text-sm font-bold">
          <Building2 size={15} />
          {hospitalName}
        </div>
      </div>

      {/* ── Stats Row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Stethoscope size={20} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Specialty</p>
            <p className="text-sm font-black text-slate-800 mt-0.5">{specialty}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Doctor ID</p>
            <p className="text-sm font-black text-slate-800 mt-0.5 truncate max-w-[140px]" title={doctorId}>
              {doctorId || "—"}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Clock size={20} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Status</p>
            <p className="text-sm font-black text-emerald-600 mt-0.5">Active</p>
          </div>
        </div>
      </div>

      {/* ── Clinic Location Card ─────────────────────────────────────── */}
      {doctorId ? (
        <ClinicLocation doctorId={doctorId} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
            <MapPin size={24} className="text-slate-300" />
          </div>
          <p className="font-bold text-slate-600">Loading clinic data…</p>
          <p className="text-slate-400 text-sm">Please wait while we load your doctor profile.</p>
        </div>
      )}

      {/* ── Admin Settings ───────────────────────────────────────────── */}
      {doctor?.role === "ADMIN" && (
        <HospitalSettings />
      )}

      {/* ── Info Banner ──────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl px-6 py-4 flex items-start gap-3">
        <Building2 size={18} className="text-blue-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-blue-700">Shared Hospital Location</p>
          <p className="text-xs text-blue-500 mt-0.5 leading-relaxed">
            The location you set here is shared across all doctors registered at the same hospital.
            Patients use this address to find your clinic on the map.
          </p>
        </div>
      </div>
    </div>
  );
}
