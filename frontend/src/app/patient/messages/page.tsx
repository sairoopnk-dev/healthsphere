"use client";

import { Calendar as CalendarIcon, Pill, Mail, FileText } from "lucide-react";
import { usePatient } from "../_context/PatientContext";

export default function PatientMessages() {
  const { messages, markOneRead, markAllRead, formatDate } = usePatient();

  return (
    <div className="max-w-[1000px] mx-auto space-y-4">


      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Messages &amp; Inbox</h3>
          <p className="text-slate-500 text-sm">Click a message to mark it as read.</p>
        </div>
        <button onClick={markAllRead} className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-teal-600 transition-colors">Mark All as Read</button>
      </div>
      <div className="grid gap-3">
        {messages.length > 0 ? messages.map((m: any) => (
          <div key={m.id} onClick={() => markOneRead(m)} className={`p-5 rounded-3xl border transition-all cursor-pointer group ${
            m.isNew
              ? "bg-white border-teal-200 shadow-xl shadow-teal-500/5 ring-1 ring-teal-50 hover:shadow-teal-500/10"
              : "bg-white border-slate-100 opacity-70 hover:opacity-100"
          }`}>
            <div className="flex items-start gap-5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                m.type === "appointment" ? "bg-teal-100 text-teal-600" : "bg-purple-100 text-purple-600"
              }`}>
                {m.type === "appointment" ? <CalendarIcon size={20}/> : <Pill size={20}/>}
              </div>
              <div className="flex-1 min-w-0 py-1">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${
                    m.type === "appointment" ? "text-teal-500" : "text-purple-500"
                  }`}>{m.type.replace('_',' ')}</span>
                  <span className="text-xs text-slate-400 font-bold">{formatDate(m.date)}</span>
                </div>
                <p className={`text-base font-semibold leading-snug ${m.isNew ? "text-slate-800" : "text-slate-600"}`}>{m.text}</p>
              </div>
              {m.isNew
                ? <span className="flex items-center gap-1.5 text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-full">● Unread — click to mark read</span>
                : <span className="text-[10px] font-semibold text-slate-400">✓ Read</span>
              }
            </div>
          </div>
        )) : (
          <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <Mail size={48} className="text-slate-200 mx-auto mb-4"/>
            <p className="text-slate-400 font-bold">No messages yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
