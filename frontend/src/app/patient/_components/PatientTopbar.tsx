"use client";

import { usePathname } from "next/navigation";
import { Calendar as CalendarIcon, FileText, Pill, Activity, Mail, LayoutDashboard, Salad, Brain, Stethoscope } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePatient } from "../_context/PatientContext";
import LanguageSwitcher from "../../../components/LanguageSwitcher";
import Portal from "../../../components/Portal";

const getPageInfo = (path: string) => {
  if (path.includes("overview")) return { label: "Overview", icon: LayoutDashboard };
  if (path.includes("appointments")) return { label: "Appointments", icon: CalendarIcon };
  if (path.includes("medical-records")) return { label: "Medical Records", icon: FileText };
  if (path.includes("medications")) return { label: "Medications", icon: Pill };
  if (path.includes("timeline")) return { label: "Timeline", icon: Activity };
  if (path.includes("diet-plan")) return { label: "Diet Plan", icon: Salad };
  if (path.includes("health-report")) return { label: "Health Report", icon: Brain };
  if (path.includes("messages")) return { label: "Messages", icon: Mail };
  if (path.includes("symptom-checker")) return { label: "Symptom Checker", icon: Stethoscope };
  return { label: "Dashboard", icon: LayoutDashboard };
};

/** Format current date as DD-MM-YYYY */
function todayFormatted(): string {
  const now = new Date();
  const dd   = String(now.getDate()).padStart(2, "0");
  const mm   = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/** Format current time as HH:MM AM/PM */
function nowTime(): string {
  return new Date().toLocaleString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

export default function PatientTopbar() {
  const pathname = usePathname();
  const {
    profile, messages, showMessages, setShowMessages,
    setShowCalendar, setShowSettings,
    markOneRead, markAllRead, formatDate,
    scheduled,
  } = usePatient();

  const page = getPageInfo(pathname);
  const PageIcon = page.icon;

  return (
    <header
      className="px-8 py-4 flex items-center justify-between shrink-0 border-b z-10 relative"
      style={{
        background: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderColor: "rgba(209, 250, 229, 0.5)",
      }}
    >
      {/* Left: page title */}
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #10B981, #06B6D4)" }}
        >
          <PageIcon size={15} className="text-white" />
        </div>
        <span className="text-lg font-black tracking-tight" style={{ color: "#064E3B" }}>{page.label}</span>
      </div>

      {/* Right: date chip + calendar + notifications + avatar */}
      <div className="flex items-center gap-3">
        {/* Current date chip */}
        <div
          className="hidden md:flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
          style={{ background: "#F0FDF4", border: "1px solid #D1FAE5", color: "#065F46" }}
        >
          <CalendarIcon size={14} style={{ color: "#10B981" }} />
          <span>{todayFormatted()}</span>
          <span style={{ color: "#A7F3D0" }}>·</span>
          <span className="font-bold" style={{ color: "#10B981" }}>{nowTime()}</span>
        </div>

        <LanguageSwitcher />

        {/* Calendar icon button */}
        <button
          onClick={() => setShowCalendar(true)}
          className="w-10 h-10 bg-white rounded-full flex items-center justify-center transition-all duration-200 relative card-hover"
          style={{ border: "1px solid #D1FAE5", color: "#6B7280" }}
          onMouseEnter={e => { e.currentTarget.style.background = "#F0FDF4"; e.currentTarget.style.color = "#10B981"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#FFFFFF"; e.currentTarget.style.color = "#6B7280"; }}
        >
          <CalendarIcon size={18} />
          {scheduled.length > 0 && (
            <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: "#10B981" }} />
          )}
        </button>

        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setShowMessages(!showMessages)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white relative shadow-md transition-all duration-200"
            style={{ background: "linear-gradient(135deg, #10B981, #06B6D4)", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)" }}
          >
            <Mail size={18} />
            <span
              className="absolute -top-0.5 -right-0.5 w-4 h-4 border-2 border-white rounded-full text-[8px] font-bold flex items-center justify-center text-white"
              style={{ background: "#F97316" }}
            >
              {messages.filter((m: any) => m.isNew).length}
            </span>
          </button>
          <AnimatePresence>
            {showMessages && (
              <Portal>
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="fixed top-[76px] right-24 w-80 glass rounded-3xl shadow-2xl p-4 z-[9999]"
                  style={{ border: "1px solid rgba(209, 250, 229, 0.5)" }}
                >
                  <div className="flex items-center justify-between mb-4 px-2">
                    <h4 className="font-bold" style={{ color: "#064E3B" }}>Messages & Notifications</h4>
                    <button onClick={() => markAllRead()} className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#10B981" }}>Mark All Read</button>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                    {messages.map((m: any) => (
                      <div
                        key={m.id}
                        onClick={() => markOneRead(m)}
                        className="p-3 rounded-2xl border transition-all cursor-pointer card-hover"
                        style={m.isNew
                          ? { background: "#F0FDF4", borderColor: "#D1FAE5" }
                          : { background: "#F8FAFC", borderColor: "#E5E7EB", opacity: 0.75 }
                        }
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                            style={m.type === "appointment"
                              ? { background: "#D1FAE5", color: "#059669" }
                              : { background: "#EDE9FE", color: "#7C3AED" }
                            }
                          >
                            {m.type === "appointment" ? <CalendarIcon size={14} /> : <Pill size={14} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold leading-normal" style={{ color: "#0F172A" }}>{m.text}</p>
                            <span className="text-[10px] font-medium mt-1 inline-block" style={{ color: "#94A3B8" }}>{formatDate(m.date)}</span>
                          </div>
                          {m.isNew && <div className="w-2 h-2 rounded-full mt-1" style={{ background: "#F97316" }} />}
                        </div>
                      </div>
                    ))}
                    {messages.length === 0 && (
                      <p className="text-center text-xs py-6 font-medium" style={{ color: "#94A3B8" }}>No new notifications</p>
                    )}
                  </div>
                </motion.div>
              </Portal>
            )}
          </AnimatePresence>
        </div>

        {/* Avatar */}
        <button
          onClick={() => setShowSettings(true)}
          className="w-10 h-10 rounded-full border-2 border-white shadow-md ml-1 flex items-center justify-center text-white font-bold text-sm hover:scale-110 transition-transform overflow-hidden"
          style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}
        >
          {profile.profilePicture ? (
            <img src={profile.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            profile.name?.[0]?.toUpperCase() || "P"
          )}
        </button>
      </div>
    </header>
  );
}
