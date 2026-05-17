import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import Patient from '../models/Patient';
import Doctor from '../models/Doctor';
import mongoose from 'mongoose';
import generateToken from '../utils/generateToken';

// ── DOCTOR ID GENERATION (bounded retry) ────────────────────────────────────
// Picks a random DOC-NNNNN candidate and checks for collisions, retrying up to
// 5 times before giving up. Mirrors generateUniqueHospitalId to satisfy the
// "retry up to 5 times" language in the onboarding spec (Req 1.4).
async function generateUniqueDoctorId(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `DOC-${Math.floor(10000 + Math.random() * 90000)}`;
    const collision = await Doctor.exists({ doctorId: candidate });
    if (!collision) return candidate;
  }
  throw new Error('Doctor ID generation failed');
}

// ── PATIENT REGISTER (minimal – profile completed later) ────────────────────
export const registerPatient = async (req: Request, res: Response): Promise<void> => {
  try {
    let { name, email, password, contactNumber } = req.body;

    console.log("Connected DB:", mongoose.connection.name);
    console.log("URI:", process.env.MONGO_URI || process.env.MONGODB_URI);

    if (!name || !email || !password || !contactNumber) {
      res.status(400).json({ message: 'Name, email, password and contact are required.' });
      return;
    }

    email = email.toLowerCase().trim();
    console.log("Incoming email:", email);

    const patientExists = await Patient.findOne({ email });
    console.log("Existing user:", patientExists);

    if (patientExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const patientId = `PID-${Math.floor(10000 + Math.random() * 90000)}`;

    const patient = await Patient.create({ patientId, name, email, passwordHash, contactNumber });

    if (patient) {
      generateToken(res, patient._id as unknown as string, 'patient');
      res.status(201).json({
        _id: patient._id,
        id: patient.patientId,
        name: patient.name,
        email: patient.email,
        role: 'patient',
        isProfileCompleted: false,  // <-- first-login flag
      });
    } else {
      res.status(400).json({ message: 'Invalid patient data' });
    }
  } catch (error) {
    if (error instanceof Error) res.status(500).json({ message: error.message });
    else res.status(500).json({ message: 'Server error' });
  }
};

// ── DOCTOR REGISTER (minimal – profile completed later) ─────────────────────
export const registerDoctor = async (req: Request, res: Response): Promise<void> => {
  try {
    let { name, email, password, contactNumber } = req.body;

    console.log("Connected DB:", mongoose.connection.name);
    console.log("URI:", process.env.MONGO_URI || process.env.MONGODB_URI);

    if (!name || !email || !password || !contactNumber) {
      res.status(400).json({ message: 'Name, email, password and contact are required.' });
      return;
    }

    email = email.toLowerCase().trim();
    console.log("Incoming email:", email);

    const doctorExists = await Doctor.findOne({ email });
    console.log("Existing user:", doctorExists);

    if (doctorExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const doctorId = await generateUniqueDoctorId();

    const doctor = await Doctor.create({
      doctorId, name, email, passwordHash, contactNumber, blockedDates: []
    });

    if (doctor) {
      generateToken(res, doctor._id as unknown as string, 'doctor');
      res.status(201).json({
        _id: doctor._id,
        id: doctor.doctorId,
        name: doctor.name,
        email: doctor.email,
        role: 'doctor',
        isProfileCompleted: false,  // <-- first-login flag
      });
    } else {
      res.status(400).json({ message: 'Invalid doctor data' });
    }
  } catch (error) {
    if (error instanceof Error) res.status(500).json({ message: error.message });
    else res.status(500).json({ message: 'Server error' });
  }
};

// ── LOGIN ────────────────────────────────────────────────────────────────────
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    let { email, password, role } = req.body;

    if (email) {
      email = email.toLowerCase().trim();
    }

    let user: any = null;
    if (role === 'doctor') {
      user = await Doctor.findOne({ email });
    } else {
      user = await Patient.findOne({ email });
    }

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      generateToken(res, user._id as unknown as string, role);
      const baseResponse: Record<string, unknown> = {
        _id: user._id,
        id: role === 'doctor' ? user.doctorId : user.patientId,
        name: user.name,
        email: user.email,
        role,
        isProfileCompleted: user.isProfileCompleted ?? false,  // <-- tells frontend where to redirect
      };
      // Additive doctor-only fields (Req 3.1, 11.5). Omitted entirely for
      // patients so the patient login response stays byte-for-byte identical.
      if (role === 'doctor') {
        baseResponse.hospitalId = user.hospitalId ?? null;
        baseResponse.doctorRole = user.role ?? null;
      }
      res.json(baseResponse);
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    if (error instanceof Error) res.status(500).json({ message: error.message });
    else res.status(500).json({ message: 'Server error' });
  }
};

// ── LOGOUT ───────────────────────────────────────────────────────────────────
export const logoutUser = (req: Request, res: Response): void => {
  res.cookie('jwt', '', { httpOnly: true, expires: new Date(0) });
  res.status(200).json({ message: 'Logged out successfully' });
};
