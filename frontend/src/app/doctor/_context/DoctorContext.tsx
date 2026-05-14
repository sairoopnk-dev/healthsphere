"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Toast, { ToastType } from "@/components/ui/Toast";

const API = "http://localhost:8000";
const SLOT_TIMES = [
  "09:00 AM","09:30 AM",
  "10:00 AM","10:30 AM",
  "11:00 AM","11:30 AM",
  "12:00 PM","12:30 PM",
  "01:00 PM","01:30 PM",
  "02:00 PM","02:30 PM",
  "03:00 PM","03:30 PM",
  "04:00 PM","04:30 PM",
  "05:00 PM","05:30 PM",
  "06:00 PM","06:30 PM",
  "07:00 PM","07:30 PM",
  "08:00 PM","08:30 PM",
  "09:00 PM",
];

function getWeekDates(offset = 0) {
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay() + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function formatDate(d: any) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return typeof d === "string" ? d : "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

interface DoctorContextType {
  doctor: any;
  doctorProfile: any;
  // Schedule
  weekOffset: number; setWeekOffset: (v: any) => void;
  weekDates: Date[];
  appointments: any[];
  activeSlot: string | null; setActiveSlot: (v: string | null) => void;
  blockedDates: string[];
  leaveMode: boolean; setLeaveMode: (v: boolean) => void;
  toggleBlock: (date: string) => Promise<void>;
  getSlotsForDay: (date: Date) => any[];
  isExpiredSlot: (date: Date, slot: string) => boolean;
  totalApptThisWeek: number;
  // Availability (partial slot blocking)
  availabilityMap: Record<string, { fullDayBlocked: boolean; blockedSlots: string[] }>;
  updateAvailability: (date: string, fullDayBlocked: boolean, blockedSlots: string[]) => Promise<void>;
  fetchAvailability: (from: string, to: string) => Promise<void>;
  selectedLeaveDate: string; setSelectedLeaveDate: (v: string) => void;
  // Patient access
  searchId: string; setSearchId: (v: string) => void;
  otp: string[]; setOtp: (v: string[]) => void;
  accessStep: "search" | "otp" | "view"; setAccessStep: (v: any) => void;
  accessError: string; setAccessError: (v: string) => void;
  accessLoading: boolean;
  patientData: any; setPatientData: (v: any) => void;
  patientTimeline: any[]; setPatientTimeline: (v: any) => void;
  savedPatients: any[]; setSavedPatients: (v: any) => void;
  fetchSavedPatients: () => Promise<void>;
  handleAddSavedPatient: (pid: string) => Promise<void>;
  openPatientRecords: (pid: string) => Promise<void>;
  handleSearch: (e: React.FormEvent) => Promise<void>;
  handleVerify: (e: React.FormEvent) => Promise<void>;
  // Add Record
  showAddRecord: boolean; setShowAddRecord: (v: boolean) => void;
  newRecord: any; setNewRecord: (v: any) => void;
  uploading: boolean;
  attachedFiles: File[]; setAttachedFiles: (v: any) => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
  handleAddRecord: () => Promise<void>;
  // Prescription builder
  rxTitle: string; setRxTitle: (v: string) => void;
  rxNotes: string; setRxNotes: (v: string) => void;
  rxMeds: any[]; setRxMeds: (v: any) => void;
  addMed: () => void;
  removeMed: (i: number) => void;
  updateMed: (i: number, field: string, val: string) => void;
  emptyMed: any;
  // Helpers
  handleLogout: () => void;
  formatDate: (d: any) => string;
  toYMD: (d: Date) => string;
  today: string;
  dayNames: string[];
  SLOT_TIMES: string[];
  API: string;
  // Toast
  showToast: (msg: string, type?: ToastType) => void;
  // Hospital membership (doctor-hospital onboarding)
  updateHospitalMembership: (hospitalId: string, doctorRole: "ADMIN" | "DOCTOR") => void;
}

const DoctorContext = createContext<DoctorContextType | null>(null);

export function useDoctor() {
  const ctx = useContext(DoctorContext);
  if (!ctx) throw new Error("useDoctor must be used inside <DoctorProvider>");
  return ctx;
}

export function DoctorProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [doctor, setDoctor] = useState<any>(null);
  const [doctorProfile, setDoctorProfile] = useState<any>(null);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const showToast = useCallback((message: string, type: ToastType = "success") => {
    setToast({ message, type });
  }, []);

  // Schedule
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [leaveMode, setLeaveMode] = useState(false);

  // Availability (partial slot blocking)
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, { fullDayBlocked: boolean; blockedSlots: string[] }>>({});
  const [selectedLeaveDate, setSelectedLeaveDate] = useState<string>("");

  // Patient access
  const [searchId, setSearchId] = useState("");
  const [otp, setOtp] = useState(["","","","","",""]);
  const [accessStep, setAccessStep] = useState<"search"|"otp"|"view">("search");
  const [accessError, setAccessError] = useState("");
  const [accessLoading, setAccessLoading] = useState(false);
  const [patientData, setPatientData] = useState<any>(null);
  const [patientTimeline, setPatientTimeline] = useState<any[]>([]);
  const [savedPatients, setSavedPatients] = useState<any[]>([]);

  // Add Record
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [newRecord, setNewRecord] = useState({ type: "prescription", title: "", description: "" });
  const [uploading, setUploading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Prescription builder
  const emptyMed = { medicineName: "", type: "tablet", dosage: "", frequency: "", instructions: "", durationDays: "" };
  const [rxTitle, setRxTitle] = useState("");
  const [rxNotes, setRxNotes] = useState("");
  const [rxMeds, setRxMeds] = useState([{ ...emptyMed }]);
  const addMed = () => setRxMeds((prev: any[]) => [...prev, { ...emptyMed }]);
  const removeMed = (i: number) => setRxMeds((prev: any[]) => prev.filter((_: any, idx: number) => idx !== i));
  const updateMed = (i: number, field: string, val: string) =>
    setRxMeds((prev: any[]) => prev.map((m: any, idx: number) => idx === i ? { ...m, [field]: val } : m));

  const todayStr = toYMD(new Date());
  const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const fetchSchedule = useCallback(async (doctorId: string, offset = 0) => {
    try {
      const res = await fetch(`${API}/api/doctor/schedule/${doctorId}?weekOffset=${offset}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      console.log("[Schedule] fetched appointments:", list.length, "for weekOffset:", offset);
      setAppointments(list);
    } catch {}
  }, []);

  const fetchProfile = useCallback(async (doctorId: string) => {
    try {
      const res = await fetch(`${API}/api/doctor/profile/${doctorId}`);
      const data = await res.json();
      setDoctorProfile(data);
      if (data.blockedDates) setBlockedDates(data.blockedDates);
    } catch {}
  }, []);

  const fetchAvailability = useCallback(async (from: string, to: string) => {
    if (!doctor) return;
    try {
      const res = await fetch(`${API}/api/doctor/availability?doctorId=${doctor.id}&from=${from}&to=${to}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const map: Record<string, { fullDayBlocked: boolean; blockedSlots: string[] }> = {};
        data.forEach((entry: any) => {
          map[entry.date] = { fullDayBlocked: entry.fullDayBlocked, blockedSlots: entry.blockedSlots || [] };
        });
        setAvailabilityMap(prev => ({ ...prev, ...map }));
      }
    } catch {}
  }, [doctor]);

  const updateAvailability = useCallback(async (date: string, fullDayBlocked: boolean, blockedSlots: string[]) => {
    if (!doctor) return;
    // Optimistic update
    setAvailabilityMap(prev => ({ ...prev, [date]: { fullDayBlocked, blockedSlots } }));
    // Sync blockedDates array for backward compat
    setBlockedDates(prev => {
      if (fullDayBlocked && !prev.includes(date)) return [...prev, date];
      if (!fullDayBlocked && prev.includes(date)) return prev.filter(d => d !== date);
      return prev;
    });
    await fetch(`${API}/api/doctor/availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctorId: doctor.id, date, fullDayBlocked, blockedSlots }),
    });
    // Refresh schedule so cancelled appointments disappear immediately
    await fetchSchedule(doctor.id, weekOffset);
  }, [doctor, weekOffset, fetchSchedule]);

  const fetchSavedPatients = useCallback(async () => {
    if (!doctor) return;
    try {
      const res = await fetch(`${API}/api/doctor/saved-patients/${doctor.id}`);
      const data = await res.json();
      if (res.ok) setSavedPatients(data);
    } catch {}
  }, [doctor]);

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (userAuth) => {
      if (userAuth) {
        setCurrentUser(userAuth);
        const user = JSON.parse(localStorage.getItem("user") || "null");
        if (!user || user.role !== "doctor") { router.push("/login"); return; }
        if (!user.isProfileCompleted) { router.push("/doctor/setup-profile"); return; }
        setDoctor(user);
        fetchSchedule(user.id);
        fetchProfile(user.id);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    setWeekDates(getWeekDates(weekOffset));
    if (doctor) {
      fetchSchedule(doctor.id, weekOffset);
      fetchSavedPatients();
      // Fetch availability for the current week
      const dates = getWeekDates(weekOffset);
      const from = toYMD(dates[0]);
      const to   = toYMD(dates[6]);
      fetchAvailability(from, to);
    }
  }, [weekOffset, doctor, fetchSavedPatients, fetchAvailability]);

  const toggleBlock = async (date: string) => {
    if (!doctor) return;
    const isBlocked = blockedDates.includes(date);
    const newFullDay = !isBlocked;
    // Keep existing partial slots if unblocking a full-day; reset if blocking full day
    const existing = availabilityMap[date];
    const slots = newFullDay ? [] : (existing?.blockedSlots ?? []);
    await updateAvailability(date, newFullDay, slots);
  };

  const getSlotsForDay = (date: Date) => appointments.filter(a => a.date === toYMD(date));

  const isExpiredSlot = (date: Date, slot: string) => {
    const [time, period] = slot.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    const dt = new Date(date); dt.setHours(h, m, 0, 0);
    return new Date() > dt;
  };

  const totalApptThisWeek = weekDates.reduce((acc, d) => acc + getSlotsForDay(d).length, 0);

  // Add new patient to doctor's list
  const handleAddSavedPatient = async (pid: string) => {
    if (!pid.trim()) return;
    setAccessLoading(true); setAccessError("");
    try {
      const res = await fetch(`${API}/api/doctor/saved-patients`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId: doctor.id, patientId: pid })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      await fetchSavedPatients(); // Refresh list
      setSearchId(""); // Clear input
      showToast("Patient added successfully!", "success");
    } catch (err: any) {
      setAccessError(err.message);
    } finally {
      setAccessLoading(false);
    }
  };

  // Open records directly
  const openPatientRecords = async (pid: string) => {
    setAccessLoading(true); setAccessError("");
    try {
      const res = await fetch(`${API}/api/doctor/search`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: pid })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      setPatientData(data.patient);
      const tlRes = await fetch(`${API}/api/appointments/patient/${pid}/timeline`);
      const tlData = await tlRes.json();
      setPatientTimeline(tlData.success && tlData.data?.length ? tlData.data : []);
      setAccessStep("view");
    } catch (err: any) {
      setAccessError(err.message);
    } finally {
      setAccessLoading(false);
    }
  };

  // Deprecated direct search, mapped to add patient logic for UI backward compatibility
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleAddSavedPatient(searchId);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    // This function is no longer needed since OTP verification is removed.
  };

  // Add record (prescription or other)
  const handleAddPrescription = async () => {
    if (!patientData || !doctor) return;
    if (!rxTitle.trim()) { showToast("Please enter a prescription title.", "error"); return; }
    const validMeds = rxMeds.filter((m: any) => m.medicineName && m.dosage && m.frequency && m.durationDays);
    if (validMeds.length === 0) { showToast("Please add at least one medicine with all required fields.", "error"); return; }
    setUploading(true);
    try {
      const rxRes = await fetch(`${API}/api/prescriptions/${patientData.patientId}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId: doctor.id, doctorName: doctor.name, prescriptionTitle: rxTitle, notes: rxNotes,
          medicines: validMeds.map((m: any) => ({ medicineName: m.medicineName, type: m.type, dosage: m.dosage, frequency: m.frequency, instructions: m.instructions, durationDays: Number(m.durationDays) })),
        }),
      });
      const rxData = await rxRes.json();
      if (!rxRes.ok) throw new Error(rxData.message);
      // Re-fetch the full merged timeline to stay in sync with patient view
      const tlRes2 = await fetch(`${API}/api/appointments/patient/${patientData.patientId}/timeline`);
      const tlData2 = await tlRes2.json();
      if (tlData2.success && tlData2.data) setPatientTimeline(tlData2.data);
      setShowAddRecord(false); setNewRecord({ type: "prescription", title: "", description: "" });
      setAttachedFiles([]); setRxTitle(""); setRxNotes(""); setRxMeds([{ ...emptyMed }]);
      showToast("Prescription created with duration tracking!", "success");
    } catch (err: any) { showToast(err.message, "error"); }
    finally { setUploading(false); }
  };

  const handleAddRecord = async () => {
    if (newRecord.type === "prescription") { await handleAddPrescription(); return; }
    if (!patientData || !doctor || !newRecord.title || !newRecord.description) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("patientId", patientData.patientId); fd.append("doctorId", doctor.id);
      fd.append("doctorName", doctor.name); fd.append("type", newRecord.type);
      fd.append("title", newRecord.title); fd.append("description", newRecord.description);
      fd.append("date", new Date().toISOString());
      attachedFiles.forEach(f => fd.append("attachments", f));
      const res = await fetch(`${API}/api/doctor/add-record`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      // Re-fetch the full merged timeline to stay in sync with patient view
      const tlRes3 = await fetch(`${API}/api/appointments/patient/${patientData.patientId}/timeline`);
      const tlData3 = await tlRes3.json();
      if (tlData3.success && tlData3.data) setPatientTimeline(tlData3.data);
      setShowAddRecord(false); setNewRecord({ type: "prescription", title: "", description: "" });
      setAttachedFiles([]);
      showToast("Record added successfully!", "success");
    } catch (err: any) { showToast(err.message, "error"); }
    finally { setUploading(false); }
  };

  const handleLogout = async () => { 
    try {
      await signOut(auth);
      localStorage.removeItem("user"); 
      router.push("/login"); 
    } catch (err: any) {
      console.error("Logout Error:", err.message);
    }
  };

  // ── Hospital membership setter (doctor-hospital onboarding) ──────────────
  // Writes through both in-memory doctor state and localStorage.user so the
  // Role_Toggle and Role_Router see the new hospitalId/doctorRole immediately
  // after hospital creation (design §Frontend / DoctorContext).
  const updateHospitalMembership = useCallback(
    (hospitalId: string, doctorRole: "ADMIN" | "DOCTOR") => {
      setDoctor((prev: any) => {
        const next = { ...(prev ?? {}), hospitalId, doctorRole };
        try {
          const stored = JSON.parse(localStorage.getItem("user") || "{}");
          localStorage.setItem(
            "user",
            JSON.stringify({ ...stored, hospitalId, doctorRole })
          );
        } catch {
          localStorage.setItem(
            "user",
            JSON.stringify({ ...next, role: "doctor" })
          );
        }
        return next;
      });
    },
    []
  );

  if (!doctor) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex items-center gap-3 text-blue-600 font-bold text-lg">
        <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/>
        Loading Dashboard...
      </div>
    </div>
  );

  return (
    <DoctorContext.Provider value={{
      doctor, doctorProfile,
      weekOffset, setWeekOffset, weekDates, appointments, activeSlot, setActiveSlot,
      blockedDates, leaveMode, setLeaveMode, toggleBlock, getSlotsForDay, isExpiredSlot, totalApptThisWeek,
      availabilityMap, updateAvailability, fetchAvailability, selectedLeaveDate, setSelectedLeaveDate,
      searchId, setSearchId, otp, setOtp, accessStep, setAccessStep, accessError, setAccessError,
      accessLoading, patientData, setPatientData, patientTimeline, setPatientTimeline,
      savedPatients, setSavedPatients, fetchSavedPatients, handleAddSavedPatient, openPatientRecords,
      handleSearch, handleVerify,
      showAddRecord, setShowAddRecord, newRecord, setNewRecord, uploading, attachedFiles, setAttachedFiles,
      fileRef, handleAddRecord,
      rxTitle, setRxTitle, rxNotes, setRxNotes, rxMeds, setRxMeds, addMed, removeMed, updateMed, emptyMed,
      handleLogout, formatDate, toYMD, today: todayStr, dayNames, SLOT_TIMES, API, showToast,
      updateHospitalMembership,
    }}>
      {children}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </DoctorContext.Provider>
  );
}
