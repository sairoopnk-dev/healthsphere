import { Request, Response } from 'express';
import Doctor from '../models/Doctor';
import Appointment from '../models/Appointment';
import HospitalLocation from '../models/HospitalLocation';

// ── Haversine distance (km) ──────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Search doctors by name, specialty, and/or hospital ───────────────────────
export const searchDoctors = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, specialty, hospital } = req.body;

    const query: any = {};

    if (name) {
      // Fuzzy match: "Dr Ravi" matches "Dr. Ravindra Kumar"
      const parts = name.replace(/^dr\.?\s*/i, '').trim().split(/\s+/);
      const pattern = parts.map((p: string) => `(?=.*${p})`).join('');
      query.name = { $regex: new RegExp(pattern, 'i') };
    }

    if (specialty) {
      query.specialization = { $regex: new RegExp(specialty, 'i') };
    }

    if (hospital) {
      query.hospital = { $regex: new RegExp(hospital, 'i') };
    }

    // Only return doctors with completed profiles
    query.isProfileCompleted = true;

    const doctors = await Doctor.find(query)
      .select('doctorId name specialization hospital experience qualification gender')
      .limit(20)
      .lean();

    res.json({ success: true, doctors });
  } catch (error) {
    console.error('[VoiceBooking] searchDoctors error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Check availability for a doctor on a specific date/time ──────────────────
export const checkAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId, date, time } = req.body;

    if (!doctorId || !date) {
      res.status(400).json({ success: false, message: 'doctorId and date are required' });
      return;
    }

    const doctor = await Doctor.findOne({ doctorId });
    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }

    // Check if date is blocked
    if (doctor.blockedDates?.includes(date)) {
      res.json({
        success: true,
        available: false,
        reason: 'Doctor is on leave on this date.',
        availableSlots: [],
      });
      return;
    }

    // Generate all 30-min slots from 9 AM to 9 PM
    function formatSlot(d: Date): string {
      let h = d.getHours();
      const m = d.getMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
    }

    const todayYMD = new Date().toISOString().split('T')[0];
    const isToday = date === todayYMD;

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
    const availableSlots = allSlots.filter(s => !bookedSlots.includes(s));

    // If a specific time was requested, check if it's available
    if (time) {
      const isAvailable = availableSlots.includes(time);
      res.json({
        success: true,
        available: isAvailable,
        requestedSlot: time,
        reason: isAvailable ? 'Slot is available' : 'Slot is already booked or unavailable',
        availableSlots,
        doctorName: doctor.name,
        hospital: doctor.hospital,
      });
      return;
    }

    res.json({
      success: true,
      available: availableSlots.length > 0,
      availableSlots,
      doctorName: doctor.name,
      hospital: doctor.hospital,
    });
  } catch (error) {
    console.error('[VoiceBooking] checkAvailability error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Book appointment via voice ───────────────────────────────────────────────
export const voiceBook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, patientName, doctorId, date, timeSlot } = req.body;

    if (!patientId || !patientName || !doctorId || !date || !timeSlot) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

    const doctor = await Doctor.findOne({ doctorId });
    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }

    if (doctor.blockedDates?.includes(date)) {
      res.status(400).json({ success: false, message: 'Doctor is unavailable on this date.' });
      return;
    }

    // Prevent double booking
    const existingSlot = await Appointment.findOne({ doctorId, date, timeSlot, status: 'scheduled' });
    if (existingSlot) {
      // Return available alternatives
      const booked = await Appointment.find({ doctorId, date, status: 'scheduled' }).select('timeSlot');
      const bookedSlots = booked.map(a => a.timeSlot);

      function formatSlot(d: Date): string {
        let h = d.getHours();
        const m = d.getMinutes();
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
      }

      const allSlots: string[] = [];
      const start = new Date(); start.setHours(9, 0, 0, 0);
      const end = new Date(); end.setHours(21, 0, 0, 0);
      const cur = new Date(start);
      while (cur <= end) {
        allSlots.push(formatSlot(cur));
        cur.setMinutes(cur.getMinutes() + 30);
      }

      const alternativeSlots = allSlots.filter(s => !bookedSlots.includes(s));

      res.status(409).json({
        success: false,
        message: 'This slot is already booked.',
        alternativeSlots,
      });
      return;
    }

    const appointmentId = `APT-${Math.floor(10000 + Math.random() * 90000)}`;
    const appt = await Appointment.create({
      appointmentId,
      patientId,
      patientName,
      doctorId,
      doctorName: doctor.name,
      hospital: doctor.hospital,
      date,
      timeSlot,
      status: 'scheduled',
    });

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully!',
      appointment: {
        appointmentId: appt.appointmentId,
        doctorName: doctor.name,
        hospital: doctor.hospital,
        specialization: doctor.specialization,
        date,
        timeSlot,
      },
    });
  } catch (error) {
    console.error('[VoiceBooking] voiceBook error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Find nearest doctors by specialty + patient location ─────────────────────
export const nearestDoctors = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lat, lng, specialty, hospital, limit } = req.body;

    if (lat == null || lng == null) {
      res.status(400).json({ success: false, message: 'Patient location (lat, lng) is required.' });
      return;
    }
    if (!specialty) {
      res.status(400).json({ success: false, message: 'Specialty is required.' });
      return;
    }

    // 1. Find matching doctors
    const doctorQuery: any = { isProfileCompleted: true };
    // Map specialty terms to flexible stems for DB matching
    // e.g. "Cardiologist" → matches "Cardiology", "Cardiologist", etc.
    const specStemMap: Record<string, string> = {
      cardiologist: 'cardiol', dermatologist: 'dermatol', neurologist: 'neurol',
      orthopedic: 'orthop', pediatrician: 'pediat', psychiatrist: 'psychiat',
      ophthalmologist: 'ophthalm', gynecologist: 'gynecol', urologist: 'urol',
      oncologist: 'oncol', endocrinologist: 'endocrinol', gastroenterologist: 'gastroenter',
      pulmonologist: 'pulmonol', nephrologist: 'nephrol', rheumatologist: 'rheumatol',
      surgeon: 'surg', dentist: 'dent', ent: 'ent', general: 'general',
    };
    const stem = specStemMap[specialty.toLowerCase()] || specialty;
    doctorQuery.specialization = { $regex: new RegExp(stem, 'i') };
    if (hospital) {
      doctorQuery.hospital = { $regex: new RegExp(hospital, 'i') };
    }

    const doctors = await Doctor.find(doctorQuery)
      .select('doctorId name specialization hospital experience qualification gender blockedDates')
      .lean();

    if (!doctors.length) {
      res.json({ success: true, doctors: [], message: 'No matching doctors found.' });
      return;
    }

    // 2. Get all hospital locations in one query
    const hospitalNames = [...new Set(doctors.map((d: any) => d.hospital).filter(Boolean))];
    const locations = await HospitalLocation.find({
      hospitalName: { $in: hospitalNames.map(h => new RegExp(`^${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) }
    }).lean();

    const locationMap = new Map<string, { lat: number; lng: number; address: string }>();
    locations.forEach((loc: any) => {
      locationMap.set(loc.hospitalName.toLowerCase(), { lat: loc.lat, lng: loc.lng, address: loc.address });
    });

    // 3. Calculate distance and merge
    const todayYMD = new Date().toISOString().split('T')[0];

    // Get today's booked slots for all matching doctors in one query
    const doctorIds = doctors.map((d: any) => d.doctorId);
    const todayBookings = await Appointment.find({
      doctorId: { $in: doctorIds },
      date: todayYMD,
      status: 'scheduled',
    }).select('doctorId timeSlot').lean();

    const bookedMap = new Map<string, number>();
    todayBookings.forEach((b: any) => {
      bookedMap.set(b.doctorId, (bookedMap.get(b.doctorId) || 0) + 1);
    });

    // Total possible slots: 9AM-9PM in 30-min = 25 slots
    const TOTAL_SLOTS = 25;

    const results = doctors
      .map((doc: any) => {
        const locKey = doc.hospital?.toLowerCase();
        const loc = locKey ? locationMap.get(locKey) : null;
        if (!loc) return null; // Skip doctors without location

        const distance = haversineKm(lat, lng, loc.lat, loc.lng);
        const bookedCount = bookedMap.get(doc.doctorId) || 0;
        const isBlockedToday = doc.blockedDates?.includes(todayYMD);
        const availableSlotsToday = isBlockedToday ? 0 : Math.max(0, TOTAL_SLOTS - bookedCount);

        return {
          doctorId: doc.doctorId,
          name: doc.name,
          specialization: doc.specialization,
          hospital: doc.hospital,
          experience: doc.experience,
          gender: doc.gender,
          clinicAddress: loc.address,
          clinicLat: loc.lat,
          clinicLng: loc.lng,
          distanceKm: Math.round(distance * 10) / 10,
          availableSlotsToday,
          isBlockedToday: !!isBlockedToday,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.distanceKm - b.distanceKm)
      .slice(0, limit || 10);

    res.json({ success: true, doctors: results });
  } catch (error) {
    console.error('[VoiceBooking] nearestDoctors error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
