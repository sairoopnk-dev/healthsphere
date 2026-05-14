import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import Appointment from '../models/Appointment';
import MedicalRecord from '../models/MedicalRecord';
import Prescription from '../models/Prescription';
import { storeAppointment } from '../utils/memoryService';

// ── Helper: is appointment date+time in the past? ─────────────────────────
function isInPast(date: string, timeSlot: string): boolean {
  const match = (timeSlot || '').match(/(\d+):(\d+)\s*(AM|PM)/i);
  let hours = 0, mins = 0;
  if (match) {
    hours = parseInt(match[1], 10);
    mins  = parseInt(match[2], 10);
    if (match[3].toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (match[3].toUpperCase() === 'AM' && hours === 12) hours  = 0;
  }
  const apptMs = new Date(`${date}T${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:00`).getTime();
  return apptMs < Date.now();
}

// ── Helper: parse "09:00 AM" → minutes since midnight for sorting ──────────
function timeSlotToMinutes(slot: string): number {
  if (!slot) return 0;
  const match = slot.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let [, h, m, ampm] = match;
  let hours = parseInt(h, 10);
  const mins = parseInt(m, 10);
  if (ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
  if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
  return hours * 60 + mins;
}

/** Sort appointments: date ASC (earliest first), then timeSlot ASC within same date */
function sortChrono(appts: any[]) {
  return [...appts].sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date); // YYYY-MM-DD lexicographic = correct date order
    if (dateComp !== 0) return dateComp;
    return timeSlotToMinutes(a.timeSlot) - timeSlotToMinutes(b.timeSlot);
  });
}

// ── POST /api/appointments ────────────────────────────────────────────────
export const createAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, patientName, doctorId, doctorName, hospital, date, timeSlot, severityScore } = req.body;

    if (!patientId || !patientName || !doctorId || !doctorName || !hospital || !date || !timeSlot) {
      res.status(400).json({ success: false, message: 'All fields are required' });
      return;
    }

    const appointment = await Appointment.create({
      appointmentId: randomUUID(),
      patientId, patientName, doctorId, doctorName, hospital,
      date, timeSlot,
      status: 'scheduled',
      diagnosis: '',
      reportUrl: '',
      severityScore: severityScore ?? null,
      isPriority: false,
    });

    res.status(201).json({ success: true, data: appointment });
  } catch (error: any) {
    console.error('[Appointment] createAppointment error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create appointment', error: error.message });
  }
};

// ── GET /api/appointments?patientId=xxx  or  ?doctorId=xxx ───────────────
export const getAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, doctorId } = req.query;
    const filter: Record<string, string> = {};
    if (patientId) filter.patientId = patientId as string;
    if (doctorId)  filter.doctorId  = doctorId  as string;

    // Sort by date ASC, then timeSlot handled client-side (string sort for timeSlot at DB level is unreliable)
    const raw = await Appointment.find(filter).sort({ date: 1, createdAt: 1 }).lean();
    res.status(200).json(sortChrono(raw));
  } catch (error: any) {
    console.error('[Appointment] getAppointments error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch appointments', error: error.message });
  }
};

// ── GET /api/appointments/patient/:patientId — dedicated patient endpoint ─
export const getPatientAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;

    // Step 1: Auto-complete any past-dated scheduled appointments
    const pendingPast = await Appointment.find({
      patientId,
      status: 'scheduled',
    }).lean();

    const toComplete = pendingPast
      .filter((a: any) => isInPast(a.date, a.timeSlot))
      .map((a: any) => a.appointmentId);

    if (toComplete.length > 0) {
      await Appointment.updateMany(
        { appointmentId: { $in: toComplete } },
        { $set: { status: 'completed' } }
      );
      console.log(`[Appointment] Auto-completed ${toComplete.length} past appointment(s) for patient ${patientId}`);
    }

    // Step 2: Fetch all appointments fresh and split
    const all = await Appointment.find({ patientId }).sort({ date: 1 }).lean();
    const sorted = sortChrono(all);

    const upcomingAppointments = sorted
      .filter((a: any) => a.status !== 'completed' && a.status !== 'cancelled');

    const pastAppointments = [...sorted]
      .filter((a: any) => a.status === 'completed' || a.status === 'cancelled')
      .reverse(); // descending: most recent first

    res.status(200).json({ success: true, upcomingAppointments, pastAppointments });
  } catch (error: any) {
    console.error('[Appointment] getPatientAppointments error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch patient appointments' });
  }
};

// ── GET /api/appointments/patient/:patientId/timeline ─────────────────────
// Returns a merged, chronologically sorted view of records and prescriptions ONLY.
// Appointments are NOT included — they are served exclusively via getPatientAppointments.
//   - Medical Records (lab reports, scans, vaccinations, consultation records, etc.)
//   - Prescriptions (each prescription as a single entry)
export const getPatientTimeline = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;

    const [records, prescriptions] = await Promise.all([
      // Exclude type:'prescription' — prescriptions are served exclusively from the Prescription collection
      MedicalRecord.find({ patientId, type: { $ne: 'prescription' } }).sort({ date: -1 }).lean(),
      Prescription.find({ patientId }).sort({ prescribedDate: -1 }).lean(),
    ]);

    // ── 1. Normalise medical records (lab reports, scans, etc.) ───────────
    const recordEntries = records.map((r: any) => ({
      _id:         r._id,
      entryType:   'record',
      category:    r.recordType === 'prescription' ? 'prescription' : (r.type || 'report'),
      title:       r.title,
      doctorName:  r.doctorName || '',
      date:        r.date,
      description: r.description || r.notes || '',
      attachments: r.attachments || [],
      imageUrl:    r.imageUrl || '',
      recordType:  r.recordType || 'report',
    }));

    // ── 2. Normalise prescriptions ────────────────────────────────────────
    const prescriptionEntries = prescriptions.map((rx: any) => ({
      _id:       rx._id,
      entryType: 'prescription',
      category:  'prescription',
      title:     rx.prescriptionTitle || 'Prescription',
      doctorName: rx.doctorName,
      date:      rx.prescribedDate,
      notes:     rx.notes || '',
      medicines: (rx.medicines || []).map((m: any) => ({
        medicineName: m.medicineName,
        type:         m.type,
        dosage:       m.dosage,
        frequency:    m.frequency,
        durationDays: m.durationDays,
        status:       m.status,
      })),
    }));

    // ── 3. Merge records + prescriptions, sort newest first ──────────────
    const merged = [...recordEntries, ...prescriptionEntries].sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return db - da;
    });

    // ── 4. Final dedup by _id (safety net) ───────────────────────────────
    const seen = new Set<string>();
    const unique = merged.filter(item => {
      const key = String(item._id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.status(200).json({ success: true, data: unique });
  } catch (error: any) {
    console.error('[Appointment] getPatientTimeline error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch timeline' });
  }
};

// ── PATCH /api/appointments/:id/status ───────────────────────────────────
export const updateAppointmentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, diagnosis, reportUrl } = req.body;

    if (!['scheduled', 'completed', 'cancelled'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status value' });
      return;
    }

    const updateFields: any = { status };
    if (diagnosis  !== undefined) updateFields.diagnosis  = diagnosis;
    if (reportUrl  !== undefined) updateFields.reportUrl  = reportUrl;

    const appointment = await Appointment.findOneAndUpdate(
      { appointmentId: id },
      updateFields,
      { new: true }
    );

    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found' });
      return;
    }

    // ── Store in Hindsight memory (only on completion) ──
    if (status === 'completed') {
      storeAppointment(
        appointment.patientId,
        appointment.doctorName,
        diagnosis || '',
        `Hospital: ${appointment.hospital}, Slot: ${appointment.timeSlot}, Date: ${appointment.date}`,
      ).catch(() => {});
    }

    res.status(200).json({ success: true, data: appointment });
  } catch (error: any) {
    console.error('[Appointment] updateAppointmentStatus error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update appointment', error: error.message });
  }
};

// ── POST /api/appointments/:id/prioritize ────────────────────────────────
export const prioritizeAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findOneAndUpdate(
      { appointmentId: id },
      { isPriority: true },
      { new: true }
    );

    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found' });
      return;
    }

    const doctorName   = appointment.doctorName?.trim()  || "";
    const hospitalName = appointment.hospital?.trim()    || "";
    const notifText = doctorName && hospitalName
      ? `Dr. ${doctorName} at ${hospitalName} is available now. Please come immediately.`
      : "Doctor is available now. Please come immediately.";

    const Notification = (await import('../models/Notification')).default;
    await Notification.create({
      patientId: appointment.patientId,
      type:      'appointment',
      text:      notifText,
      date:      new Date().toISOString().split('T')[0],
      isRead:    false,
    });

    console.log(`[Priority] Appointment ${id} prioritised; notification sent to ${appointment.patientId}`);
    res.status(200).json({ success: true, data: appointment });
  } catch (error: any) {
    console.error('[Appointment] prioritizeAppointment error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to prioritize appointment', error: error.message });
  }
};
