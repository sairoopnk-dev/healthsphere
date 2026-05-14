import { Request, Response } from 'express';
import HospitalLocation from '../models/HospitalLocation';
import Doctor from '../models/Doctor';

// ── GET hospital location for a doctor (by hospitalName) ────────────────────
export const getDoctorLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId } = req.params;

    const doctor = await Doctor.findOne({ doctorId }).select('hospital');
    if (!doctor) { res.status(404).json({ message: 'Doctor not found' }); return; }
    if (!doctor.hospital) { res.json({ success: true, location: null }); return; }

    const location = await HospitalLocation.findOne({
      hospitalName: { $regex: new RegExp(`^${doctor.hospital.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });

    res.json({
      success: true,
      location: location ? {
        _id: location._id,
        hospitalName: location.hospitalName,
        address: location.address,
        lat: location.lat,
        lng: location.lng,
        updatedByDoctorId: location.updatedByDoctorId,
        synced: location.updatedByDoctorId !== doctorId,
        updatedAt: location.updatedAt,
      } : null,
    });
  } catch (error) {
    if (error instanceof Error) res.status(500).json({ message: error.message });
    else res.status(500).json({ message: 'Server error' });
  }
};

// ── UPSERT hospital location (create or update) ─────────────────────────────
export const upsertDoctorLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId } = req.params;
    const { address, lat, lng } = req.body;

    if (!address || lat == null || lng == null) {
      res.status(400).json({ message: 'address, lat, and lng are required.' });
      return;
    }

    const doctor = await Doctor.findOne({ doctorId }).select('hospital');
    if (!doctor) { res.status(404).json({ message: 'Doctor not found' }); return; }
    if (!doctor.hospital) {
      res.status(400).json({ message: 'Doctor has no hospital name set. Please complete profile setup first.' });
      return;
    }

    // Upsert the shared hospital location (case-insensitive match)
    const location = await HospitalLocation.findOneAndUpdate(
      { hospitalName: { $regex: new RegExp(`^${doctor.hospital.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
      {
        hospitalName: doctor.hospital,
        address,
        lat,
        lng,
        updatedByDoctorId: doctorId,
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Hospital location saved. All doctors at this hospital will see this location.',
      location: {
        _id: location._id,
        hospitalName: location.hospitalName,
        address: location.address,
        lat: location.lat,
        lng: location.lng,
        updatedByDoctorId: location.updatedByDoctorId,
        synced: false,
        updatedAt: location.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof Error) res.status(500).json({ message: error.message });
    else res.status(500).json({ message: 'Server error' });
  }
};
