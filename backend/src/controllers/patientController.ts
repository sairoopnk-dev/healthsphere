import { Request, Response } from 'express';
import Patient from '../models/Patient';
import MedicalRecord from '../models/MedicalRecord';
import Appointment from '../models/Appointment';

// ── GET Dashboard ────────────────────────────────────────────────────────────
export const getPatientDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const patientId = req.params.id;

    const patient = await Patient.findOne({ patientId }).select('-passwordHash');
    if (!patient) {
      res.status(404).json({ message: 'Patient not found' });
      return;
    }

    const timeline     = await MedicalRecord.find({ patientId }).sort({ date: -1 });
    const appointments = await Appointment.find({ patientId }).sort({ date: -1 });

    res.json({ profile: patient, timeline, appointments });
  } catch (error) {
    if (error instanceof Error) res.status(500).json({ message: error.message });
    else res.status(500).json({ message: 'Server error' });
  }
};

// ── SETUP PROFILE (first login) ───────────────────────────────────────────────
export const setupPatientProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;
    const { dob, gender, height, weight, bloodGroup, emergencyContact } = req.body;

    // Validate mandatory fields
    if (!dob || !gender || !emergencyContact?.name || !emergencyContact?.phone) {
      res.status(400).json({ message: 'DOB, gender, emergency contact name and phone are required.' });
      return;
    }

    const patient = await Patient.findOneAndUpdate(
      { patientId },
      {
        dob,
        gender,
        height:   height   ? Number(height)   : undefined,
        weight:   weight   ? Number(weight)    : undefined,
        bloodGroup: bloodGroup || '',
        emergencyContact: {
          name:  emergencyContact.name,
          phone: emergencyContact.phone,
        },
        isProfileCompleted: true,
      },
      { new: true }
    ).select('-passwordHash');

    if (!patient) {
      res.status(404).json({ message: 'Patient not found' });
      return;
    }

    res.json({ success: true, message: 'Profile setup complete.', profile: patient });
  } catch (error) {
    if (error instanceof Error) res.status(500).json({ message: error.message });
    else res.status(500).json({ message: 'Server error' });
  }
};

// ── UPDATE PROFILE (from edit settings modal) ─────────────────────────────────
export const updatePatientProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;
    const {
      name, contactNumber, email, address,
      dob, gender, height, weight, bloodGroup,
      emergencyContact,
    } = req.body;

    const updateFields: any = {};
    if (name)          updateFields.name          = name;
    if (contactNumber) updateFields.contactNumber  = contactNumber;
    if (email)         updateFields.email          = email;
    if (address !== undefined) updateFields.address = address;
    if (dob)           updateFields.dob            = dob;
    if (gender)        updateFields.gender         = gender;
    if (height !== undefined && height !== '') updateFields.height = Number(height);
    if (weight !== undefined && weight !== '') updateFields.weight = Number(weight);
    if (bloodGroup !== undefined) updateFields.bloodGroup = bloodGroup;
    if (emergencyContact?.name !== undefined)
      updateFields['emergencyContact.name']  = emergencyContact.name;
    if (emergencyContact?.phone !== undefined)
      updateFields['emergencyContact.phone'] = emergencyContact.phone;
    if (req.body.profilePicture !== undefined)
      updateFields.profilePicture = req.body.profilePicture;

    const patient = await Patient.findOneAndUpdate(
      { patientId },
      { $set: updateFields },
      { new: true }
    ).select('-passwordHash');

    if (!patient) {
      res.status(404).json({ message: 'Patient not found' });
      return;
    }

    res.json({ success: true, message: 'Profile updated.', profile: patient });
  } catch (error) {
    if (error instanceof Error) res.status(500).json({ message: error.message });
    else res.status(500).json({ message: 'Server error' });
  }
};

// ── ADD ADDRESS ──────────────────────────────────────────────────────────────
export const addPatientAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;
    const { label, fullAddress, lat, lng, isDefault } = req.body;

    if (!label || !fullAddress || lat == null || lng == null) {
      res.status(400).json({ message: 'label, fullAddress, lat, and lng are required.' });
      return;
    }

    const patient = await Patient.findOne({ patientId });
    if (!patient) { res.status(404).json({ message: 'Patient not found' }); return; }

    if (isDefault && patient.addresses) {
      patient.addresses.forEach((a: any) => { a.isDefault = false; });
    }

    if (!patient.addresses) (patient as any).addresses = [];
    (patient as any).addresses.push({ label, fullAddress, lat, lng, isDefault: !!isDefault });
    await patient.save();

    res.json({ success: true, message: 'Address added.', addresses: (patient as any).addresses });
  } catch (error) {
    if (error instanceof Error) res.status(500).json({ message: error.message });
    else res.status(500).json({ message: 'Server error' });
  }
};

// ── UPDATE ADDRESS ────────────────────────────────────────────────────────────
export const updatePatientAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, addressId } = req.params;
    const { label, fullAddress, lat, lng, isDefault } = req.body;

    const patient = await Patient.findOne({ patientId });
    if (!patient) { res.status(404).json({ message: 'Patient not found' }); return; }

    const addr = (patient as any).addresses?.find((a: any) => a._id.toString() === addressId);
    if (!addr) { res.status(404).json({ message: 'Address not found' }); return; }

    if (isDefault && (patient as any).addresses) {
      (patient as any).addresses.forEach((a: any) => { a.isDefault = false; });
    }

    if (label !== undefined) addr.label = label;
    if (fullAddress !== undefined) addr.fullAddress = fullAddress;
    if (lat !== undefined) addr.lat = lat;
    if (lng !== undefined) addr.lng = lng;
    if (isDefault !== undefined) addr.isDefault = isDefault;

    await patient.save();
    res.json({ success: true, message: 'Address updated.', addresses: (patient as any).addresses });
  } catch (error) {
    if (error instanceof Error) res.status(500).json({ message: error.message });
    else res.status(500).json({ message: 'Server error' });
  }
};

// ── DELETE ADDRESS ────────────────────────────────────────────────────────────
export const deletePatientAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, addressId } = req.params;

    const patient = await Patient.findOne({ patientId });
    if (!patient) { res.status(404).json({ message: 'Patient not found' }); return; }

    const before = (patient as any).addresses?.length || 0;
    if ((patient as any).addresses) {
      (patient as any).addresses = (patient as any).addresses.filter(
        (a: any) => a._id.toString() !== addressId
      );
    }
    if (((patient as any).addresses?.length || 0) === before) {
      res.status(404).json({ message: 'Address not found' }); return;
    }

    await patient.save();
    res.json({ success: true, message: 'Address deleted.', addresses: (patient as any).addresses });
  } catch (error) {
    if (error instanceof Error) res.status(500).json({ message: error.message });
    else res.status(500).json({ message: 'Server error' });
  }
};

// ── SET DEFAULT ADDRESS ───────────────────────────────────────────────────────
export const setDefaultAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, addressId } = req.params;

    const patient = await Patient.findOne({ patientId });
    if (!patient) { res.status(404).json({ message: 'Patient not found' }); return; }

    let found = false;
    (patient as any).addresses?.forEach((a: any) => {
      if (a._id.toString() === addressId) { a.isDefault = true; found = true; }
      else { a.isDefault = false; }
    });

    if (!found) { res.status(404).json({ message: 'Address not found' }); return; }

    await patient.save();
    res.json({ success: true, message: 'Default address updated.', addresses: (patient as any).addresses });
  } catch (error) {
    if (error instanceof Error) res.status(500).json({ message: error.message });
    else res.status(500).json({ message: 'Server error' });
  }
};
