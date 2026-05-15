"use client";

/**
 * HospitalSettings — Admin-only hospital configuration panel.
 * Stub: full implementation in the admin page (/doctor/admin).
 */
export default function HospitalSettings() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <h2 className="text-base font-bold text-slate-800 mb-1">Hospital Settings</h2>
      <p className="text-sm text-slate-400">
        Hospital-level configuration is managed in the{" "}
        <a href="/doctor/admin" className="text-blue-500 hover:underline font-semibold">
          Admin Console
        </a>
        .
      </p>
    </div>
  );
}
