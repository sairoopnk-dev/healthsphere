import request from 'supertest';
import jwt from 'jsonwebtoken';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import connectDB from '../config/db';
import Doctor, { IDoctor } from '../models/Doctor';
import Hospital, { IHospital } from '../models/Hospital';
import authRoutes from '../routes/authRoutes';
import patientRoutes from '../routes/patientRoutes';
import doctorRoutes from '../routes/doctorRoutes';
import aiRoutes from '../routes/aiRoutes';
import appointmentRoutes from '../routes/appointmentRoutes';
import medicalRecordRoutes from '../routes/medicalRecordRoutes';
import notificationRoutes from '../routes/notificationRoutes';
import dietPlanRoutes from '../routes/dietPlanRoutes';
import prescriptionRoutes from '../routes/prescriptionRoutes';
import reminderRoutes from '../routes/reminderRoutes';
import voiceBookingRoutes from '../routes/voiceBookingRoutes';
import placesProxyRoutes from '../routes/placesProxyRoutes';
import hospitalRoutes from '../routes/hospitalRoutes';
import deluluRoutes from '../routes/deluluRoutes';
import symptomCheckerRoutes from '../routes/symptomCheckerRoutes';

dotenv.config();

/**
 * Creates and returns a fresh Express app instance configured with all routes.
 * Used for integration testing with supertest.
 *
 * @returns supertest agent bound to the Express app
 */
export function withApp() {
  const app = express();

  // Middleware
  app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001'], credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  // Serve uploaded files as static
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Test Route
  app.get('/', (req, res) => {
    res.send('HealthSphere API is running...');
  });

  // Mount all routes
  app.use('/api/auth', authRoutes);
  app.use('/api/patients', patientRoutes);
  app.use('/api/doctor', doctorRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/medical-records', medicalRecordRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/diet-plans', dietPlanRoutes);
  app.use('/api/prescriptions', prescriptionRoutes);
  app.use('/api/reminders', reminderRoutes);
  app.use('/api/voice-booking', voiceBookingRoutes);
  app.use('/api/places', placesProxyRoutes);
  app.use('/api/hospital', hospitalRoutes);
  app.use('/api/delulu', deluluRoutes);
  app.use('/api/symptom-checker', symptomCheckerRoutes);

  return request(app);
}

/**
 * Issues a JWT token with the given payload, signed with the same secret
 * that the app's requireAuth middleware uses.
 *
 * @param payload - The JWT payload (e.g. { userId: 'DOC-12345', role: 'doctor' })
 * @returns The signed JWT token string
 */
export function issueJwt(payload: Record<string, any>): string {
  return jwt.sign(payload, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
}

/**
 * Inserts a Doctor record into the database with deterministic fields.
 * Useful for seeding test fixtures.
 *
 * @param overrides - Partial Doctor fields to override defaults
 * @returns The created Doctor document
 */
export async function insertDoctor(overrides?: Partial<IDoctor>): Promise<IDoctor> {
  const defaults = {
    doctorId: `DOC-${Math.floor(10000 + Math.random() * 90000)}`,
    name: 'Test Doctor',
    email: `doctor-${Date.now()}@test.com`,
    passwordHash: 'hashed_password',
    contactNumber: '9876543210',
    isProfileCompleted: true,
    specialization: 'General Medicine',
    hospital: '',
    qualification: 'MBBS',
    designation: 'Doctor',
    experience: 5,
    gender: 'M',
    hospitalId: null,
    role: null,
    blockedDates: [],
  };

  const doctor = new Doctor({ ...defaults, ...overrides });
  return doctor.save();
}

/**
 * Inserts a Hospital record into the database with deterministic fields.
 * Useful for seeding test fixtures.
 *
 * @param overrides - Partial Hospital fields to override defaults
 * @returns The created Hospital document
 */
export async function insertHospital(overrides?: Partial<IHospital>): Promise<IHospital> {
  const defaults = {
    hospitalId: `HOSP-${Math.floor(10000 + Math.random() * 90000)}`,
    name: 'Test Hospital',
    latitude: 12.9716,
    longitude: 77.5946,
    address: '123 Test Street, Bengaluru',
    createdBy: 'DOC-12345',
  };

  const hospital = new Hospital({ ...defaults, ...overrides });
  return hospital.save();
}

/**
 * Clears all collections from the database.
 * Useful for test cleanup between test cases.
 */
export async function clearDatabase(): Promise<void> {
  if (Doctor.db.db) {
    const collections = await Doctor.db.db.listCollections().toArray();
    for (const collection of collections) {
      await Doctor.db.db.collection(collection.name).deleteMany({});
    }
  }
}
