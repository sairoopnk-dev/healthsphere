"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const API = "http://localhost:8000";

// ── Helper: calculate age from DOB ──
function calcAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ── DD-MM-YYYY date formatter (used everywhere) ──
function formatDate(d: string | Date | null | undefined) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return typeof d === "string" ? d : "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

const MOCK_MEDS = [
  { name: "Amoxicillin 500mg", dose: "1 pill every 8 hours", condition: "Infection" },
  { name: "Vitamin D3 2000IU", dose: "1 capsule daily", condition: "Deficiency" },
  { name: "Paracetamol 650mg", dose: "As needed (max 4/day)", condition: "Pain relief" }
];

const CITY_DATA: Record<string, { hospitals: string[]; doctors: string[]; slots: {label: string; day: number}[] }> = {
  "Mumbai": { hospitals: ["Lilavati Hospital","Hinduja Hospital","Kokilaben Hospital","Breach Candy"], doctors: ["Dr. Aditi Verma (Cardiology)","Dr. Sameer Deshmukh (General)"], slots: [{label:"09:00 AM - Nov 2",day:2}] },
  "Delhi": { hospitals: ["AIIMS Delhi","Fortis Hospital","Apollo Delhi"], doctors: ["Dr. Neha Reddy (Pediatrics)"], slots: [{label:"10:00 AM - Nov 3",day:3}] },
};

interface PatientContextType {
  // Profile
  profile: any;
  setProfile: (p: any) => void;
  // Timeline / Medical Records
  timeline: any[];
  setTimeline: (t: any) => void;
  // Messages
  messages: any[];
  setMessages: (m: any) => void;
  showMessages: boolean;
  setShowMessages: (b: boolean) => void;
  // Appointments
  appointments: any[];
  setAppointments: (a: any) => void;
  upcomingAppointments: any[];
  pastAppointments: any[];
  appointmentsLoading: boolean;
  // Modals
  showSettings: boolean;
  setShowSettings: (b: boolean) => void;
  showAppt: boolean;
  setShowAppt: (b: boolean) => void;
  showCalendar: boolean;
  setShowCalendar: (b: boolean) => void;
  showRecord: any;
  setShowRecord: (r: any) => void;
  showLogoutModal: boolean;
  setShowLogoutModal: (b: boolean) => void;
  // AI Summarizer
  summarizingId: string | null;
  summaryError: string | null;
  setSummaryError: (e: string | null) => void;
  expandedSummary: string | null;
  setExpandedSummary: (s: string | null) => void;
  handleSummarize: (recordId: string) => Promise<void>;
  // Booking form
  apptStep: number;
  setApptStep: (n: number) => void;
  city: string;
  setCity: (c: string) => void;
  hospital: string;
  setHospital: (h: string) => void;
  doctor: string;
  setDoctor: (d: string) => void;
  slot: {label:string;day:number} | null;
  setSlot: (s: any) => void;
  scheduled: number[];
  setScheduled: (s: any) => void;
  scheduledPast: number[];
  liveDoctors: any[];
  selectedDoc: any;
  setSelectedDoc: (d: any) => void;
  apptDate: string;
  setApptDate: (d: string) => void;
  availableSlots: string[];
  setAvailableSlots: (s: string[]) => void;
  selectedSlot: string;
  setSelectedSlot: (s: string) => void;
  bookingLoading: boolean;
  bookingError: string;
  setBookingError: (e: string) => void;
  slotLoading: boolean;
  // Edit profile fields
  editName: string; setEditName: (v: string) => void;
  editPhone: string; setEditPhone: (v: string) => void;
  editEmail: string; setEditEmail: (v: string) => void;
  editAddress: string; setEditAddress: (v: string) => void;
  editEmergencyName: string; setEditEmergencyName: (v: string) => void;
  editEmergencyPhone: string; setEditEmergencyPhone: (v: string) => void;
  editDob: string; setEditDob: (v: string) => void;
  editGender: string; setEditGender: (v: string) => void;
  editHeight: string; setEditHeight: (v: string) => void;
  editWeight: string; setEditWeight: (v: string) => void;
  editBloodGroup: string; setEditBloodGroup: (v: string) => void;
  editProfilePicture: string; setEditProfilePicture: (v: string) => void;
  editSaving: boolean; setEditSaving: (b: boolean) => void;
  // Handlers
  handleLogout: () => void;
  confirmLogout: () => void;
  openAppt: () => void;
  fetchSlots: (docId: string, date: string) => Promise<void>;
  confirmAppt: () => Promise<void>;
  refreshAppointments: () => Promise<void>;
  markOneRead: (msg: any) => void;
  markAllRead: () => void;
  // Helpers
  formatDate: (d: string | Date | null | undefined) => string;
  calcAge: (dob: string) => number | null;
  MOCK_MEDS: typeof MOCK_MEDS;
  CITY_DATA: typeof CITY_DATA;
  today: Date;
}

const PatientContext = createContext<PatientContextType | null>(null);

export function usePatient() {
  const ctx = useContext(PatientContext);
  if (!ctx) throw new Error("usePatient must be used inside <PatientProvider>");
  return ctx;
}

export function PatientProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  // ── State ──
  const [profile, setProfile] = useState<any>({ name:"Loading...", id:"...", bloodGroup:"-", dob:"", gender:"-", email:"...", contactNumber:"-", address: "...", emergencyContact: { name: "...", phone: "..." } });
  const [timeline, setTimeline] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [showMessages, setShowMessages] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [pastAppointments, setPastAppointments] = useState<any[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [showAppt, setShowAppt] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showRecord, setShowRecord] = useState<any>(null);

  // AI Summarizer
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null);
  const [apptStep, setApptStep] = useState(1);

  // Appointment form
  const [city, setCity] = useState("");
  const [hospital, setHospital] = useState("");
  const [doctor, setDoctor] = useState("");
  const [slot, setSlot] = useState<{label:string;day:number}|null>(null);
  const [scheduled, setScheduled] = useState<number[]>([]);
  const [scheduledPast, setScheduledPast] = useState<number[]>([]);
  const [liveDoctors, setLiveDoctors] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [apptDate, setApptDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [slotLoading, setSlotLoading] = useState(false);

  // Edit profile
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editEmergencyName, setEditEmergencyName] = useState("");
  const [editEmergencyPhone, setEditEmergencyPhone] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editHeight, setEditHeight] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editBloodGroup, setEditBloodGroup] = useState("");
  const [editProfilePicture, setEditProfilePicture] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const today = new Date(); today.setHours(0, 0, 0, 0); // kept for context consumers


  // ── AI Summarize handler ──
  const handleSummarize = async (recordId: string) => {
    setSummarizingId(recordId);
    setSummaryError(null);
    try {
      const res = await fetch(`${API}/api/medical-records/summarize/${recordId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Summarization failed");
      setTimeline((prev: any[]) => prev.map(item =>
        (item._id === recordId || item._id?.toString() === recordId)
          ? { ...item, aiSummary: data.aiSummary, summaryGeneratedAt: data.summaryGeneratedAt }
          : item
      ));
      setExpandedSummary(recordId);
    } catch (err: any) {
      setSummaryError(err.message);
    } finally {
      setSummarizingId(null);
    }
  };

  const [currentUser, setCurrentUser] = useState<any>(null);

  // ── Data fetching ──
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (userAuth) => {
      if (!userAuth) {
        router.push("/login");
        return;
      }
      setCurrentUser(userAuth);

      const userStr = localStorage.getItem("user");
      if (!userStr) { router.push("/login"); return; }
      const user = JSON.parse(userStr);

      if (!user.isProfileCompleted) { router.push("/patient/setup-profile"); return; }

      const patientId = user.id || user.patientId;
    setEditName(user.name || "");

    // ── 1) Fetch dashboard (profile + timeline) ──
    fetch(`${API}/api/patients/${patientId}/dashboard`)
      .then(r => r.json())
      .then(data => {
        if (data.profile) {
          setProfile({ ...data.profile, id: data.profile.patientId });
          setEditName(data.profile.name);
          setEditPhone(data.profile.contactNumber || "");
          setEditEmail(data.profile.email || "");
          setEditAddress(data.profile.address || "");
          setEditEmergencyName(data.profile.emergencyContact?.name || "");
          setEditEmergencyPhone(data.profile.emergencyContact?.phone || "");
          setEditDob(data.profile.dob || "");
          setEditGender(data.profile.gender || "");
          setEditHeight(data.profile.height ? String(data.profile.height) : "");
          setEditWeight(data.profile.weight ? String(data.profile.weight) : "");
          setEditBloodGroup(data.profile.bloodGroup || "");
          setEditProfilePicture(data.profile.profilePicture || "");
        }
        const tl = data.timeline?.length ? data.timeline : [];
        setTimeline(tl);

        // Merge AI summaries + recordType from medical records (enables Prescriptions/Reports tabs)
        if (patientId) {
          fetch(`${API}/api/medical-records/patient/${patientId}`)
            .then(r => r.json())
            .then(rec => {
              if (rec.success && rec.records?.length) {
                setTimeline((prev: any[]) => prev.map(item => {
                  const match = rec.records.find((r: any) => r._id === item._id || r._id?.toString() === item._id?.toString());
                  return match
                    ? { ...item, aiSummary: match.aiSummary, summaryGeneratedAt: match.summaryGeneratedAt, recordType: match.recordType }
                    : item;
                }));
              }
            })
            .catch(() => {});
        }

        // NOTE: Do NOT set scheduled/scheduledPast here using date-only comparison.
        // The dedicated appointment endpoint below handles calendar dots with full
        // datetime comparison (date + timeSlot) for accurate past vs upcoming.

        // Messages from notifications
        fetch(`${API}/api/notifications/${patientId}`)
          .then(r => r.json())
          .then(nd => {
            if (nd.success && nd.notifications?.length) {
              setMessages(nd.notifications.filter((n: any) => !n.isRead).map((n: any) => ({
                _id: n._id, id: n._id, type: n.type, text: n.text,
                date: n.date || n.createdAt?.slice(0,10), isNew: true,
              })));
            } else {
              const seedMsgs: any[] = [];
              if (data.appointments?.length) {
                data.appointments.slice(0,2).forEach((a: any) => {
                  seedMsgs.push({ type:'appointment', text:`Reminder: Appointment with ${a.doctorName} on ${formatDate(a.date)} at ${a.timeSlot}`, date: a.date });
                });
              }
              seedMsgs.forEach(msg => {
                fetch(`${API}/api/notifications`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ patientId, ...msg }),
                }).catch(() => {});
              });
              setMessages(seedMsgs.map((m, i) => ({ ...m, id: `seed-${i}`, isNew: true })));
            }
          })
          .catch(() => {});
      })
      .catch(() => {
        setProfile({ name:user.name||"Patient", id:patientId, email:user.email, bloodGroup:"", dob:"", gender:"", contactNumber:"N/A", address:"N/A", emergencyContact:{name:"N/A",phone:"N/A"} });
        setEditName(user.name||"");
        setEditEmail(user.email||"");
        setMessages([{ id: 1, type: "appointment", text: "Reminder: Your upcoming appointment.", date: "Today", isNew: true }]);
      });

    // ── 2) Fetch ALL appointments for this patient from dedicated endpoint ──
    setAppointmentsLoading(true);
    fetch(`${API}/api/appointments/patient/${patientId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const upcoming = data.upcomingAppointments || [];
          const past     = data.pastAppointments     || [];
          setUpcomingAppointments(upcoming);
          setPastAppointments(past);
          setAppointments([...upcoming, ...past]);

          // Calendar: use full datetime (date + timeSlot) for accurate past vs upcoming
          // e.g. now = 6 PM, appt at 2 PM same day → GREY (past); appt at 8 PM → GREEN (upcoming)
          const now = Date.now();
          function apptMs(a: any): number {
            const match = (a.timeSlot || '').match(/(\d+):(\d+)\s*(AM|PM)/i);
            let h = 0, m = 0;
            if (match) {
              h = parseInt(match[1], 10);
              m = parseInt(match[2], 10);
              if (match[3].toUpperCase() === 'PM' && h !== 12) h += 12;
              if (match[3].toUpperCase() === 'AM' && h === 12) h = 0;
            }
            return new Date(`${a.date}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`).getTime();
          }
          const curMonth = new Date().getMonth();
          const curYear  = new Date().getFullYear();
          const inCurMonth = (a: any) => { const d = new Date(a.date); return d.getMonth() === curMonth && d.getFullYear() === curYear; };

          // GREEN dots: only appointments whose full datetime is in the future
          setScheduled(
            upcoming
              .filter((a: any) => apptMs(a) >= now)
              .filter(inCurMonth)
              .map((a: any) => new Date(a.date).getDate())
          );
          // GREY dots: completed/cancelled appointments + upcoming appointments whose time has passed
          const pastDays = past
            .filter(inCurMonth)
            .map((a: any) => new Date(a.date).getDate());
          const upcomingPastTimeDays = upcoming
            .filter((a: any) => apptMs(a) < now)
            .filter(inCurMonth)
            .map((a: any) => new Date(a.date).getDate());
          setScheduledPast([...new Set([...pastDays, ...upcomingPastTimeDays])]);
        }
      })
      .catch(() => {})
      .finally(() => setAppointmentsLoading(false));

    // ── 3) Fetch all doctors for booking modal ──
    fetch(`${API}/api/doctor/all`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setLiveDoctors(data); })
      .catch(() => {});
      
    });
    return () => unsubscribe();
  }, [router]);

  // ── Handlers ──
  const handleLogout = () => setShowLogoutModal(true);
  const confirmLogout = async () => { 
    try {
      await signOut(auth);
      localStorage.clear(); 
      router.push("/login"); 
    } catch (err: any) {
      console.error("Logout error:", err.message);
    }
  };

  const openAppt = () => {
    setApptStep(1); setCity(""); setHospital(""); setDoctor(""); setSlot(null);
    setSelectedDoc(null); setApptDate(""); setAvailableSlots([]); setSelectedSlot("");
    setBookingError("");
    setShowAppt(true);
  };

  const fetchSlots = async (docId: string, date: string) => {
    if (!docId || !date) return;
    setSlotLoading(true);
    try {
      const res = await fetch(`${API}/api/doctor/slots?doctorId=${docId}&date=${date}`);
      const data = await res.json();
      setAvailableSlots(data.blocked ? [] : (data.slots || []));
    } catch { setAvailableSlots([]); }
    finally { setSlotLoading(false); }
  };

  const refreshAppointments = async () => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return;
    const user = JSON.parse(userStr);
    try {
      const apptRes = await fetch(`${API}/api/appointments/patient/${user.id}`);
      const apptData = await apptRes.json();
      if (apptData.success) {
        const upcoming = apptData.upcomingAppointments || [];
        const past     = apptData.pastAppointments     || [];
        setUpcomingAppointments(upcoming);
        setPastAppointments(past);
        setAppointments([...upcoming, ...past]);
        const now2 = Date.now();
        function apptMs2(a: any): number {
          const match = (a.timeSlot || '').match(/(\d+):(\d+)\s*(AM|PM)/i);
          let h = 0, m = 0;
          if (match) {
            h = parseInt(match[1], 10);
            m = parseInt(match[2], 10);
            if (match[3].toUpperCase() === 'PM' && h !== 12) h += 12;
            if (match[3].toUpperCase() === 'AM' && h === 12) h = 0;
          }
          return new Date(`${a.date}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`).getTime();
        }
        const cm = new Date().getMonth(), cy = new Date().getFullYear();
        const inCM = (a: any) => { const d = new Date(a.date); return d.getMonth() === cm && d.getFullYear() === cy; };
        // GREEN dots: only future-time appointments
        setScheduled(
          upcoming
            .filter((a: any) => apptMs2(a) >= now2)
            .filter(inCM)
            .map((a: any) => new Date(a.date).getDate())
        );
        // GREY dots: completed/cancelled + past-time upcoming
        const pastD = past.filter(inCM).map((a: any) => new Date(a.date).getDate());
        const upPastD = upcoming.filter((a: any) => apptMs2(a) < now2).filter(inCM).map((a: any) => new Date(a.date).getDate());
        setScheduledPast([...new Set([...pastD, ...upPastD])]);
      }
    } catch (err) {
      console.error("Failed to refresh appointments", err);
    }
  };

  const confirmAppt = async () => {
    if (!selectedDoc || !apptDate || !selectedSlot) return;
    const userStr = localStorage.getItem("user");
    if (!userStr) return;
    const user = JSON.parse(userStr);
    setBookingLoading(true); setBookingError("");
    try {
      const res = await fetch(`${API}/api/doctor/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: user.id, patientName: user.name,
          patientEmail: user.email || localStorage.getItem("userEmail") || "",
          doctorId: selectedDoc.doctorId, doctorName: selectedDoc.name,
          hospital: selectedDoc.hospital, date: apptDate, timeSlot: selectedSlot
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Re-fetch appointments from DB to ensure persistence
      await refreshAppointments();

      setMessages((prev: any[]) => [{ id: Date.now(), type:"appointment", text:`Appointment booked with ${selectedDoc.name} on ${formatDate(apptDate)} at ${selectedSlot}`, date:"Just Now", isNew:true }, ...prev]);
      setApptStep(2);
    } catch (err: any) { setBookingError(err.message); }
    finally { setBookingLoading(false); }
  };

  const markOneRead = async (msg: any) => {
    setMessages((prev: any[]) => prev.filter(m => m.id !== msg.id));
    if (msg._id) {
      fetch(`${API}/api/notifications/${msg._id}/read`, { method: 'PUT' }).catch(() => {});
    }
  };

  const markAllRead = async () => {
    const userStr = localStorage.getItem("user");
    const patientId = userStr ? JSON.parse(userStr).id : null;
    setMessages([]);
    if (patientId) {
      fetch(`${API}/api/notifications/${patientId}/read-all`, { method: 'PUT' }).catch(() => {});
    }
  };

  return (
    <PatientContext.Provider value={{
      profile, setProfile, timeline, setTimeline, messages, setMessages,
      showMessages, setShowMessages, appointments, setAppointments,
      upcomingAppointments, pastAppointments, appointmentsLoading,
      showSettings, setShowSettings, showAppt, setShowAppt,
      showCalendar, setShowCalendar, showRecord, setShowRecord,
      showLogoutModal, setShowLogoutModal,
      summarizingId, summaryError, setSummaryError,
      expandedSummary, setExpandedSummary, handleSummarize,
      apptStep, setApptStep, city, setCity, hospital, setHospital,
      doctor, setDoctor, slot, setSlot, scheduled, setScheduled, scheduledPast,
      liveDoctors, selectedDoc, setSelectedDoc, apptDate, setApptDate,
      availableSlots, setAvailableSlots, selectedSlot, setSelectedSlot,
      bookingLoading, bookingError, setBookingError, slotLoading,
      editName, setEditName, editPhone, setEditPhone,
      editEmail, setEditEmail, editAddress, setEditAddress,
      editEmergencyName, setEditEmergencyName, editEmergencyPhone, setEditEmergencyPhone,
      editDob, setEditDob, editGender, setEditGender,
      editHeight, setEditHeight, editWeight, setEditWeight,
      editBloodGroup, setEditBloodGroup, editProfilePicture, setEditProfilePicture,
      editSaving, setEditSaving,
      handleLogout, confirmLogout, openAppt, fetchSlots, confirmAppt,
      markOneRead, markAllRead, refreshAppointments, formatDate, calcAge, MOCK_MEDS, CITY_DATA, today,
    }}>
      {children}
    </PatientContext.Provider>
  );
}
