"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import QRCode from "react-qr-code";
import { ShieldAlert, ArrowLeft, Download, Shield } from "lucide-react";

export default function PatientQRPage() {
  const router = useRouter();
  const patientId = "PID-49210";
  const emergencyUrl = `http://localhost:3000/emergency/${patientId}`;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative">
      <div className="absolute top-0 w-full h-96 bg-red-600 rounded-b-[4rem] -z-10 shadow-2xl shadow-red-600/20"/>

      {/* ── Back button — fixed top-left ── */}
      <button
        onClick={() => router.push("/patient/overview")}
        className="fixed top-6 left-6 z-50 flex items-center gap-2 bg-white text-slate-800 font-bold text-sm px-5 py-3 rounded-xl border border-slate-200 shadow-md transition-all hover:bg-slate-50 hover:shadow-lg active:scale-95"
      >
        <ArrowLeft size={18} />
        Back to Overview
      </button>

      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 text-center relative overflow-hidden"
        >
          <div className="mx-auto w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6 ring-8 ring-red-50/50">
            <ShieldAlert size={36} />
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Emergency Medical ID</h1>
          <p className="text-slate-500 font-medium text-sm mt-2 mb-8 px-4">Keep this QR code accessible. First responders can scan it to view critical, life-saving information instantly.</p>

          <div className="flex justify-center p-6 border-4 border-dashed border-red-200 rounded-2xl bg-red-50/50 mb-8">
            <QRCode value={emergencyUrl} size={180} fgColor="#dc2626" />
          </div>

          <button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-colors shadow-lg flex justify-center items-center gap-2">
            <Download size={20} /> Download QR Code Image
          </button>
        </motion.div>

        <p className="text-center text-red-100 mt-8 text-sm font-medium flex items-center justify-center gap-2">
          <Shield size={16} /> Secured by HealthSphere Privacy
        </p>
      </div>
    </div>
  );
}
