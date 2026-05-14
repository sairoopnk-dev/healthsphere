import { Request, Response } from 'express';
import Prescription from '../models/Prescription';
import Patient from '../models/Patient';

// ── Helper: strip time from a Date so comparisons are date-only ─────────────
function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

// ── POST /api/prescriptions/:patientId — Create a new prescription ───────────
export const createPrescription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;
    const { doctorId, doctorName, prescriptionTitle, medicines, notes } = req.body;

    if (!doctorId || !doctorName || !prescriptionTitle || !Array.isArray(medicines) || medicines.length === 0) {
      res.status(400).json({ success: false, message: 'doctorId, doctorName, prescriptionTitle and at least one medicine are required.' });
      return;
    }

    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      res.status(404).json({ success: false, message: 'Patient not found.' });
      return;
    }

    const prescribedDate = new Date();

    // Build each medicine with computed endDate
    const processedMedicines = medicines.map((med: any) => {
      const duration = Math.max(1, Number(med.durationDays) || 1);
      const endDate  = new Date(prescribedDate);
      endDate.setDate(endDate.getDate() + duration);

      // Check immediately if already expired (edge case)
      const status: 'active' | 'completed' =
        startOfDay(endDate) < startOfDay(prescribedDate) ? 'completed' : 'active';

      return {
        medicineName:   med.medicineName,
        type:           med.type || 'tablet',
        dosage:         med.dosage,
        frequency:      med.frequency,
        instructions:   med.instructions || '',
        durationDays:   duration,
        prescribedDate,
        endDate,
        status,
      };
    });

    const prescription = new Prescription({
      patientId,
      doctorId,
      doctorName,
      prescriptionTitle,
      medicines: processedMedicines,
      notes: notes || '',
      prescribedDate,
    });
    await prescription.save();

    res.status(201).json({ success: true, prescription });
  } catch (error: any) {
    console.error('[Prescription] Create error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/prescriptions/:patientId — All prescriptions for a patient ──────
export const getPatientPrescriptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;

    // First, run a quick inline status refresh (in case scheduler hasn't run yet)
    const now = new Date();
    const prescriptions = await Prescription.find({ patientId }).sort({ prescribedDate: -1 });

    for (const rx of prescriptions) {
      let modified = false;
      for (const med of rx.medicines) {
        if (med.status === 'active' && new Date(med.endDate) < now) {
          med.status = 'completed';
          modified = true;
        }
      }
      if (modified) await rx.save();
    }

    // Fetch fresh after potential update
    const updated = await Prescription.find({ patientId }).sort({ prescribedDate: -1 });
    res.json({ success: true, prescriptions: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/prescriptions/:patientId/active — Only active medicines ─────────
export const getActiveMedications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;
    const now = new Date();

    const prescriptions = await Prescription.find({ patientId, 'medicines.status': 'active' }).sort({ prescribedDate: -1 });

    // Flatten to medicine-level list with parent prescription info
    const active: any[] = [];
    for (const rx of prescriptions) {
      for (const med of rx.medicines) {
        if (med.status === 'active') {
          // Inline expiry check
          if (new Date(med.endDate) < now) {
            med.status = 'completed';
            await rx.save();
            continue;
          }
          const daysLeft = Math.ceil((new Date(med.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          active.push({
            _id:               (med._id as any)?.toString(),
            medicineName:      med.medicineName,
            type:              med.type,
            dosage:            med.dosage,
            frequency:         med.frequency,
            instructions:      med.instructions,
            durationDays:      med.durationDays,
            prescribedDate:    med.prescribedDate,
            endDate:           med.endDate,
            status:            med.status,
            daysLeft:          Math.max(0, daysLeft),
            prescriptionId:    rx._id,
            prescriptionTitle: rx.prescriptionTitle,
            doctorName:        rx.doctorName,
          });
        }
      }
    }

    res.json({ success: true, medications: active });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/prescriptions/:patientId/past — Only completed medicines ────────
export const getPastMedications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;
    const now = new Date();

    const prescriptions = await Prescription.find({ patientId }).sort({ prescribedDate: -1 });

    const past: any[] = [];
    for (const rx of prescriptions) {
      for (const med of rx.medicines) {
        // Check and auto-expire
        if (med.status === 'active' && new Date(med.endDate) < now) {
          med.status = 'completed';
          await rx.save();
        }
        if (med.status === 'completed') {
          past.push({
            _id:               (med._id as any)?.toString(),
            medicineName:      med.medicineName,
            type:              med.type,
            dosage:            med.dosage,
            frequency:         med.frequency,
            instructions:      med.instructions,
            durationDays:      med.durationDays,
            prescribedDate:    med.prescribedDate,
            endDate:           med.endDate,
            status:            med.status,
            prescriptionId:    rx._id,
            prescriptionTitle: rx.prescriptionTitle,
            doctorName:        rx.doctorName,
          });
        }
      }
    }

    res.json({ success: true, medications: past });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/prescriptions/doctor/:patientId — Prescriptions written by doctor ─
export const getPrescriptionsByDoctor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;
    const prescriptions = await Prescription.find({ patientId }).sort({ prescribedDate: -1 });
    res.json({ success: true, prescriptions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
