"use client";

import dynamic from "next/dynamic";
import { UserRound, Calendar as CalendarIcon, Clock, Settings, LogOut, X, CheckCircle2, AlertCircle, User, Ruler, Weight, Droplets, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePatient } from "../_context/PatientContext";

const HospitalMapPreview = dynamic(() => import("./HospitalMapPreview"), { ssr: false });

export default function PatientModals() {
  const ctx = usePatient();
  const {
    showSettings, setShowSettings, showAppt, setShowAppt, showCalendar, setShowCalendar,
    showRecord, setShowRecord, showLogoutModal, setShowLogoutModal,
    profile, setProfile, formatDate, calcAge,
    // Edit profile
    editName, setEditName, editPhone, setEditPhone, editEmail, setEditEmail,
    editAddress, setEditAddress, editEmergencyName, setEditEmergencyName,
    editEmergencyPhone, setEditEmergencyPhone, editDob, setEditDob,
    editGender, setEditGender, editHeight, setEditHeight, editWeight, setEditWeight,
    editBloodGroup, setEditBloodGroup, editProfilePicture, setEditProfilePicture,
    editSaving, setEditSaving,
    // Booking
    apptStep, setApptStep, liveDoctors, selectedDoc, setSelectedDoc,
    apptDate, setApptDate, availableSlots, setAvailableSlots, selectedSlot, setSelectedSlot,
    bookingLoading, bookingError, slotLoading, fetchSlots, confirmAppt, openAppt,
    scheduled, scheduledPast, confirmLogout,
  } = ctx;

  // Extract patient's default address for distance calculation
  const defaultAddr = profile?.addresses?.find((a: any) => a.isDefault) || profile?.addresses?.[0] || null;

  return (
    <AnimatePresence>
      {/* Settings / Edit Profile Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative">
            <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 p-2 rounded-full text-slate-500 transition-colors"><X size={18} /></button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center"><Settings size={24} /></div>
              <h2 className="text-xl font-bold text-slate-800">Edit Profile</h2>
            </div>

            <div className="space-y-4 mb-6 overflow-y-auto max-h-[65vh] pr-2">
              {/* Profile Picture */}
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
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 bg-slate-50 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                  <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 bg-slate-50 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mobile</label>
                  <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 bg-slate-50 transition-all" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Residential Address</label>
                  <textarea value={editAddress} onChange={e => setEditAddress(e.target.value)} rows={2} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 bg-slate-50 transition-all"></textarea>
                </div>
              </div>

              {/* Health Info */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Health Information</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date of Birth</label>
                    <input type="date" value={editDob} onChange={e => setEditDob(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 bg-slate-50 transition-all" />
                    {editDob && calcAge(editDob) !== null && (
                      <p className="mt-1 text-teal-600 text-xs font-bold">→ Age: {calcAge(editDob)} years (auto-calculated)</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Gender</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Male", "Female", "Other"].map(g => (
                        <button key={g} type="button" onClick={() => setEditGender(g)}
                          className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${editGender === g ? "bg-teal-500 border-teal-400 text-white" : "bg-slate-50 border-slate-200 text-slate-600 hover:border-teal-300"}`}
                        >{g}</button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Height (cm)</label>
                      <div className="relative">
                        <Ruler size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="number" value={editHeight} onChange={e => setEditHeight(e.target.value)} placeholder="e.g. 170" min="50" max="250"
                          className="w-full pl-8 pr-3 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 bg-slate-50 transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Weight (kg)</label>
                      <div className="relative">
                        <Weight size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="number" value={editWeight} onChange={e => setEditWeight(e.target.value)} placeholder="e.g. 65" min="10" max="300"
                          className="w-full pl-8 pr-3 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 bg-slate-50 transition-all" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Blood Group</label>
                    <div className="grid grid-cols-4 gap-2">
                      {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(bg => (
                        <button key={bg} type="button"
                          onClick={() => setEditBloodGroup(editBloodGroup === bg ? "" : bg)}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all ${editBloodGroup === bg ? "bg-red-500 border-red-400 text-white" : "bg-slate-50 border-slate-200 text-slate-600 hover:border-red-300"}`}
                        >
                          <Droplets size={10} className="inline mr-0.5 opacity-70" />{bg}
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
                    <input type="text" value={editEmergencyName} onChange={e => setEditEmergencyName(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 bg-slate-50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contact Phone</label>
                    <input type="tel" value={editEmergencyPhone} onChange={e => setEditEmergencyPhone(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 bg-slate-50 transition-all" />
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
                  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/patients/${patientId}/profile`, {
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
                } catch (e) { }
                setEditSaving(false);
                setShowSettings(false);
              }}
              className="w-full bg-teal-500 disabled:bg-teal-300 text-white font-bold py-3.5 rounded-xl hover:bg-teal-600 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              {editSaving ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</> : "Save Profile Changes"}
            </button>
          </motion.div>
        </div>
      )}

      {/* Book Appointment Modal */}
      {showAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowAppt(false)} className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 p-2 rounded-full text-slate-500 transition-colors"><X size={18} /></button>

            {apptStep === 1 && (
              <div className="space-y-5">
                <h2 className="text-2xl font-bold text-slate-800">Book Appointment</h2>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2"><User size={15} /> Select Doctor</label>
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
                {selectedDoc && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2"><CalendarIcon size={15} /> Select Date</label>
                    <input type="date" value={apptDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={e => { setApptDate(e.target.value); setSelectedSlot(""); fetchSlots(selectedDoc.doctorId, e.target.value); }}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 font-medium text-slate-700 bg-slate-50" />
                  </div>
                )}
                {apptDate && selectedDoc && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2"><Clock size={15} /> Available Slots</label>
                    {slotLoading ? (
                      <p className="text-slate-400 text-sm text-center py-4">Loading slots...</p>
                    ) : availableSlots.length === 0 ? (
                      <p className="text-red-400 text-sm bg-red-50 p-3 rounded-xl font-medium">No slots available — doctor may be on leave or fully booked.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {availableSlots.map(s => (
                          <button key={s} onClick={() => setSelectedSlot(s)}
                            className={`px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${selectedSlot === s ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 hover:border-teal-300 text-slate-700"}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* ── Hospital Map Preview (inline in step 1) ── */}
                {selectedDoc && (
                  <div className="mt-1">
                    <HospitalMapPreview
                      doctorId={selectedDoc.doctorId}
                      doctorName={selectedDoc.name}
                      hospitalName={selectedDoc.hospital}
                      patientLat={defaultAddr?.lat}
                      patientLng={defaultAddr?.lng}
                      compact
                    />
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

            {apptStep === 2 && (
              <div className="py-4">
                <div className="text-center mb-5">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} />
                  </motion.div>
                  <h2 className="text-xl font-bold text-slate-800 mb-1">Appointment Confirmed!</h2>
                  <p className="text-slate-500 font-medium text-sm"><strong>{selectedDoc?.name}</strong> at <strong>{selectedDoc?.hospital}</strong></p>
                  <p className="text-teal-600 font-bold text-sm mt-1">{apptDate} · {selectedSlot}</p>
                </div>

                {/* ── Hospital Map Preview (full in step 2) ── */}
                {selectedDoc && (
                  <div className="mb-5">
                    <HospitalMapPreview
                      doctorId={selectedDoc.doctorId}
                      doctorName={selectedDoc.name}
                      hospitalName={selectedDoc.hospital}
                      patientLat={defaultAddr?.lat}
                      patientLng={defaultAddr?.lng}
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => { setShowAppt(false); setShowCalendar(true); }} className="flex-1 border-2 border-teal-500 text-teal-600 font-bold py-3 rounded-xl hover:bg-teal-50 transition-colors">View Calendar</button>
                  <button onClick={() => setShowAppt(false)} className="flex-1 bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors">Done</button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Calendar Modal — fully dynamic, no hardcoded dates */}
      {showCalendar && (() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-indexed
        const todayDate = now.getDate();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        // Day-of-week the 1st falls on (0=Sun … 6=Sat)
        const firstDayOffset = new Date(year, month, 1).getDay();
        const monthName = now.toLocaleString("en-IN", { month: "long" });

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
              <button onClick={() => setShowCalendar(false)} className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 p-2 rounded-full text-slate-500"><X size={18} /></button>
              <h2 className="text-2xl font-black text-slate-800 mb-1">{monthName} {year}</h2>
              <p className="text-slate-500 text-sm mb-6 font-medium">Your appointments this month</p>
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => <div key={d} className="text-xs font-bold text-slate-400 py-2">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center mb-6">
                {/* Empty cells for offset */}
                {Array.from({ length: firstDayOffset }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const hasUpcoming = scheduled.includes(day);
                  const hasPast = !hasUpcoming && scheduledPast.includes(day);
                  const isToday = day === todayDate;
                  return (
                    <div
                      key={day}
                      title={
                        hasUpcoming ? "Upcoming Appointment" :
                          hasPast ? "Past Appointment" :
                            isToday ? "Today" : undefined
                      }
                      className={`relative flex flex-col items-center justify-center h-10 w-full rounded-xl transition-all cursor-default
                        ${hasUpcoming ? "bg-teal-500 text-white font-black shadow-sm shadow-teal-400/30"
                          : hasPast ? "bg-slate-200 text-slate-400 font-semibold opacity-70"
                            : isToday ? "bg-slate-900 text-white font-bold ring-2 ring-offset-1 ring-teal-400"
                              : "hover:bg-slate-50 text-slate-700 font-semibold"
                        }`}
                    >
                      <span className="text-sm leading-none">{day}</span>
                      {hasUpcoming && <span className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-green-300 ring-2 ring-teal-500" />}
                      {hasPast && <span className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-slate-400" />}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-3 mb-4 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-900 inline-block" />Today</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-teal-500 inline-block" />Upcoming</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-300 inline-block" />Past</span>
              </div>
              <div className="bg-teal-50 rounded-2xl p-4 border border-teal-100 flex items-center gap-3">
                <AlertCircle size={18} className="text-teal-500 shrink-0" />
                <div className="text-sm text-teal-700">
                  <span className="font-black">{scheduled.length}</span>
                  <span className="font-medium"> upcoming appointment{scheduled.length !== 1 ? "s" : ""} this month</span>
                  {scheduledPast.length > 0 && (
                    <span className="text-slate-400 font-medium"> · {scheduledPast.length} past</span>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* View Medical Record Modal */}
      {showRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative">
            <button onClick={() => setShowRecord(null)} className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 p-2 rounded-full text-slate-500"><X size={18} /></button>
            <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize mb-4 inline-block ${showRecord.type === "xray" ? "bg-blue-50 text-blue-600" :
                showRecord.type === "prescription" ? "bg-purple-50 text-purple-600" :
                  "bg-teal-50 text-teal-600"}`}>{showRecord.type.replace("_", " ")}</span>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{showRecord.title}</h2>
            <p className="text-slate-500 text-sm mb-5">{showRecord.doctor} · {formatDate(showRecord.date)}</p>
            {showRecord.imageUrl && <img src={showRecord.imageUrl} alt="Medical Record" className="w-full h-56 object-cover rounded-2xl mb-5 border border-slate-100" />}
            {showRecord.notes && <div className="bg-slate-50 rounded-2xl p-4 text-sm text-slate-700 border border-slate-100">{showRecord.notes}</div>}
          </motion.div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <LogOut size={26} className="text-red-500" />
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-2">Logout?</h2>
            <p className="text-slate-500 text-sm font-medium mb-7">Are you sure you want to logout from HealthSphere?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm">Cancel</button>
              <button onClick={confirmLogout}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors text-sm">Yes, Logout</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
