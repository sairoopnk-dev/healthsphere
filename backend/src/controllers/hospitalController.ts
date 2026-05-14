import { Request, Response } from 'express';
import { AuthedRequest } from '../middleware/requireAuth';
import Hospital from '../models/Hospital';
import Doctor from '../models/Doctor';

// ── HOSPITAL ID GENERATION (bounded retry) ───────────────────────────────────
// Picks a random HOSP-NNNNN candidate and checks for collisions, retrying up
// to 5 times before giving up. Matches the pattern in authController's
// generateUniqueDoctorId (Req 2.5).
async function generateUniqueHospitalId(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `HOSP-${Math.floor(10000 + Math.random() * 90000)}`;
    const collision = await Hospital.exists({ hospitalId: candidate });
    if (!collision) return candidate;
  }
  throw new Error('Hospital ID generation failed');
}

// ── CREATE HOSPITAL ──────────────────────────────────────────────────────────
// POST /api/hospital/create
// Creates a new Hospital_Record, links the creator Doctor_Record to it, and
// promotes the creator to role = 'ADMIN'. Validation order:
//   1. Missing-field 400 (message names the field)
//   2. Coordinate-range 400 'Invalid coordinates'
//   3. 404 'Doctor not found'
//   4. 409 'Doctor already belongs to a hospital'
// (Req 4.4, 4.5, 4.6, 4.7, 4.8, 4.9)
export const createHospital = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, latitude, longitude, address, createdBy } = req.body ?? {};

    // 1. Missing-field validation (order: name, latitude, longitude, address, createdBy)
    if (name === undefined || name === null || name === '') {
      res.status(400).json({ message: 'name is required' });
      return;
    }
    if (latitude === undefined || latitude === null) {
      res.status(400).json({ message: 'latitude is required' });
      return;
    }
    if (longitude === undefined || longitude === null) {
      res.status(400).json({ message: 'longitude is required' });
      return;
    }
    if (address === undefined || address === null || address === '') {
      res.status(400).json({ message: 'address is required' });
      return;
    }
    if (createdBy === undefined || createdBy === null || createdBy === '') {
      res.status(400).json({ message: 'createdBy is required' });
      return;
    }

    // 2. Coordinate-range validation (Req 4.6)
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 || lat > 90 ||
      lng < -180 || lng > 180
    ) {
      res.status(400).json({ message: 'Invalid coordinates' });
      return;
    }

    // 3. Doctor existence check (Req 4.7)
    const creator = await Doctor.findOne({ doctorId: createdBy });
    if (!creator) {
      res.status(404).json({ message: 'Doctor not found' });
      return;
    }

    // 4. Doctor already belongs to a hospital (Req 4.8)
    if (creator.hospitalId) {
      res.status(409).json({ message: 'Doctor already belongs to a hospital' });
      return;
    }

    // 5. Generate unique ID + persist (Req 2.4, 2.5, 4.9)
    const hospitalId = await generateUniqueHospitalId();
    const hospital = await Hospital.create({
      hospitalId,
      name,
      latitude: lat,
      longitude: lng,
      address,
      createdBy,
    });

    // 6. Promote creator to ADMIN and link (Req 4.9)
    creator.hospitalId = hospitalId;
    creator.role = 'ADMIN';
    await creator.save();

    res.status(201).json(hospital);
  } catch (error) {
    if (error instanceof Error) res.status(500).json({ message: error.message });
    else res.status(500).json({ message: 'Server error' });
  }
};

// ── ADD DOCTOR TO HOSPITAL ──────────────────────────────────────────────────
// POST /api/hospital/add-doctor
// Body: { hospitalId, adminDoctorId, doctorId }
// (Req 7.2–7.8)
export const addDoctorToHospital = async (req: Request, res: Response): Promise<void> => {
  try {
    const { hospitalId, adminDoctorId, doctorId } = req.body ?? {};

    // Missing-field validation
    if (!hospitalId || !adminDoctorId || !doctorId) {
      const missing = !hospitalId ? 'hospitalId' : !adminDoctorId ? 'adminDoctorId' : 'doctorId';
      res.status(400).json({ message: `${missing} is required` });
      return;
    }

    // Load admin and target doctor
    const admin  = await Doctor.findOne({ doctorId: adminDoctorId });
    const target = await Doctor.findOne({ doctorId });

    // 404 — target not found (Req 7.3)
    if (!target) {
      res.status(404).json({ message: 'Doctor ID not found' });
      return;
    }

    // 403 — not the hospital admin (Req 7.4)
    if (!admin || admin.role !== 'ADMIN' || admin.hospitalId !== hospitalId) {
      res.status(403).json({ message: 'Only the hospital admin can add doctors' });
      return;
    }

    // Idempotent branch — target is already in this hospital (Req 7.8)
    if (target.hospitalId === hospitalId) {
      res.status(200).json(target);
      return;
    }

    // 409 — target already in a different hospital (Req 7.5)
    if (target.hospitalId && target.hospitalId !== hospitalId) {
      res.status(409).json({ message: 'Doctor already belongs to another hospital' });
      return;
    }

    // Success — assign (Req 7.6)
    target.hospitalId = hospitalId;
    target.role = 'DOCTOR';
    await target.save();

    res.status(200).json(target);
  } catch (error) {
    if (error instanceof Error) res.status(500).json({ message: error.message });
    else res.status(500).json({ message: 'Server error' });
  }
};

// ── GET DOCTORS IN HOSPITAL ──────────────────────────────────────────────────
// GET /api/hospital/doctors?hospitalId=HOSP-NNNNN
// (Req 6.2, 6.3, 6.4)
export const getHospitalDoctors = async (req: Request, res: Response): Promise<void> => {
  try {
    const { hospitalId } = req.query;

    if (!hospitalId || typeof hospitalId !== 'string') {
      res.status(400).json({ message: 'hospitalId is required' });
      return;
    }

    const doctors = await Doctor.find({ hospitalId }).select('-passwordHash');
    res.status(200).json(doctors);
  } catch (error) {
    if (error instanceof Error) res.status(500).json({ message: error.message });
    else res.status(500).json({ message: 'Server error' });
  }
};

// ── GET HOSPITAL BY ID ───────────────────────────────────────────────────────
// GET /api/hospital/:hospitalId
// (Req 9.4)
export const getHospitalById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { hospitalId } = req.params;

    const hospital = await Hospital.findOne({ hospitalId });
    if (!hospital) {
      res.status(404).json({ message: 'Hospital not found' });
      return;
    }

    res.status(200).json(hospital);
  } catch (error) {
    if (error instanceof Error) res.status(500).json({ message: error.message });
    else res.status(500).json({ message: 'Server error' });
  }
};

// ── UPDATE HOSPITAL ──────────────────────────────────────────────────────────
// PUT /api/hospital/update
export const updateHospital = async (req: AuthedRequest, res: Response): Promise<void> => {
  try {
    const doctorId = req.auth?.userId;
    if (!doctorId) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const doctor = await Doctor.findOne({ doctorId });
    if (!doctor || doctor.role !== 'ADMIN') {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    const { name, address, latitude, longitude } = req.body;

    const hospital = await Hospital.findOne({ hospitalId: doctor.hospitalId });
    if (!hospital) {
      res.status(404).json({ message: 'Hospital not found' });
      return;
    }

    if (name) hospital.name = name;
    if (address) hospital.address = address;
    if (latitude !== undefined) hospital.latitude = Number(latitude);
    if (longitude !== undefined) hospital.longitude = Number(longitude);

    await hospital.save();

    res.status(200).json({ message: 'Hospital updated successfully', hospital });
  } catch (error) {
    if (error instanceof Error) res.status(500).json({ message: error.message });
    else res.status(500).json({ message: 'Server error' });
  }
};
