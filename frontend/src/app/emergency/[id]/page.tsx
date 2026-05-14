"use client";

import { motion } from "framer-motion";
import { HeartPulse, PhoneCall, AlertTriangle, ShieldCheck, Activity } from "lucide-react";
import { useParams } from "next/navigation";

export default function EmergencyView() {
  const params = useParams();
  const id = params.id as string;

  const emergencyData = {
    name: "Rajesh Kumar",
    id: "PID-10293",
    bloodGroup: "B+",
    age: 42,
    emergencyPhone: "+91 98765 43210",
    allergies: ["Penicillin", "Peanuts"],
    conditions: ["Asthma"],
    emergencyContact: {
      name: "Meera Kumar",
      relation: "Spouse",
      phone: "+919876543210",
      displayPhone: "+91 98765 43210"
    }
  };

  return (
    <div className="min-h-screen bg-red-600 p-6 sm:p-12 relative overflow-hidden flex items-center justify-center">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-500 rounded-full blur-3xl -z-0 translate-x-1/2 -translate-y-1/2 border-white pointer-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10"
      >
        <div className="bg-red-50 p-6 text-center border-b border-red-100 relative">
          <div className="absolute top-4 right-4 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </div>
          <HeartPulse size={48} className="mx-auto text-red-600 mb-3" />
          <h1 className="text-2xl font-black text-red-950 uppercase tracking-widest">Emergency Profile</h1>
          <p className="text-red-600 font-bold mt-1 tracking-wider">{id}</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex justify-between items-center bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase">Patient Name</p>
              <h2 className="text-3xl font-extrabold text-slate-800">{emergencyData.name}</h2>
            </div>
            <div className="text-right">
              <p className="text-xs text-red-500 font-bold uppercase flex items-center justify-end gap-1"><Activity size={14}/> Blood Type</p>
              <h2 className="text-4xl font-extrabold text-red-600">{emergencyData.bloodGroup}</h2>
            </div>
          </div>

          <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200">
            <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2 mb-3"><AlertTriangle className="text-amber-600"/> Critical Alerts</h3>
            <div className="space-y-3">
              <div>
                <span className="text-xs font-bold text-amber-700 uppercase">Allergies</span>
                <div className="flex gap-2 mt-1">
                  {emergencyData.allergies.map(a => <span key={a} className="bg-amber-200 text-amber-900 px-3 py-1 rounded-md text-sm font-bold">{a}</span>)}
                </div>
              </div>
              <div>
                <span className="text-xs font-bold text-amber-700 uppercase">Medical Conditions</span>
                <p className="text-amber-900 font-bold uppercase tracking-wide">{emergencyData.conditions.join(", ")}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4"><PhoneCall className="text-slate-500"/> Emergency Contact</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800 text-lg">{emergencyData.emergencyContact.name}</p>
                <p className="text-slate-500 font-medium text-sm">{emergencyData.emergencyContact.relation}</p>
              </div>
              <a href={`tel:${emergencyData.emergencyContact.phone}`} className="bg-green-100 text-green-700 hover:bg-green-200 px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2">
                <PhoneCall size={18} /> Call Now
              </a>
            </div>
          </div>
          
          <div className="text-center pt-4">
            <p className="text-slate-400 text-xs font-semibold flex items-center justify-center gap-1"><ShieldCheck size={14}/> Verified by HealthSphere Systems</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
