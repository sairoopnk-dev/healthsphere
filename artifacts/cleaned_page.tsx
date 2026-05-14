"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserRound, Calendar as CalendarIcon, FileText, Pill, Settings, LogOut, Search, Bell, Mail, Eye, Edit2, Trash2, Activity, CheckCircle2, X, QrCode, MapPin, Building2, User, Clock, AlertCircle, Stethoscope, Sparkles, ChevronDown, ChevronUp, LayoutDashboard, Ruler, Weight, Droplets, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";


const MOCK_MEDS = [
  { name: "Amoxicillin 500mg", dose: "1 pill every 8 hours", condition: "Infection" },
  { name: "Vitamin D3 2000IU", dose: "1 capsule daily", condition: "Deficiency" },
  { name: "Paracetamol 650mg", dose: "As needed (max 4/day)", condition: "Pain relief" }
];



const CITY_DATA: Record<string, { hospitals: string[]; doctors: string[]; slots: {label: string; day: number}[] }> = {
  "Mumbai": {
    hospitals: ["Lilavati Hospital", "Hinduja Hospital", "Kokilaben Hospital", "Breach Candy"],
    doctors: ["Dr. Aditi Verma (Cardiology)", "Dr. Sameer Deshmukh (General)", "Dr. Rohan Malhotra (Orthopedics)", "Dr. Priya Iyer (Radiology)", "Dr. Arjun Kapoor (Neurology)"],
    slots: [{label:"09:00 AM - Nov 2",day:2},{label:"11:30 AM - Nov 2",day:2},{label:"03:00 PM - Nov 5",day:5}]
  },
  "Delhi": {
    hospitals: ["AIIMS Delhi", "Fortis Hospital", "Apollo Delhi", "Max Healthcare"],
    doctors: ["Dr. Neha Reddy (Pediatrics)", "Dr. Vikram Singh (Internal)", "Dr. Kavita Joshi (Gynecology)", "Dr. Rahul Saxena (Cardiology)", "Dr. Swati Kulkarni (ENT)"],
    slots: [{label:"10:00 AM - Nov 3",day:3},{label:"02:00 PM - Nov 4",day:4}]
  },
  "Bengaluru": {
    hospitals: ["Manipal Hospital", "Aster CMI", "Fortis Bengaluru", "Narayana Health"],
    doctors: ["Dr. Manoj Pillai (General)", "Dr. Anjali Nair (Pediatrics)", "Dr. Suresh Menon (Orthopedics)", "Dr. Divya Agarwal (Endocrinology)", "Dr. Manish Pandey (Ophthalmology)"],
    slots: [{label:"09:00 AM - Nov 10",day:10},{label:"12:00 PM - Nov 11",day:11}]
  },
  "Chennai": {
    hospitals: ["Apollo Chennai", "Fortis Malar", "MIOT International", "Global Hospital"],
    doctors: ["Dr. Pooja Bose (Oncology)", "Dr. Nitin Gadgil (Gastro)", "Dr. Ritu Sharma (Dermatology)", "Dr. Sandeep Rao (Urology)", "Dr. Isha Bhatt (Psychiatry)"],
    slots: [{label:"08:30 AM - Nov 6",day:6},{label:"01:00 PM - Nov 7",day:7}]
  },
  "Hyderabad": {
    hospitals: ["Apollo Hyderabad", "Yashoda Hospital", "CARE Hospitals", "KIMS"],
    doctors: ["Dr. Vishal Deshpande (Neurosurgery)", "Dr. Sunita Hegde (Pulmonary)", "Dr. Karthik Subramanian (Cardiac)", "Dr. Lakshmi Narayanan (Nephrology)", "Dr. Pradeep Chawla (General)"],
    slots: [{label:"09:00 AM - Nov 12",day:12},{label:"02:00 PM - Nov 13",day:13}]
  },
  "Kolkata": {
    hospitals: ["AMRI Hospital", "Apollo Gleneagles", "Fortis Kolkata", "Woodlands"],
    doctors: ["Dr. Meghna Sen (Rheumatology)", "Dr. Ravi Teja (Orthopedics)", "Dr. Shruti Iyer (Obstetrics)", "Dr. Akshay Patil (General Surgery)", "Dr. Sneha Rao (General Medicine)"],
    slots: [{label:"10:00 AM - Nov 14",day:14},{label:"03:00 PM - Nov 15",day:15}]
  },
  "Pune": {
    hospitals: ["Ruby Hall Clinic", "Jehangir Hospital", "Sahyadri Hospital", "Inlaks & Budhrani"],
    doctors: ["Dr. Harish Kumar (Cardiology)", "Dr. Jyoti Malhotra (Pathology)", "Dr. Varun Khanna (Pediatrics)", "Dr. Tanya Singhal (ENT)", "Dr. Abhishek Mehra (General)"],
    slots: [{label:"11:00 AM - Nov 16",day:16},{label:"04:00 PM - Nov 17",day:17}]
  },
  "Ahmedabad": {
    hospitals: ["Zydus Hospital", "Shalby Hospital", "Sterling Hospital", "HCG Hospital"],
    doctors: ["Dr. Karishma Shah (Dermatology)", "Dr. Sanjay Mehta (Cardiology)", "Dr. Rajeshwari Patel (Gynecology)", "Dr. Devang Jani (Orthopedics)", "Dr. Bhavesh Joshi (General)"],
    slots: [{label:"09:30 AM - Nov 18",day:18},{label:"01:30 PM - Nov 19",day:19}]
  }
};

// ── Helper: calculate age from DOB ──────────────────────────────────────────
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

// Helper to format date explicitly as dd-mm-yyyy
function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return typeof d === "string" ? d : "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export default function PatientDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab]           = useState("Overview");
  const [profile,   setProfile]             = useState<any>({ name:"Loading...", id:"...", bloodGroup:"-", dob:"", gender:"-", email:"...", contactNumber:"-", address: "...", emergencyContact: { name: "...", phone: "..." } });
  const [timeline,  setTimeline]            = useState<any[]>([]);
  const [messages,      setMessages]        = useState<any[]>([]);
  const [showMessages,  setShowMessages]    = useState(false);
  const [appointments,  setAppointments]    = useState<any[]>([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Modals
  const [showSettings,  setShowSettings]    = useState(false);
  const [showAppt,      setShowAppt]        = useState(false);
  const [showCalendar,  setShowCalendar]    = useState(false);
  const [showRecord,    setShowRecord]      = useState<any>(null);

  // AI Summarizer state
  const [summarizingId,  setSummarizingId]  = useState<string | null>(null);
  const [summaryError,   setSummaryError]   = useState<string | null>(null);
  const [expandedSummary,setExpandedSummary]= useState<string | null>(null);
  const [apptStep,      setApptStep]        = useState(1);

  // Appointment form (live)
  const [city,          setCity]         = useState("");
  const [hospital,      setHospital]     = useState("");
  const [doctor,        setDoctor]       = useState("");
  const [slot,          setSlot]         = useState<{label:string;day:number}|null>(null);
  const [scheduled,     setScheduled]    = useState<number[]>([]);
  const [liveDoctors,   setLiveDoctors]  = useState<any[]>([]);
  const [selectedDoc,   setSelectedDoc]  = useState<any>(null);
  const [apptDate,      setApptDate]     = useState("");
  const [availableSlots,setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot,  setSelectedSlot] = useState("");
  const [bookingLoading,setBookingLoading] = useState(false);
  const [bookingError,  setBookingError] = useState("");
  const [slotLoading,   setSlotLoading]  = useState(false);

  // Edit profile
  const [editName,  setEditName]  = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editEmergencyName, setEditEmergencyName] = useState("");
  const [editEmergencyPhone, setEditEmergencyPhone] = useState("");
  // New editable health fields
  const [editDob,        setEditDob]        = useState("");
  const [editGender,     setEditGender]     = useState("");
  const [editHeight,     setEditHeight]     = useState("");
  const [editWeight,     setEditWeight]     = useState("");
  const [editBloodGroup, setEditBloodGroup] = useState("");
  const [editProfilePicture, setEditProfilePicture] = useState("");
  const [editSaving,     setEditSaving]     = useState(false);

  // AI Summarize handler
  const handleSummarize = async (recordId: string) => {
    setSummarizingId(recordId);
    setSummaryError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/medical-records/summarize/${recordId}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Summarization failed");
      // Update the timeline item with the returned summary
      setTimeline(prev => prev.map(item =>
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

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) { router.push("/login"); return; }
    const user = JSON.parse(userStr);

    // ── First-login guard ──────────────────────────────────────────────────
    if (!user.isProfileCompleted) { router.push("/patient/setup-profile"); return; }

    const patientId = user.id || user.patientId;
    setEditName(user.name || "");

    fetch(`http://localhost:5000/api/patients/${patientId}/dashboard`)
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
          // Populate new health fields
          setEditDob(data.profile.dob || "");
          setEditGender(data.profile.gender || "");
          setEditHeight(data.profile.height ? String(data.profile.height) : "");
          setEditWeight(data.profile.weight ? String(data.profile.weight) : "");
          setEditBloodGroup(data.profile.bloodGroup || "");
          setEditProfilePicture(data.profile.profilePicture || "");
        }
        const tl = data.timeline?.length ? data.timeline : [];
        setTimeline(tl);
        if (patientId) {
          fetch(`http://localhost:5000/api/medical-records/patient/${patientId}`)
            .then(r => r.json())
            .then(rec => {
              if (rec.success && rec.records?.length) {
                setTimeline(prev => prev.map(item => {
                  const match = rec.records.find((r: any) => r._id === item._id || r._id?.toString() === item._id?.toString());
                  return match ? { ...item, aiSummary: match.aiSummary, summaryGeneratedAt: match.summaryGeneratedAt } : item;
                }));
              }
            })
            .catch(() => {});
        }
        if (data.appointments?.length) {
          setScheduled(data.appointments.map((a:any) => new Date(a.date).getDate()));
        }
        const newMsgs: any[] = [];
        if (data.appointments?.length) {
          data.appointments.slice(0,2).forEach((a:any, i:number) => {
            newMsgs.push({ id:`ap-${i}`, type:"appointment", text:`Reminder: Appointment with ${a.doctorName} on ${formatDate(a.date)} at ${a.timeSlot}`, date: a.date, isNew: true });
          });
        }
        if (data.timeline?.length) {
          data.timeline.slice(0,2).forEach((t:any, i:number) => {
            if (t.type === 'prescription') newMsgs.push({ id:`pr-${i}`, type:'prescription', text:`New Prescription: ${t.title}`, date: t.date?.slice(0,10), isNew: false });
          });
        }
        setMessages(newMsgs);

        // ── Fetch persistent notifications from DB ──────────────────────
        fetch(`http://localhost:5000/api/notifications/${patientId}`)
          .then(r => r.json())
          .then(nd => {
            if (nd.success && nd.notifications?.length) {
              setMessages(nd.notifications.filter((n: any) => !n.isRead).map((n: any) => ({
                _id: n._id,
                id: n._id,
                type: n.type,
                text: n.text,
                date: n.date || n.createdAt?.slice(0,10),
                isNew: true,
              })));
            } else {
              // Seed notifications from appointments if none exist
              const seedMsgs: any[] = [];
              if (data.appointments?.length) {
                data.appointments.slice(0,2).forEach((a:any) => {
                  seedMsgs.push({ type:'appointment', text:`Reminder: Appointment with ${a.doctorName} on ${a.date} at ${a.timeSlot}`, date: a.date });
                });
              }
              // Create them in DB
              seedMsgs.forEach(msg => {
                fetch('http://localhost:5000/api/notifications', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
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

    fetch("http://localhost:5000/api/doctor/all")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setLiveDoctors(data); })
      .catch(() => {});

    // Fetch real appointments filtered by current user
    fetch("http://localhost:5000/api/appointments")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const userName = localStorage.getItem("userName") || user.name || "";
          setAppointments(data.filter((a: any) => a.patientName === userName));
        }
      })
      .catch(() => {});
  }, [router]);

  const handleLogout = () => setShowLogoutModal(true);

  const confirmLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const cityOptions = [...new Set(liveDoctors.map((d: any) => d.hospital).filter(Boolean))];

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
      const res = await fetch(`http://localhost:5000/api/doctor/slots?doctorId=${docId}&date=${date}`);
      const data = await res.json();
      setAvailableSlots(data.blocked ? [] : (data.slots || []));
    } catch { setAvailableSlots([]); }
    finally { setSlotLoading(false); }
  };

  const confirmAppt = async () => {
    if (!selectedDoc || !apptDate || !selectedSlot) return;
    const userStr = localStorage.getItem("user");
    if (!userStr) return;
    const user = JSON.parse(userStr);
    setBookingLoading(true); setBookingError("");
    try {
      const res = await fetch("http://localhost:5000/api/doctor/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId:   user.id,
          patientName: user.name,
          doctorId:    selectedDoc.doctorId,
          doctorName:  selectedDoc.name,
          hospital:    selectedDoc.hospital,
          date:        apptDate,
          timeSlot:    selectedSlot
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setScheduled(prev => [...prev, new Date(apptDate).getDate()]);
      // Add locally to Appointments state
      setAppointments(prev => [{
        doctorType: selectedDoc.specialization,
        doctorName: selectedDoc.name,
        status: "Scheduled",
        symptoms: "Not provided",
        date: apptDate,
        timeSlot: selectedSlot,
        patientName: user.name
      }, ...prev]);
      // Add message notification
      setMessages(prev => [{ id: Date.now(), type:"appointment", text:`Appointment booked with ${selectedDoc.name} on ${apptDate} at ${selectedSlot}`, date:"Just Now", isNew:true }, ...prev]);
      setApptStep(2);
    } catch (err: any) { setBookingError(err.message); }
    finally { setBookingLoading(false); }
  };

  // ── Mark single notification read (persistent) ──────────────────────────────
  const markOneRead = async (msg: any) => {
    // Optimistic UI update: instantly hide read notification
    setMessages(prev => prev.filter(m => m.id !== msg.id));
    // Persist to DB if we have a real _id
    if (msg._id) {
      fetch(`http://localhost:5000/api/notifications/${msg._id}/read`, { method: 'PUT' }).catch(() => {});
    }
  };

  // ── Mark ALL notifications read (persistent) ─────────────────────────────────
  const markAllRead = async () => {
    const userStr = localStorage.getItem("user");
    const patientId = userStr ? JSON.parse(userStr).id : null;
    setMessages([]); // empty them instantly
    if (patientId) {
      fetch(`http://localhost:5000/api/notifications/${patientId}/read-all`, { method: 'PUT' }).catch(() => {});
    }
  };

  const NAV = [
    { name:"Overview",       icon:LayoutDashboard },
    { name:"Appointments",   icon:CalendarIcon },
    { name:"Medical Records",icon:FileText },
    { name:"Medications",    icon:Pill },
    { name:"Timeline",       icon:Activity },
    { name:"Messages",       icon:Mail }
  ];

  const navBtn = (item: {name:string;icon:any}) => {
    const isNewCount = item.name === "Messages" ? messages.filter(m => m.isNew).length : 0;
    return (
      <button key={item.name} onClick={() => setActiveTab(item.name)}
        className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-semibold text-left
          ${activeTab===item.name ? "bg-teal-50 text-teal-600 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}>
        <div className="relative">
          <item.icon size={20} className={activeTab===item.name ? "text-teal-500" : "text-slate-400"} />
          {isNewCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-orange-500 border-2 border-white rounded-full text-[8px] font-black flex items-center justify-center text-white">{isNewCount}</span>}
        </div>
        <span className="flex-1">{item.name}</span>
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" style={{fontFamily:"'Inter',sans-serif"}}>

      {/* ── Sidebar ── */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-2 border-b border-slate-100">
          <Activity className="text-teal-500" size={22}/>
          <span className="text-xl font-black text-teal-500 tracking-tight">HealthSphere</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {NAV.map(navBtn)}
        <div className="pt-3 mt-3 border-t border-slate-100 space-y-1">
            <Link href="/patient/medicine-reminders"
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-slate-500 hover:bg-orange-50 hover:text-orange-600 font-semibold text-left transition-all">
              <Pill size={20} className="text-orange-400" />
              <span className="flex-1">Medicine Reminders</span>
            </Link>
            <Link href="/patient/symptom-checker"
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold text-left hover:from-teal-600 hover:to-emerald-600 transition-all shadow-sm hover:shadow-md">
              <Stethoscope size={20} />
              <span className="flex-1">Check Symptoms</span>
            </Link>
          </div>
        </nav>
        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-3xl p-3 border border-slate-100 flex flex-col gap-3">
            <div className="flex items-center gap-3 px-1">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-sm font-black shadow-inner overflow-hidden">
                {profile.profilePicture ? (
                  <img src={profile.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  profile.name?.[0]?.toUpperCase() || "P"
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-800 truncate leading-tight">{profile.name}</p>
                <p className="text-[10px] font-bold text-teal-600 uppercase tracking-tighter mt-0.5">Patient Account</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setShowSettings(true)} className="flex-1 flex items-center justify-center py-2 bg-white rounded-xl border border-slate-200 text-slate-500 hover:border-teal-200 hover:text-teal-600 transition-all">
                <Settings size={16}/>
              </button>
              <button onClick={handleLogout} className="flex-1 flex items-center justify-center py-2 bg-white rounded-xl border border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-600 transition-all">
                <LogOut size={16}/>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Topbar */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6 flex-1">
            <div className="relative w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
              <input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 text-sm font-medium transition-all"/>
            </div>
            <div className="bg-white border border-slate-200 rounded-full px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hidden md:block">
              {new Date().toLocaleString("en-US",{hour:"2-digit",minute:"2-digit",hour12:true,month:"2-digit",day:"2-digit",year:"numeric"})}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowCalendar(true)} className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:bg-teal-50 hover:text-teal-600 transition-colors relative">
              <CalendarIcon size={18}/>
              {scheduled.length > 0 && <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-teal-400 border-2 border-white rounded-full"></span>}
            </button>
            <div className="relative">
              <button onClick={() => setShowMessages(!showMessages)} className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white hover:bg-teal-600 relative">
                <Mail size={18}/><span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-400 border-2 border-white rounded-full text-[8px] font-bold flex items-center justify-center text-white">{messages.filter(m => m.isNew).length}</span>
              </button>
              
              <AnimatePresence>
                {showMessages && (
                  <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:10}}
                    className="absolute right-0 mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 z-50">
                    <div className="flex items-center justify-between mb-4 px-2">
                      <h4 className="font-bold text-slate-800">Messages & Notifications</h4>
                      <button onClick={() => markAllRead()} className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">Mark All Read</button>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {messages.map(m => (
                        <div key={m.id} onClick={() => markOneRead(m)} className={`p-3 rounded-2xl border transition-all cursor-pointer ${m.isNew ? "bg-teal-50/50 border-teal-100 hover:bg-teal-50" : "bg-slate-50 border-slate-100 opacity-75"}`}>
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              m.type === "appointment" ? "bg-teal-100 text-teal-600" : "bg-purple-100 text-purple-600"
                            }`}>
                              {m.type === "appointment" ? <CalendarIcon size={14}/> : <Pill size={14}/>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-800 leading-normal">{m.text}</p>
                              <span className="text-[10px] text-slate-400 font-medium mt-1 inline-block">{formatDate(m.date)}</span>
                            </div>
                            {m.isNew && <div className="w-2 h-2 bg-orange-400 rounded-full mt-1"></div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button onClick={() => setShowSettings(true)} className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 border-2 border-white shadow-sm ml-1 flex items-center justify-center text-white font-bold text-sm hover:scale-110 transition-transform overflow-hidden">
              {profile.profilePicture ? (
                <img src={profile.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                profile.name?.[0]?.toUpperCase() || "P"
              )}
            </button>
          </div>
        </header>

        {/* Scrollable page */}
        <div className="flex-1 overflow-y-auto px-8 py-8">
          <h2 className="text-3xl font-black text-slate-800 mb-8 tracking-tight flex items-center gap-3">
            {activeTab === "Overview" && <LayoutDashboard size={28} className="text-teal-500" />}
            {activeTab === "Appointments" && <CalendarIcon size={28} className="text-teal-500" />}
            {activeTab === "Medical Records" && <FileText size={28} className="text-teal-500" />}
            {activeTab === "Medications" && <Pill size={28} className="text-teal-500" />}
            {activeTab === "Timeline" && <Activity size={28} className="text-teal-500" />}
            {activeTab === "Messages" && <Mail size={28} className="text-teal-500" />}
            {activeTab}
          </h2>

          {/* ═══════════ OVERVIEW TAB ═══════════ */}
          {activeTab === "Overview" && (
            <div className="space-y-8 max-w-[1400px]">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Profile Card */}
                <div className="xl:col-span-5 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-8">
                  <div className="relative shrink-0">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-teal-50 to-teal-100 border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
                      {profile.profilePicture ? (
                        <img src={profile.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <UserRound size={54} className="text-teal-300"/>
                      )}
                    </div>
                    <button onClick={() => setShowSettings(true)} className="absolute bottom-1 right-1 w-9 h-9 bg-teal-500 text-white rounded-full flex items-center justify-center border-2 border-white shadow hover:bg-teal-600 transition-colors">
                      <Edit2 size={14}/>
                    </button>
                  </div>
                  <div className="flex-1 space-y-4 w-full">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-800">{profile.name}</h3>
                        <p className="text-teal-500 font-semibold text-sm mt-0.5">Role: Patient</p>
                      </div>
                      <span className="bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-lg">Active</span>
                    </div>

                    {/* Key info chips */}
                    <div className="flex flex-wrap gap-2 mt-1">
                      {profile.dob && (
                        <span className="bg-teal-50 text-teal-700 text-xs font-bold px-3 py-1 rounded-full border border-teal-100">
                          Age: {calcAge(profile.dob) ?? "—"} yrs
                        </span>
                      )}
                      {profile.gender && (
                        <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-100">
                          {profile.gender}
                        </span>
                      )}
                      {profile.bloodGroup && (
                        <span className="bg-red-50 text-red-700 text-xs font-bold px-3 py-1 rounded-full border border-red-100">
                          🩸 {profile.bloodGroup}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mt-2">
                      <div className="col-span-2"><span className="text-slate-500">Residential Address</span><p className="font-semibold text-slate-800">{profile.address || "Not provided"}</p></div>
                      <div><span className="text-slate-500">Emergency Contact</span><p className="font-semibold text-slate-800">{profile.emergencyContact?.name || "N/A"}</p></div>
                      <div><span className="text-slate-500">Emergency Phone</span><p className="font-semibold text-teal-600">{profile.emergencyContact?.phone || "N/A"}</p></div>
                    </div>
                    <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-teal-500 font-bold">Chart ID: </span><span className="text-slate-700 font-semibold">{profile.id}</span></div>
                      {profile.height && <div><span className="text-teal-500 font-bold">Height: </span><span className="text-slate-700 font-semibold">{profile.height} cm</span></div>}
                      {profile.weight && <div><span className="text-teal-500 font-bold">Weight: </span><span className="text-slate-700 font-semibold">{profile.weight} kg</span></div>}
                    </div>
                  </div>
                </div>

                {/* QR + Appointments mini split */}
                <div className="xl:col-span-7 flex flex-col gap-8">
                  {/* QR Code */}
                  <Link href="/patient/qr" className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-3xl p-6 flex items-center gap-6 shadow-lg hover:scale-[1.02] transition-transform cursor-pointer">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                      <QrCode size={34} className="text-white"/>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold">Emergency QR Code</h4>
                      <p className="text-teal-100 text-sm mt-1">Generate your Medical ID QR for quick first-responder access to your critical health info.</p>
                      <span className="mt-3 inline-block bg-white/20 border border-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-white/30 transition-colors">Generate QR →</span>
                    </div>
                  </Link>

                  {/* Appointments preview */}
                  <div className="bg-white rounded-3xl p-7 border border-slate-100 shadow-sm flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-slate-800">Appointments</h3>
                      <button onClick={openAppt} className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-teal-600 transition-colors">+ Book New</button>
                    </div>
                    <table className="w-full text-left text-sm">
                      <thead><tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-100">
                        <th className="pb-3 font-bold">Type</th><th className="pb-3 font-bold">Date</th><th className="pb-3 font-bold">Doctor</th><th className="pb-3 font-bold">Status</th>
                      </tr></thead>
                      <tbody className="font-semibold text-slate-700">
                        {timeline.filter(t => t.type==='consultation').slice(0,3).map((a,i)=>(
                          <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                            <td className="py-3">Visit</td><td className="py-3">{formatDate(a.date)}</td><td className="py-3 truncate max-w-[130px]">{a.title?.replace('Appointment with ','')}</td>
                            <td className="py-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-600">Scheduled</span></td>
                          </tr>
                        ))}
                        {timeline.filter(t=>t.type==='consultation').length===0 && (
                          <tr><td colSpan={4} className="py-6 text-center text-slate-400 text-xs">No appointments yet. Book one above!</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Bottom 3-cols */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Medical Records */}
                <div className="bg-white rounded-3xl p-7 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-xl font-bold text-slate-800">Medical Records</h3>
                    <button onClick={() => setActiveTab("Medical Records")} className="bg-teal-500 text-white px-4 py-1.5 rounded-xl text-xs font-bold hover:bg-teal-600 transition-colors">Browse All</button>
                  </div>
                  <table className="w-full text-left text-sm">
                    <thead><tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-100">
                      <th className="pb-3 font-bold">Date</th><th className="pb-3 font-bold">Name</th>
                    </tr></thead>
                    <tbody className="font-semibold text-slate-700">
                        {timeline.slice(0,4).map((r,i)=>(
                          <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 cursor-pointer" onClick={()=>setShowRecord(r)}>
                            <td className="py-3 text-slate-500 whitespace-nowrap">{formatDate(r.date)}</td>
                            <td className="py-3 truncate max-w-[180px]">{r.title}</td>
                          </tr>
                        ))}
                        {timeline.length===0 && <tr><td colSpan={2} className="py-4 text-center text-slate-400 text-xs">No records yet</td></tr>}
                      </tbody>
                    </table>
                </div>



                {/* Medications */}
                <div className="bg-white rounded-3xl p-7 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-xl font-bold text-slate-800">Medications</h3>
                    <button onClick={() => setActiveTab("Medications")} className="bg-teal-500 text-white px-4 py-1.5 rounded-xl text-xs font-bold hover:bg-teal-600 transition-colors">Refill</button>
                  </div>
                  <table className="w-full text-left text-sm">
                    <thead><tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-100">
                      <th className="pb-3 font-bold">Name</th><th className="pb-3 font-bold">Dose</th>
                    </tr></thead>
                    <tbody className="font-semibold text-slate-700">
                      {MOCK_MEDS.map((m,i)=>(
                        <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                          <td className="py-3 truncate max-w-[140px]">{m.name}</td>
                          <td className="py-3 text-slate-500">{m.dose}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ APPOINTMENTS TAB ═══════════ */}
          {activeTab === "Appointments" && (
            <div className="max-w-[1400px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-slate-800">My Appointments</h3>
                <button onClick={openAppt} className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-teal-600 transition-colors">+ Book New</button>
              </div>
              {appointments.length === 0 ? (
                <div className="bg-white rounded-3xl p-14 border border-slate-100 shadow-sm flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center">
                    <CalendarIcon size={30} className="text-teal-400"/>
                  </div>
                  <div>
                    <p className="text-slate-700 font-bold text-lg">No appointments booked yet</p>
                    <p className="text-slate-400 text-sm mt-1">Use the "Book New" button to schedule a visit.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {appointments.map((a, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:border-teal-100 transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center shrink-0">
                            <Stethoscope size={18} className="text-teal-600"/>
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 leading-tight text-sm">{a.doctorType || "Specialist"}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{a.doctorName}</p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          a.status === "Completed" ? "bg-slate-100 text-slate-500" : "bg-teal-100 text-teal-700"
                        }`}>{a.status || "Scheduled"}</span>
                      </div>
                      <div className="space-y-2 pt-4 border-t border-slate-100 text-sm">
                        <div className="flex items-start gap-2">
                          <Activity size={13} className="text-slate-400 shrink-0 mt-0.5"/>
                          <p className="text-slate-600 leading-snug"><span className="font-semibold text-slate-700">Symptoms: </span>{a.symptoms || "Not provided"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarIcon size={13} className="text-slate-400 shrink-0"/>
                          <p className="text-slate-600"><span className="font-semibold text-slate-700">Date: </span>{formatDate(a.date)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={13} className="text-slate-400 shrink-0"/>
                          <p className="text-slate-600"><span className="font-semibold text-slate-700">Time: </span>{a.timeSlot}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}



          {/* ═══════════ MEDICAL RECORDS TAB ═══════════ */}
          {activeTab === "Medical Records" && (
            <div className="space-y-4 max-w-[1400px]">
              {/* AI Summarizer Feature Banner */}
              <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl p-4 flex items-center gap-4 shadow-lg shadow-purple-500/20">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <Sparkles size={20} className="text-white"/>
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold text-sm">AI Medical Summarizer</p>
                  <p className="text-purple-100 text-xs">Click "Summarize" on any record to get a simple, patient-friendly explanation — generated once and saved permanently.</p>
                </div>
              </div>

              {summaryError && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-center gap-3">
                  <AlertCircle size={16} className="text-red-500 shrink-0"/>
                  <p className="text-red-600 text-sm font-medium">{summaryError}</p>
                  <button onClick={() => setSummaryError(null)} className="ml-auto text-red-400 hover:text-red-600"><X size={14}/></button>
                </div>
              )}

              {timeline.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
                  <FileText size={48} className="mx-auto text-slate-200 mb-4"/>
                  <p className="text-slate-400 font-semibold">No medical records yet. Records will appear after doctor visits and prescriptions.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {timeline.map((rec, i) => {
                    const recId = rec._id?.toString();
                    const hasSummary = !!rec.aiSummary;
                    const isLoading = summarizingId === recId;
                    const isExpanded = expandedSummary === recId;
                    const canSummarize = (rec.type === "prescription" || rec.type === "lab_report" || rec.type === "xray" || rec.type === "vaccination") && !hasSummary;
                    const typeColor =
                      rec.type === "xray" ? { bg: "bg-blue-100", text: "text-blue-600", badge: "bg-blue-50 text-blue-600" } :
                      rec.type === "prescription" ? { bg: "bg-purple-100", text: "text-purple-600", badge: "bg-purple-50 text-purple-600" } :
                      rec.type === "lab_report" ? { bg: "bg-red-100", text: "text-red-600", badge: "bg-red-50 text-red-600" } :
                      { bg: "bg-teal-100", text: "text-teal-600", badge: "bg-teal-50 text-teal-600" };
                    return (
                      <div key={recId || i} className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all ${
                        hasSummary ? "border-purple-200" : "border-slate-100"
                      }`}>
                        {/* Record Header */}
                        <div className="p-5 flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typeColor.bg} ${typeColor.text}`}>
                            <FileText size={18}/>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-bold text-slate-800 text-sm truncate">{rec.title}</h4>
                              <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black capitalize ${typeColor.badge}`}>
                                {rec.type?.replace("_", " ")}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{formatDate(rec.date)}</p>
                            <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">{rec.description || rec.notes}</p>
                          </div>
                        </div>

                        {/* Action Row */}
                        <div className="px-5 pb-4 flex items-center gap-2">
                          {/* SUMMARIZE button — only shown if no summary exists */}
                          {canSummarize && (
                            <button
                              onClick={() => handleSummarize(recId!)}
                              disabled={isLoading}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-bold rounded-xl hover:from-violet-600 hover:to-purple-700 disabled:opacity-60 transition-all shadow-sm shadow-purple-400/30"
                            >
                              {isLoading ? (
                                <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/> Generating...</>
                              ) : (
                                <><Sparkles size={12}/> Summarize</>
                              )}
                            </button>
                          )}
                          {/* SHOW/HIDE summary toggle — only if summary exists */}
                          {hasSummary && (
                            <button
                              onClick={() => setExpandedSummary(isExpanded ? null : recId!)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-bold rounded-xl hover:bg-purple-100 transition-all border border-purple-200"
                            >
                              <Sparkles size={12}/>
                              {isExpanded ? "Hide AI Summary" : "View AI Summary"}
                              {isExpanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                            </button>
                          )}
                          {hasSummary && (
                            <span className="text-[10px] text-purple-400 font-semibold ml-1">✓ AI Summary available</span>
                          )}
                        </div>

                        {/* AI SUMMARY PANEL — beautifully styled */}
                        <AnimatePresence>
                          {hasSummary && isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mx-4 mb-4 bg-gradient-to-br from-violet-50 to-purple-50 border border-purple-200 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center">
                                    <Sparkles size={12} className="text-white"/>
                                  </div>
                                  <span className="text-xs font-black text-purple-700 uppercase tracking-wider">AI Summary</span>
                                  {rec.summaryGeneratedAt && (
                                    <span className="ml-auto text-[10px] text-purple-400 font-medium">
                                      Generated {new Date(rec.summaryGeneratedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                                  {rec.aiSummary}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════════ MEDICATIONS TAB ═══════════ */}
          {activeTab === "Medications" && (
            <div className="space-y-6 max-w-[1400px]">
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-800">Prescribed Medications</h3>
                  <button className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-teal-600 transition-colors">+ Request Refill</button>
                </div>
                {timeline.filter(t=>t.type==="prescription").length === 0 ? (
                  <div className="text-center py-10">
                    <Pill size={40} className="mx-auto text-slate-200 mb-3"/>
                    <p className="text-slate-400 font-medium text-sm">No prescriptions yet. Your doctor will add them here after your visit.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {timeline.filter(t=>t.type==="prescription").map((rx, i) => {
                      const rxId = rx._id?.toString();
                      const hasSummary = !!rx.aiSummary;
                      const isLoading = summarizingId === rxId;
                      const isExpanded = expandedSummary === rxId;
                      return (
                        <div key={`rx-${i}`} className={`border rounded-2xl p-5 transition-all ${
                          hasSummary ? "border-purple-200 bg-purple-50/20" : "border-purple-100 hover:border-purple-200 hover:bg-purple-50/30"
                        }`}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                              <Pill size={18} className="text-purple-600"/>
                            </div>
                            {hasSummary && (
                              <span className="text-[10px] bg-purple-100 text-purple-600 font-black px-2 py-0.5 rounded-full">AI ✓</span>
                            )}
                          </div>
                          <h4 className="font-bold text-slate-800 text-base mb-1">{rx.title}</h4>
                          <p className="text-slate-500 text-xs mb-1 line-clamp-2">{rx.description || rx.notes}</p>
                          <p className="text-slate-400 text-xs mb-4">{formatDate(rx.date)}</p>

                          {/* Summarize or View Summary */}
                          {!hasSummary ? (
                            <button
                              onClick={() => handleSummarize(rxId!)}
                              disabled={isLoading}
                              className="w-full flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-bold rounded-xl hover:from-violet-600 hover:to-purple-700 disabled:opacity-60 transition-all"
                            >
                              {isLoading
                                ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/> Generating...</>
                                : <><Sparkles size={12}/> Summarize Prescription</>}
                            </button>
                          ) : (
                            <button
                              onClick={() => setExpandedSummary(isExpanded ? null : rxId!)}
                              className="w-full flex items-center justify-center gap-1.5 py-2 bg-purple-100 text-purple-700 text-xs font-bold rounded-xl hover:bg-purple-200 transition-all"
                            >
                              <Sparkles size={12}/>
                              {isExpanded ? "Hide Summary" : "View AI Summary"}
                              {isExpanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                            </button>
                          )}

                          {/* Expanded Summary */}
                          <AnimatePresence>
                            {hasSummary && isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-purple-200 rounded-xl p-3">
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <Sparkles size={10} className="text-purple-500"/>
                                    <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider">AI Summary</span>
                                  </div>
                                  <div className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-line">
                                    {rx.aiSummary}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════ TIMELINE TAB ═══════════ */}
          {activeTab === "Timeline" && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm mb-4">
                <h3 className="text-xl font-bold text-slate-800 mb-1">My Health Timeline</h3>
                <p className="text-slate-400 text-sm">A chronological summary of all your medical events.</p>
              </div>
              {timeline.length === 0 ? (
                <div className="bg-white rounded-3xl p-14 text-center border border-slate-100">
                  <Activity size={48} className="mx-auto text-slate-200 mb-4"/>
                  <p className="text-slate-400 font-semibold">No health events recorded yet.</p>
                  <p className="text-slate-400 text-sm mt-1">Book an appointment or visit your doctor to get started.</p>
                </div>
              ) : (
                <div className="relative pl-10">
                  {/* Vertical line */}
                  <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-teal-200 via-slate-200 to-slate-100"/>
                  <div className="space-y-4">
                    {timeline.map((r: any, i: number) => {
                      const typeColors: Record<string,string> = {
                        consultation:  "bg-teal-500",
                        prescription:  "bg-purple-500",
                        lab_report:    "bg-red-500",
                        xray:          "bg-blue-500",
                        vaccination:   "bg-green-500",
                      };
                      const typeLabels: Record<string,string> = {
                        consultation: "Appointment",
                        prescription: "Prescription",
                        lab_report:   "Lab Report",
                        xray:         "X-Ray / Scan",
                        vaccination:  "Vaccination",
                      };
                      const color = typeColors[r.type] || "bg-slate-400";
                      const label = typeLabels[r.type] || r.type;
                      return (
                        <div key={r._id || i} className="flex gap-5 relative group">
                          {/* Dot */}
                          <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center shrink-0 -ml-10 relative z-10 shadow-md`}>
                            {r.type === "prescription" ? <Pill size={16} className="text-white"/> :
                             r.type === "xray"         ? <Eye size={16} className="text-white"/> :
                             r.type === "lab_report"   ? <FileText size={16} className="text-white"/> :
                             r.type === "vaccination"  ? <CheckCircle2 size={16} className="text-white"/> :
                             <CalendarIcon size={16} className="text-white"/>}
                          </div>
                          {/* Card */}
                          <div className="flex-1 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md hover:border-teal-100 transition-all group-hover:-translate-y-0.5">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="font-bold text-slate-800">{r.title}</p>
                              <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${color.replace("bg-","bg-").replace("500","100")} ${color.replace("bg-","text-")}`}>
                                {label}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium mb-2">
                              {new Date(r.date).toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" })}
                              {r.doctorId && ` · Doctor ID: ${r.doctorId}`}
                            </p>
                            <p className="text-sm text-slate-600 leading-relaxed">{r.description || r.notes}</p>
                            {/* Image attachments */}
                            {r.attachments?.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {r.attachments.map((url: string, j: number) => (
                                  url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                    <a key={j} href={url} target="_blank" rel="noreferrer">
                                      <img src={url} alt="attachment" className="h-20 w-28 object-cover rounded-xl border border-slate-200 hover:opacity-80 transition-opacity"/>
                                    </a>
                                  ) : (
                                    <a key={j} href={url} target="_blank" rel="noreferrer"
                                      className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50">
                                      <FileText size={12}/> Download Report
                                    </a>
                                  )
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════ MESSAGES TAB ═══════════ */}
          {activeTab === "Messages" && (
            <div className="max-w-[1000px] mx-auto space-y-4">
              <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Messages &amp; Inbox</h3>
                  <p className="text-slate-500 text-sm">Click a message to mark it as read.</p>
                </div>
                <button onClick={markAllRead} className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-teal-600 transition-colors">Mark All as Read</button>
              </div>
              <div className="grid gap-3">
                {messages.length > 0 ? messages.map(m => (
                  <div key={m.id} onClick={() => markOneRead(m)} className={`p-5 rounded-3xl border transition-all cursor-pointer group ${
                    m.isNew
                      ? "bg-white border-teal-200 shadow-xl shadow-teal-500/5 ring-1 ring-teal-50 hover:shadow-teal-500/10"
                      : "bg-white border-slate-100 opacity-70 hover:opacity-100"
                  }`}>
                    <div className="flex items-start gap-5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        m.type === "appointment" ? "bg-teal-100 text-teal-600" :
                        "bg-purple-100 text-purple-600"
                      }`}>
                        {m.type === "appointment" ? <CalendarIcon size={20}/> : <Pill size={20}/>}
                      </div>
                      <div className="flex-1 min-w-0 py-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${
                            m.type === "appointment" ? "text-teal-500" :
                            "text-purple-500"
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
          )}
        </div>
      </main>

      {/* ═══════════ MODALS ═══════════ */}
      <AnimatePresence>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}}
              className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative">
              <button onClick={()=>setShowSettings(false)} className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 p-2 rounded-full text-slate-500 transition-colors"><X size={18}/></button>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center"><Settings size={24}/></div>
                <h2 className="text-xl font-bold text-slate-800">Edit Profile</h2>
              </div>

              <div className="space-y-4 mb-6 overflow-y-auto max-h-[65vh] pr-2">
                
                {/* Profile Picture Upload */}
                <div className="flex flex-col items-center justify-center mb-6">
                  <div className="relative group cursor-pointer">
                    <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-md flex items-center justify-center overflow-hidden">
                      {editProfilePicture ? (
                        <img src={editProfilePicture} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <UserRound size={32} className="text-slate-300" />
                      )}
                    </div>
                    <label className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera size={18} className="text-white mb-1" />
                      <span className="text-[10px] text-white font-bold">Upload</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setEditProfilePicture(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </label>
                  </div>
                  {editProfilePicture && (
                    <button onClick={() => setEditProfilePicture("")} className="text-[10px] text-red-500 font-bold mt-2 hover:underline">Remove Picture</button>
                  )}
                </div>

                {/* Contact Info */}
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Contact Information</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                    <input type="text" value={editName} onChange={e=>setEditName(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 bg-slate-50 transition-all"/>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                    <input type="email" value={editEmail} onChange={e=>setEditEmail(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 bg-slate-50 transition-all"/>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mobile</label>
                    <input type="tel" value={editPhone} onChange={e=>setEditPhone(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 bg-slate-50 transition-all"/>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Residential Address</label>
                    <textarea value={editAddress} onChange={e=>setEditAddress(e.target.value)} rows={2} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 bg-slate-50 transition-all"></textarea>
                  </div>
                </div>

                {/* Health Info */}
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Health Information</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date of Birth</label>
                      <input type="date" value={editDob} onChange={e=>setEditDob(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 bg-slate-50 transition-all"/>
                      {editDob && calcAge(editDob) !== null && (
                        <p className="mt-1 text-teal-600 text-xs font-bold">→ Age: {calcAge(editDob)} years (auto-calculated)</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Gender</label>
                      <div className="grid grid-cols-3 gap-2">
                        {["Male","Female","Other"].map(g => (
                          <button key={g} type="button" onClick={() => setEditGender(g)}
                            className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${editGender===g ? "bg-teal-500 border-teal-400 text-white" : "bg-slate-50 border-slate-200 text-slate-600 hover:border-teal-300"}`}
                          >{g}</button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Height (cm)</label>
                        <div className="relative">
                          <Ruler size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                          <input type="number" value={editHeight} onChange={e=>setEditHeight(e.target.value)}
                            placeholder="e.g. 170" min="50" max="250"
                            className="w-full pl-8 pr-3 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 bg-slate-50 transition-all"/>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Weight (kg)</label>
                        <div className="relative">
                          <Weight size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                          <input type="number" value={editWeight} onChange={e=>setEditWeight(e.target.value)}
                            placeholder="e.g. 65" min="10" max="300"
                            className="w-full pl-8 pr-3 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 bg-slate-50 transition-all"/>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Blood Group</label>
                      <div className="grid grid-cols-4 gap-2">
                        {["A+","A-","B+","B-","O+","O-","AB+","AB-"].map(bg => (
                          <button key={bg} type="button"
                            onClick={() => setEditBloodGroup(editBloodGroup === bg ? "" : bg)}
                            className={`py-2 rounded-xl text-xs font-bold border transition-all ${editBloodGroup===bg ? "bg-red-500 border-red-400 text-white" : "bg-slate-50 border-slate-200 text-slate-600 hover:border-red-300"}`}
                          >
                            <Droplets size={10} className="inline mr-0.5 opacity-70"/>{bg}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Emergency Contact</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contact Name</label>
                      <input type="text" value={editEmergencyName} onChange={e=>setEditEmergencyName(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 bg-slate-50 transition-all"/>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contact Phone</label>
                      <input type="tel" value={editEmergencyPhone} onChange={e=>setEditEmergencyPhone(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 bg-slate-50 transition-all"/>
                    </div>
                  </div>
                </div>
              </div>

              <button
                disabled={editSaving}
                onClick={async () => {
                  setEditSaving(true);
                  const userStr = localStorage.getItem("user");
                  const patientId = userStr ? JSON.parse(userStr).id : null;
                  try {
                    const res = await fetch(`http://localhost:5000/api/patients/${patientId}/profile`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: editName, contactNumber: editPhone, email: editEmail,
                        address: editAddress, dob: editDob, gender: editGender,
                        height: editHeight, weight: editWeight, bloodGroup: editBloodGroup,
                        emergencyContact: { name: editEmergencyName, phone: editEmergencyPhone },
                        profilePicture: editProfilePicture,
                      }),
                    });
                    const data = await res.json();
                    if (data.success && data.profile) {
                      setProfile({ ...data.profile, id: data.profile.patientId });
                    }
                    const u = JSON.parse(localStorage.getItem("user") || "{}");
                    localStorage.setItem("user", JSON.stringify({ ...u, name: editName, email: editEmail }));
                  } catch (e) {}
                  setEditSaving(false);
                  setShowSettings(false);
                }}
                className="w-full bg-teal-500 disabled:bg-teal-300 text-white font-bold py-3.5 rounded-xl hover:bg-teal-600 transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {editSaving ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Saving...</> : "Save Profile Changes"}
              </button>
            </motion.div>
          </div>
        )}


        {/* Book Appointment Modal */}
        {showAppt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div initial={{opacity:0,scale:0.95,y:20}} animate={{opacity:1,scale:1,y:0}}
              className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button onClick={()=>setShowAppt(false)} className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 p-2 rounded-full text-slate-500 transition-colors"><X size={18}/></button>

              {apptStep===1 && (
                <div className="space-y-5">
                  <h2 className="text-2xl font-bold text-slate-800">Book Appointment</h2>

                  {/* Doctor Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2"><User size={15}/> Select Doctor</label>
                    {liveDoctors.length === 0 ? (
                      <p className="text-slate-400 text-sm bg-slate-50 p-4 rounded-xl">No doctors registered yet. Ask a doctor to sign up first.</p>
                    ) : (
                      <div className="grid gap-2 max-h-48 overflow-y-auto pr-1">
                        {liveDoctors.map((d: any) => (
                          <button key={d.doctorId} onClick={() => { setSelectedDoc(d); setApptDate(""); setAvailableSlots([]); setSelectedSlot(""); }}
                            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${selectedDoc?.doctorId === d.doctorId ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-teal-300 bg-slate-50"}`}>
                            <p className="font-bold text-slate-800 text-sm">{d.name}</p>
                            <p className="text-xs text-slate-500">{d.specialization} · {d.hospital} · {d.experience}yrs exp</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Date picker */}
                  {selectedDoc && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2"><CalendarIcon size={15}/> Select Date</label>
                      <input type="date" value={apptDate}
                        min={new Date().toISOString().slice(0,10)}
                        onChange={e => { setApptDate(e.target.value); setSelectedSlot(""); fetchSlots(selectedDoc.doctorId, e.target.value); }}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 bg-slate-50"/>
                    </div>
                  )}

                  {/* Slot picker */}
                  {apptDate && selectedDoc && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2"><Clock size={15}/> Available Slots</label>
                      {slotLoading ? (
                        <p className="text-slate-400 text-sm text-center py-4">Loading slots...</p>
                      ) : availableSlots.length === 0 ? (
                        <p className="text-red-400 text-sm bg-red-50 p-3 rounded-xl font-medium">
                          No slots available — doctor may be on leave or fully booked.
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {availableSlots.map(s => (
                            <button key={s} onClick={() => setSelectedSlot(s)}
                              className={`px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${selectedSlot===s ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 hover:border-teal-300 text-slate-700"}`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {bookingError && <p className="text-red-500 text-sm font-medium">{bookingError}</p>}

                  <button onClick={confirmAppt}
                    disabled={!selectedDoc || !apptDate || !selectedSlot || bookingLoading}
                    className="w-full bg-teal-500 disabled:bg-teal-200 text-white font-bold py-4 rounded-xl hover:bg-teal-600 transition-colors shadow-sm mt-2">
                    {bookingLoading ? "Booking..." : "Confirm Appointment"}
                  </button>
                </div>
              )}

              {apptStep===2 && (
                <div className="text-center py-6">
                  <motion.div initial={{scale:0}} animate={{scale:1}} className="w-20 h-20 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={40}/>
                  </motion.div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Appointment Confirmed!</h2>
                  <p className="text-slate-500 font-medium px-4 mb-2"><strong>{selectedDoc?.name}</strong> at <strong>{selectedDoc?.hospital}</strong></p>
                  <p className="text-teal-600 font-bold mb-8">{apptDate} · {selectedSlot}</p>
                  <div className="flex gap-3">
                    <button onClick={()=>{setShowAppt(false);setShowCalendar(true);}} className="flex-1 border-2 border-teal-500 text-teal-600 font-bold py-3 rounded-xl hover:bg-teal-50 transition-colors">View Calendar</button>
                    <button onClick={()=>setShowAppt(false)} className="flex-1 bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors">Done</button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}


        {/* Calendar Modal */}
        {showCalendar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
              <button onClick={()=>setShowCalendar(false)} className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 p-2 rounded-full text-slate-500"><X size={18}/></button>
              <h2 className="text-2xl font-black text-slate-800 mb-1">November 2026</h2>
              <p className="text-slate-500 text-sm mb-6 font-medium">Your upcoming appointments</p>
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=><div key={d} className="text-xs font-bold text-slate-400 py-2">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center mb-6">
                {/* Nov 1 2026 = Sunday, offset=0 */}
                {Array.from({length:30},(_,i)=>i+1).map(day=>{
                  const hasAppt=scheduled.includes(day);
                  const isToday=day===24;
                  return (
                    <div key={day} className={`relative flex flex-col items-center justify-center h-10 w-full rounded-xl transition-all cursor-default
                      ${hasAppt?"bg-teal-500 text-white font-black shadow-sm shadow-teal-400/30":isToday?"bg-slate-900 text-white font-bold":"hover:bg-slate-50 text-slate-700 font-semibold"}`}>
                      <span className="text-sm leading-none">{day}</span>
                      {hasAppt && <span className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-green-300 ring-2 ring-teal-500"></span>}
                    </div>
                  );
                })}
              </div>
              <div className="bg-teal-50 rounded-2xl p-4 border border-teal-100 flex items-center gap-3">
                <AlertCircle size={18} className="text-teal-500 shrink-0"/>
                <p className="text-sm font-medium text-teal-700">You have <span className="font-black">{scheduled.length}</span> appointment(s) this month. Teal dates = appointment days.</p>
              </div>
            </motion.div>
          </div>
        )}

        {/* View Medical Record Modal */}
        {showRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}}
              className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative">
              <button onClick={()=>setShowRecord(null)} className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 p-2 rounded-full text-slate-500"><X size={18}/></button>
              <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize mb-4 inline-block ${
                showRecord.type==="xray"?"bg-blue-50 text-blue-600":
                showRecord.type==="prescription"?"bg-purple-50 text-purple-600":
                "bg-teal-50 text-teal-600"}`}>{showRecord.type.replace("_"," ")}</span>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">{showRecord.title}</h2>
              <p className="text-slate-500 text-sm mb-5">{showRecord.doctor} · {formatDate(showRecord.date)}</p>
              {showRecord.imageUrl && <img src={showRecord.imageUrl} alt="Medical Record" className="w-full h-56 object-cover rounded-2xl mb-5 border border-slate-100"/>}
              {showRecord.notes && <div className="bg-slate-50 rounded-2xl p-4 text-sm text-slate-700 border border-slate-100">{showRecord.notes}</div>}
            </motion.div>
          </div>
        )}

        {/* ─── Logout Confirmation Modal ─── */}
        {showLogoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <LogOut size={26} className="text-red-500"/>
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-2">Logout?</h2>
              <p className="text-slate-500 text-sm font-medium mb-7">Are you sure you want to logout from HealthSphere?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors text-sm"
                >
                  Yes, Logout
                </button>
              </div>
            </motion.div>
          </div>
        )}

      </AnimatePresence>
    </div>
  );
}
