import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { withApp, issueJwt, insertDoctor, insertHospital, clearDatabase } from './helpers';
import Doctor from '../models/Doctor';
import Hospital from '../models/Hospital';

describe('Test Helpers', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  describe('withApp', () => {
    it('should return a supertest agent', () => {
      const agent = withApp();
      expect(agent).toBeDefined();
      expect(agent.get).toBeDefined();
      expect(agent.post).toBeDefined();
    });

    it('should be able to make requests to the app', async () => {
      const agent = withApp();
      const response = await agent.get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('HealthSphere API is running');
    });
  });

  describe('issueJwt', () => {
    it('should issue a valid JWT token', () => {
      const payload = { userId: 'DOC-12345', role: 'doctor' };
      const token = issueJwt(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should encode the payload correctly', () => {
      const payload = { userId: 'DOC-12345', role: 'doctor' };
      const token = issueJwt(payload);
      
      // Decode the token (without verification for this test)
      const parts = token.split('.');
      const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      expect(decoded.userId).toBe('DOC-12345');
      expect(decoded.role).toBe('doctor');
    });
  });

  describe('insertDoctor', () => {
    it('should insert a doctor with default values', async () => {
      const doctor = await insertDoctor();
      expect(doctor).toBeDefined();
      expect(doctor.doctorId).toMatch(/^DOC-\d{5}$/);
      expect(doctor.name).toBe('Test Doctor');
      expect(doctor.email).toContain('@test.com');
      expect(doctor.isProfileCompleted).toBe(true);
      expect(doctor.hospitalId).toBeNull();
      expect(doctor.role).toBeNull();
    });

    it('should insert a doctor with overrides', async () => {
      const doctor = await insertDoctor({
        name: 'Custom Doctor',
        specialization: 'Cardiology',
        hospitalId: 'HOSP-12345',
        role: 'ADMIN',
      });
      expect(doctor.name).toBe('Custom Doctor');
      expect(doctor.specialization).toBe('Cardiology');
      expect(doctor.hospitalId).toBe('HOSP-12345');
      expect(doctor.role).toBe('ADMIN');
    });

    it('should persist the doctor to the database', async () => {
      const doctor = await insertDoctor({ doctorId: 'DOC-99999' });
      const retrieved = await Doctor.findOne({ doctorId: 'DOC-99999' });
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Doctor');
    });
  });

  describe('insertHospital', () => {
    it('should insert a hospital with default values', async () => {
      const hospital = await insertHospital();
      expect(hospital).toBeDefined();
      expect(hospital.hospitalId).toMatch(/^HOSP-\d{5}$/);
      expect(hospital.name).toBe('Test Hospital');
      expect(hospital.latitude).toBe(12.9716);
      expect(hospital.longitude).toBe(77.5946);
      expect(hospital.address).toContain('Test Street');
      expect(hospital.createdBy).toBe('DOC-12345');
    });

    it('should insert a hospital with overrides', async () => {
      const hospital = await insertHospital({
        name: 'Custom Hospital',
        latitude: 40.7128,
        longitude: -74.006,
        address: '456 Custom Ave',
        createdBy: 'DOC-54321',
      });
      expect(hospital.name).toBe('Custom Hospital');
      expect(hospital.latitude).toBe(40.7128);
      expect(hospital.longitude).toBe(-74.006);
      expect(hospital.address).toBe('456 Custom Ave');
      expect(hospital.createdBy).toBe('DOC-54321');
    });

    it('should persist the hospital to the database', async () => {
      const hospital = await insertHospital({ hospitalId: 'HOSP-99999' });
      const retrieved = await Hospital.findOne({ hospitalId: 'HOSP-99999' });
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Hospital');
    });
  });

  describe('clearDatabase', () => {
    it('should clear all collections', async () => {
      // Insert some data
      await insertDoctor({ doctorId: 'DOC-11111' });
      await insertHospital({ hospitalId: 'HOSP-11111' });

      // Verify data exists
      let doctorCount = await Doctor.countDocuments();
      let hospitalCount = await Hospital.countDocuments();
      expect(doctorCount).toBeGreaterThan(0);
      expect(hospitalCount).toBeGreaterThan(0);

      // Clear database
      await clearDatabase();

      // Verify data is gone
      doctorCount = await Doctor.countDocuments();
      hospitalCount = await Hospital.countDocuments();
      expect(doctorCount).toBe(0);
      expect(hospitalCount).toBe(0);
    });
  });
});
