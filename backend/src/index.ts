import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import connectDB from './config/db';
import { startMedicationScheduler } from './utils/medicationScheduler';
import { startMedicationReminderScheduler } from './utils/medicationReminderScheduler';

dotenv.config();
connectDB().then(() => {
  startMedicationScheduler();
  startMedicationReminderScheduler();
});

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

import authRoutes          from './routes/authRoutes';
import patientRoutes       from './routes/patientRoutes';
import doctorRoutes        from './routes/doctorRoutes';
import aiRoutes            from './routes/aiRoutes';
import appointmentRoutes   from './routes/appointmentRoutes';
import medicalRecordRoutes from './routes/medicalRecordRoutes';
import notificationRoutes  from './routes/notificationRoutes';
import dietPlanRoutes      from './routes/dietPlanRoutes';
import prescriptionRoutes  from './routes/prescriptionRoutes';
import reminderRoutes      from './routes/reminderRoutes';
import voiceBookingRoutes  from './routes/voiceBookingRoutes';
import placesProxyRoutes   from './routes/placesProxyRoutes';
import hospitalRoutes      from './routes/hospitalRoutes';
import deluluRoutes        from './routes/deluluRoutes';
import symptomCheckerRoutes from './routes/symptomCheckerRoutes';

app.use('/api/auth',            authRoutes);
app.use('/api/patients',        patientRoutes);
app.use('/api/doctor',          doctorRoutes);
app.use('/api/ai',              aiRoutes);
app.use('/api/appointments',    appointmentRoutes);
app.use('/api/medical-records', medicalRecordRoutes);
app.use('/api/notifications',   notificationRoutes);
app.use('/api/diet-plans',      dietPlanRoutes);
app.use('/api/prescriptions',   prescriptionRoutes);
app.use('/api/reminders',       reminderRoutes);
app.use('/api/voice-booking',   voiceBookingRoutes);
app.use('/api/places',          placesProxyRoutes);
app.use('/api/hospital',        hospitalRoutes);
app.use('/api/delulu',          deluluRoutes);
app.use('/api/symptom-checker', symptomCheckerRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
