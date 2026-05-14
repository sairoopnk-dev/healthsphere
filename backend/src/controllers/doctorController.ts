import { Request, Response } from 'express';
import Patient from '../models/Patient';
import Doctor from '../models/Doctor';
import Appointment from '../models/Appointment';
import MedicalRecord from '../models/MedicalRecord';
import { sendOTP } from '../utils/sendOTP';
import { getRecentSymptoms } from '../services/insightEngine';
import Interaction from '../models/Interaction';
import { GoogleGenAI } from '@google/genai';
import DoctorPatient from '../models/DoctorPatient';

const otpStore: Record<string, string> = {};

// ─── GET all doctors (for patient booking) ───────────────────────────────────
export const getAllDoctors = async (req: Request, res: Response): Promise<void> => {
  try {
    const doctors = await Doctor.find().select('-passwordHash');
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET single doctor profile ────────────────────────────────────────────────
export const getDoctorProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const doctor = await Doctor.findOne({ doctorId: req.params.id }).select('-passwordHash');
    if (!doctor) { res.status(404).json({ message: 'Doctor not found' }); return; }
    res.json(doctor);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Block / unblock dates (doctor's leave) ───────────────────────────────────
export const updateBlockedDates = async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId, blockedDates } = req.body;
    const doctor = await Doctor.findOneAndUpdate(
      { doctorId },
      { blockedDates },
      { new: true }
    ).select('-passwordHash');
    res.json({ message: 'Leave dates updated.', doctor });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET weekly appointments for a doctor ─────────────────────────────────────
export const getDoctorWeekAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId } = req.params;
    const weekOffset = parseInt((req.query.weekOffset as string) || '0', 10) || 0;

    const toYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    };

    // Start from Sunday of the requested week
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - now.getDay() + weekOffset * 7);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      doctorId,
      date: { $gte: toYMD(startDate), $lte: toYMD(endDate) }
    }).sort({ date: 1, timeSlot: 1 });

    console.log(`[Schedule] doctorId=${doctorId} weekOffset=${weekOffset} window=${toYMD(startDate)}→${toYMD(endDate)} found=${appointments.length}`);
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};


// ─── Book appointment (patient books) ────────────────────────────────────────
export const bookAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, patientName, doctorId, doctorName, hospital, date, timeSlot } = req.body;

    // Check if slot is already taken or doctor has blocked the date
    const doctor = await Doctor.findOne({ doctorId });
    if (!doctor) { res.status(404).json({ message: 'Doctor not found' }); return; }
    if (doctor.blockedDates?.includes(date)) {
      res.status(400).json({ message: 'Doctor is unavailable on this date.' }); return;
    }

    const existingSlot = await Appointment.findOne({ doctorId, date, timeSlot, status: 'scheduled' });
    if (existingSlot) { res.status(400).json({ message: 'This slot is already booked.' }); return; }

    const appointmentId = `APT-${Math.floor(10000 + Math.random() * 90000)}`;
    const appt = await Appointment.create({ appointmentId, patientId, patientName, doctorId, doctorName, hospital, date, timeSlot, status: 'scheduled' });

    res.status(201).json({ message: 'Appointment booked.', appointment: appt });
  } catch (error) {
    if (error instanceof Error) res.status(500).json({ message: error.message });
    else res.status(500).json({ message: 'Server error' });
  }
};

// ─── Get available slots for a doctor on a date ───────────────────────────────
export const getAvailableSlots = async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId, date } = req.query as { doctorId: string; date: string };
    const doctor = await Doctor.findOne({ doctorId });
    if (!doctor) { res.status(404).json({ message: 'Doctor not found' }); return; }

    if (doctor.blockedDates?.includes(date)) {
      res.json({ blocked: true, slots: [] }); return;
    }

    // ── Generate 9:00 AM → 9:00 PM in 30-min increments ──────────────────
    function formatSlot(d: Date): string {
      let h = d.getHours();
      const m = d.getMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
    }

    const todayYMD = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
    const isToday = date === todayYMD;

    // If today, cut off past slots (round up to next 30-min boundary)
    let cutoffMinutes = 0;
    if (isToday) {
      const now = new Date();
      const rem = now.getMinutes() % 30;
      const roundedMin = rem === 0 ? now.getMinutes() : now.getMinutes() + (30 - rem);
      cutoffMinutes = now.getHours() * 60 + roundedMin;
    }

    const allSlots: string[] = [];
    const start = new Date(); start.setHours(9, 0, 0, 0);
    const end = new Date(); end.setHours(21, 0, 0, 0);
    const cur = new Date(start);
    while (cur <= end) {
      const totalMin = cur.getHours() * 60 + cur.getMinutes();
      if (!isToday || totalMin >= cutoffMinutes) {
        allSlots.push(formatSlot(cur));
      }
      cur.setMinutes(cur.getMinutes() + 30);
    }

    // Exclude already-booked slots
    const booked = await Appointment.find({ doctorId, date, status: 'scheduled' }).select('timeSlot');
    const bookedSlots = booked.map(a => a.timeSlot);
    const available = allSlots.filter(s => !bookedSlots.includes(s));

    res.json({ blocked: false, slots: available });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};


export const requestPatientAccess = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.body;
    const patient = await Patient.findOne({ patientId }).select('-passwordHash');
    if (!patient) { res.status(404).json({ message: 'Patient not found in central registry.' }); return; }

    const [rawRecords, appointments] = await Promise.all([
      // Exclude type:'prescription' — prescriptions live exclusively in Prescription collection
      MedicalRecord.find({ patientId, type: { $ne: 'prescription' } }).sort({ date: -1 }).lean(),
      Appointment.find({ patientId }).sort({ date: -1 }).lean(),
    ]);


    const apptIdSet = new Set(appointments.map((a: any) => a.appointmentId).filter(Boolean));
    const seen = new Set<string>();
    const timeline = rawRecords.filter((r: any) => {
      // Skip if this consultation record's appointmentId is already in an appointment
      if (r.type === 'consultation' && r.appointmentId && apptIdSet.has(r.appointmentId)) {
        return false;
      }
      // _id-based dedup safety
      const key = String(r._id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.json({ message: 'Access granted.', patient, timeline, appointments });
  } catch (error) {
    if (error instanceof Error) res.status(500).json({ message: error.message });
    else res.status(500).json({ message: 'Server error' });
  }
};

// ─── Verify route can remain for backwards compatibility or be removed ──────────────────
export const verifyPatientAccess = async (req: Request, res: Response): Promise<void> => {
  res.status(400).json({ message: 'OTP verification is no longer required.' });
};

// ─── Doctor adds prescription / record to patient ────────────────────────────
export const addPatientRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, doctorId, doctorName, type, title, description, date } = req.body;
    const patient = await Patient.findOne({ patientId });
    if (!patient) { res.status(404).json({ message: 'Patient not found' }); return; }

    // Build attachment URLs from uploaded files
    const files = (req as any).files as Express.Multer.File[] | undefined;
    const attachments = files
      ? files.map(f => `http://localhost:5000/uploads/${f.filename}`)
      : (req.body.attachments ? (Array.isArray(req.body.attachments) ? req.body.attachments : [req.body.attachments]) : []);

    const record = await MedicalRecord.create({
      patientId, doctorId,
      type: type || 'prescription',
      title,
      description,
      date: date ? new Date(date) : new Date(),
      attachments
    });

    res.status(201).json({ message: 'Record added.', record });
  } catch (error) {
    if (error instanceof Error) res.status(500).json({ message: error.message });
    else res.status(500).json({ message: 'Server error' });
  }
};

// ─── Doctor profile setup (first login) ──────────────────────────────────────
export const setupDoctorProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId } = req.params;
    const { specialization, hospital, qualification, designation, experience, gender } = req.body;

    if (!specialization || !hospital || !qualification || !designation || !experience || !gender) {
      res.status(400).json({ message: 'All fields are required for profile setup.' });
      return;
    }

    const doctor = await Doctor.findOneAndUpdate(
      { doctorId },
      {
        specialization,
        hospital,
        qualification,
        designation,
        experience: Number(experience),
        gender,
        isProfileCompleted: true,
      },
      { new: true }
    ).select('-passwordHash');

    if (!doctor) {
      res.status(404).json({ message: 'Doctor not found' });
      return;
    }

    res.json({ success: true, message: 'Doctor profile setup complete.', profile: doctor });
  } catch (error) {
    if (error instanceof Error) res.status(500).json({ message: error.message });
    else res.status(500).json({ message: 'Server error' });
  }
};

// ─── AI Symptom Summary for Doctor ────────────────────────────────────────────
export const getPatientSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const patientId = req.params.patientId as string;

    if (!patientId) {
      res.status(400).json({ success: false, message: 'patientId is required' });
      return;
    }

    // 1. Fetch patient info
    const patient = await Patient.findOne({ patientId }).select('name age gender').lean();

    // 2. Fetch recent interactions (last 10)
    const recentInteractions = await Interaction.find({ userId: patientId })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    // 3. Fetch recent symptoms from insightEngine
    const recentSymptoms = await getRecentSymptoms(patientId, 10);

    if (recentSymptoms.length === 0 && recentInteractions.length === 0) {
      res.json({
        success: true,
        data: {
          patientName: (patient as any)?.name || 'Unknown',
          summary: 'No recent symptom data available for this patient. The patient has not yet interacted with the AI symptom checker.',
          symptoms: [],
          interactionCount: 0,
          generatedAt: new Date().toISOString(),
        },
      });
      return;
    }

    // 4. Build context for AI summary
    const interactionSummaries = recentInteractions
      .slice(0, 5)
      .map((i: any, idx: number) => {
        const date = new Date(i.timestamp).toLocaleDateString();
        return `${idx + 1}. [${i.type}] (${date}) — "${i.userInput?.slice(0, 150)}" → Keywords: ${(i.metadata?.keywords || []).join(', ') || 'none'}`;
      })
      .join('\n');

    const symptomList = recentSymptoms.join(', ');

    // 5. Generate AI summary
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

    const prompt = `You are a medical AI assistant helping a doctor quickly understand a patient's recent health concerns.

Patient Info:
- Name: ${(patient as any)?.name || 'Unknown'}
- Age: ${(patient as any)?.age || 'Unknown'}
- Gender: ${(patient as any)?.gender || 'Unknown'}

Recent Symptoms Reported: ${symptomList || 'None'}

Recent Interactions:
${interactionSummaries || 'No recent interactions'}

Task: Summarize the patient's recent symptoms in a short, clear, non-medical paragraph for a doctor to quickly understand. Keep it to 2-3 sentences. Be concise and professional. Do not use bullet points. Do not give medical advice — just summarize what the patient has reported.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const summary = (response.text ?? '').trim();

    res.json({
      success: true,
      data: {
        patientName: (patient as any)?.name || 'Unknown',
        summary,
        symptoms: recentSymptoms,
        interactionCount: recentInteractions.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Doctor] getPatientSummary error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to generate patient summary', error: error.message });
  }
};

// ─── Save patient to doctor's list ──────────────────────────────────────────
export const addSavedPatient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId, patientId } = req.body;
    if (!doctorId || !patientId) { res.status(400).json({ message: 'Missing fields' }); return; }

    const patient = await Patient.findOne({ patientId }).select('patientId name contactNumber');
    if (!patient) { res.status(404).json({ message: 'Patient not found' }); return; }

    const existing = await DoctorPatient.findOne({ doctorId, patientId });
    if (existing) { res.status(400).json({ message: 'Patient already added' }); return; }

    await DoctorPatient.create({ doctorId, patientId });
    res.status(201).json({ message: 'Patient saved successfully', patient });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Get saved patients for a doctor ────────────────────────────────────────
export const getSavedPatients = async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId } = req.params;
    const saved = await DoctorPatient.find({ doctorId }).sort({ addedAt: -1 }).lean();
    if (!saved.length) { res.json([]); return; }

    const pids = saved.map(s => s.patientId);
    const patients = await Patient.find({ patientId: { $in: pids } }).select('patientId name contactNumber').lean();

    const patientMap = new Map();
    patients.forEach((p: any) => patientMap.set(p.patientId, p));

    const result = saved.map(s => {
      const p = patientMap.get(s.patientId);
      return p ? { patientId: p.patientId, name: p.name, contactNumber: p.contactNumber } : null;
    }).filter(Boolean);

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Remove single saved patient ───────────────────────────────────────────
export const removeSavedPatient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId, patientId } = req.params;
    await DoctorPatient.findOneAndDelete({ doctorId, patientId });
    res.json({ message: 'Patient removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Bulk remove saved patients ────────────────────────────────────────────
export const bulkRemoveSavedPatients = async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId, patientIds } = req.body;
    if (!doctorId || !Array.isArray(patientIds)) {
      res.status(400).json({ message: 'Invalid payload' });
      return;
    }
    await DoctorPatient.deleteMany({ doctorId, patientId: { $in: patientIds } });
    res.json({ message: 'Selected patients removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
