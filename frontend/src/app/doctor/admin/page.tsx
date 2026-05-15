"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  MapPin,
  Users,
  UserPlus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Shield,
  Stethoscope,
  Mail,
  Search,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { useDoctor } from "../_context/DoctorContext";

const API = process.env.NEXT_PUBLIC_API_URL!;

// ── Types ───────────────────────────────────────────────────────────────────
type Hospital = {
  hospitalId: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type HospitalDoctor = {
  doctorId: string;
  name: string;
  email?: string;
  specialization?: string;
  role: "ADMIN" | "DOCTOR" | null;
  hospitalId: string | null;
  updatedAt?: string;
};

// Add-doctor state machine per design §Add-Doctor Flow
type AddState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; id: string }
  | { kind: "success_noop"; id: string }
  | { kind: "not_found" }
  | { kind: "conflict" }
  | { kind: "forbidden" };

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
export default function AdminDashboardPage() {
  const router = useRouter();
  const { doctor, showToast } = useDoctor();
  const hospitalId = doctor?.hospitalId as string | undefined;

  useEffect(() => {
    if (doctor && doctor.doctorRole !== "ADMIN") {
      router.push("/doctor/dashboard");
    }
  }, [doctor, router]);

  // Hospital info
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [hospitalError, setHospitalError] = useState<string | null>(null);
  const [hospitalLoading, setHospitalLoading] = useState(true);

  // Hospital edit state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
  });

  // Doctor list
  const [doctors, setDoctors] = useState<HospitalDoctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [doctorsError, setDoctorsError] = useState<string | null>(null);

  // Add-doctor form
  const [addId, setAddId] = useState("");
  const [addState, setAddState] = useState<AddState>({ kind: "idle" });

  // ── Fetch hospital info (Req 6.1, 6.5) ───────────────────────────────────
  useEffect(() => {
    if (!hospitalId) return;
    setHospitalLoading(true);
    setHospitalError(null);
    fetch(`${API}/api/hospital/${hospitalId}`, {
      credentials: "include",
    })
      .then(async (res) => {
        if (res.status === 404) {
          setHospitalError("Hospital not found");
          return null;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setHospitalError(body?.message || "Failed to load hospital");
          return null;
        }
        return res.json();
      })
      .then((data: Hospital | null) => {
        if (data) setHospital(data);
      })
      .catch((err) => setHospitalError(err?.message || "Network error"))
      .finally(() => setHospitalLoading(false));
  }, [hospitalId]);

  // ── Fetch doctor list (Req 6.2, 6.3, 7.7) ────────────────────────────────
  const fetchDoctors = useCallback(async () => {
    if (!hospitalId) return;
    setDoctorsLoading(true);
    setDoctorsError(null);
    try {
      const res = await fetch(
        `${API}/api/hospital/doctors?hospitalId=${encodeURIComponent(hospitalId)}`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setDoctorsError(body?.message || "Failed to load doctors");
        setDoctors([]);
        return;
      }
      const data = (await res.json()) as HospitalDoctor[];
      setDoctors(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setDoctorsError(err?.message || "Network error");
      setDoctors([]);
    } finally {
      setDoctorsLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    if (!hospitalError) {
      // Per Req 6.5: skip the list when hospital info 404'd
      fetchDoctors();
    }
  }, [fetchDoctors, hospitalError]);

  // ── Add-doctor submit (Req 7.1–7.8) ──────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = addId.trim();
    if (!trimmed || !hospitalId || !doctor?.id) return;

    setAddState({ kind: "loading" });
    const sendTime = Date.now();

    try {
      const res = await fetch(`${API}/api/hospital/add-doctor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          hospitalId,
          adminDoctorId: doctor.id,
          doctorId: trimmed,
        }),
      });

      if (res.status === 404) {
        setAddState({ kind: "not_found" });
        return;
      }
      if (res.status === 403) {
        setAddState({ kind: "forbidden" });
        return;
      }
      if (res.status === 409) {
        setAddState({ kind: "conflict" });
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast(body?.message || "Failed to add doctor", "error");
        setAddState({ kind: "idle" });
        return;
      }

      // 200 — detect idempotent re-add by comparing updatedAt to pre-submit
      // (design §Add-Doctor Flow → success_noop detection).
      const data = (await res.json()) as HospitalDoctor;
      const updatedAtMs = data.updatedAt ? Date.parse(data.updatedAt) : 0;
      const isNoop =
        updatedAtMs > 0 && updatedAtMs < sendTime;

      if (isNoop) {
        setAddState({ kind: "success_noop", id: data.doctorId });
        showToast(`Doctor ${data.doctorId} is already in this hospital`, "success");
      } else {
        setAddState({ kind: "success", id: data.doctorId });
        showToast(`Doctor ${data.doctorId} added`, "success");
      }

      // Refetch list on both 200 variants (Req 7.7)
      await fetchDoctors();
      setAddId("");
      // Auto-reset to idle after a brief success window
      setTimeout(() => setAddState({ kind: "idle" }), 1600);
    } catch (err: any) {
      showToast(err?.message || "Network error", "error");
      setAddState({ kind: "idle" });
    }
  };

  // Reset 4xx error state on typing (design §Add-Doctor Flow)
  const handleInputChange = (v: string) => {
    setAddId(v);
    if (
      addState.kind === "not_found" ||
      addState.kind === "conflict"
    ) {
      setAddState({ kind: "idle" });
    }
  };

  const handleEditClick = () => {
    if (hospital) {
      setFormData({
        name: hospital.name,
        address: hospital.address,
        latitude: hospital.latitude.toString(),
        longitude: hospital.longitude.toString(),
      });
      setIsEditing(true);
    }
  };

  const handleSaveHospital = async () => {
    if (!formData.name.trim() || !formData.address.trim()) {
      showToast("Name and address are required", "error");
      return;
    }
    
    setIsSaving(true);
    try {
      const res = await fetch(`${API}/api/hospital/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name.trim(),
          address: formData.address.trim(),
          latitude: parseFloat(formData.latitude) || 12.9716,
          longitude: parseFloat(formData.longitude) || 77.5946,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      showToast("Hospital updated successfully", "success");
      setIsEditing(false);
      
      if (hospital) {
        setHospital({
          ...hospital,
          name: formData.name.trim(),
          address: formData.address.trim(),
          latitude: parseFloat(formData.latitude) || 12.9716,
          longitude: parseFloat(formData.longitude) || 77.5946,
        });
      }
    } catch (err: any) {
      showToast(err.message || "Failed to update hospital", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (!hospitalId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-500">Loading…</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Hospital info card ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-xl"
              style={{ background: "linear-gradient(135deg, #1E3A8A, #2563EB)" }}
            >
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Hospital Info</h2>
              <p className="text-xs text-slate-500">Your hospital details</p>
            </div>
          </div>
          {doctor?.doctorRole === "ADMIN" && hospital && !isEditing && (
            <button
              onClick={handleEditClick}
              className="flex items-center gap-1.5 text-sm font-semibold bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
            >
              <Pencil size={14} /> Edit ✏️
            </button>
          )}
        </div>

        {hospitalLoading ? (
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Loading hospital…</span>
          </div>
        ) : hospitalError ? (
          <div className="flex items-start gap-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{hospitalError}</span>
          </div>
        ) : hospital ? (
          isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent font-medium resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Latitude
                  </label>
                  <input
                    type="text"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Longitude
                  </label>
                  <input
                    type="text"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent font-mono"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSaveHospital}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Save Changes
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-200 disabled:opacity-60 transition-colors"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Name
                </p>
                <p className="text-base font-bold text-slate-900">
                  {hospital.name}
                </p>
                <p className="text-xs font-mono text-blue-600 mt-1">
                  {hospital.hospitalId}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Address
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {hospital.address}
                </p>
              </div>
              <div className="md:col-span-2 flex items-center gap-2 text-xs font-mono text-slate-500 border-t border-slate-100 pt-3">
                <MapPin size={12} />
                {hospital.latitude.toFixed(5)}, {hospital.longitude.toFixed(5)}
              </div>
            </div>
          )
        ) : null}
      </motion.div>

      {/* ── Skip doctor list when hospital info 404'd (Req 6.5) ─────────── */}
      {hospitalError !== "Hospital not found" && (
        <>
          {/* ── Doctor list card ──────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-xl"
                  style={{ background: "linear-gradient(135deg, #10B981, #0EA5E9)" }}
                >
                  <Users size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Doctors in this Hospital
                  </h2>
                  <p className="text-xs text-slate-500">
                    {doctors.length} doctor{doctors.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            </div>

            {doctorsLoading ? (
              <div className="flex items-center gap-2 text-slate-500">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Loading doctors…</span>
              </div>
            ) : doctorsError ? (
              <div className="flex items-start gap-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{doctorsError}</span>
              </div>
            ) : doctors.length === 0 ? (
              <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Users size={24} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">
                  No doctors assigned yet.
                </p>
                <p className="text-xs mt-1">
                  Add one below using their Doctor ID.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="text-left py-3 px-3">Doctor ID</th>
                      <th className="text-left py-3 px-3">Name</th>
                      <th className="text-left py-3 px-3">Specialization</th>
                      <th className="text-left py-3 px-3">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctors.map((d) => (
                      <tr
                        key={d.doctorId}
                        className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="py-3 px-3 font-mono text-xs text-blue-600 font-semibold">
                          {d.doctorId}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {d.name}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {d.specialization || "—"}
                        </td>
                        <td className="py-3 px-3">
                          {d.role === "ADMIN" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                              <Shield size={11} />
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                              <Stethoscope size={11} />
                              Doctor
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {/* ── Add doctor card ───────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="p-2 rounded-xl"
                style={{ background: "linear-gradient(135deg, #F59E0B, #EF4444)" }}
              >
                <UserPlus size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Add a Doctor
                </h2>
                <p className="text-xs text-slate-500">
                  Enter the Doctor ID to add them to this hospital.
                </p>
              </div>
            </div>

            {/* Forbidden = full-card banner (session refresh signal) */}
            <AnimatePresence>
              {addState.kind === "forbidden" && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mb-4 flex items-start gap-2 text-sm font-medium text-red-800 bg-red-50 border border-red-200 rounded-lg px-4 py-3"
                >
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">
                      Only the hospital admin can add doctors
                    </p>
                    <p className="text-xs mt-1 text-red-700">
                      Your session may be stale. Try signing out and back in.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleAdd} className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                Doctor ID
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={addId}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="DOC-12345"
                    disabled={addState.kind === "loading"}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-mono font-semibold text-slate-800 placeholder-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!addId.trim() || addState.kind === "loading"}
                  className="px-5 py-3 rounded-xl font-semibold text-white text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, #F59E0B, #EF4444)",
                    boxShadow: "0 4px 14px rgba(245, 158, 11, 0.3)",
                  }}
                >
                  {addState.kind === "loading" ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <UserPlus size={15} />
                  )}
                  Add Doctor
                </button>
              </div>

              {/* Inline 404 / 409 errors */}
              {addState.kind === "not_found" && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
                  <AlertCircle size={13} />
                  Doctor ID not found
                </p>
              )}
              {addState.kind === "conflict" && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                  <AlertCircle size={13} />
                  Doctor already belongs to another hospital
                </p>
              )}

              {/* Inline success / noop */}
              {(addState.kind === "success" ||
                addState.kind === "success_noop") && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                  <CheckCircle2 size={13} />
                  {addState.kind === "success"
                    ? `Added ${addState.id}`
                    : `${addState.id} is already in this hospital`}
                </p>
              )}
            </form>
          </motion.div>
        </>
      )}
    </div>
  );
}
