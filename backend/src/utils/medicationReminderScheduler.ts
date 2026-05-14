/**
 * medicationReminderScheduler.ts
 *
 * Runs every minute via node-cron. Performs TWO checks:
 *
 * 1) PRESCRIPTION-BASED REMINDERS:
 *    For each active prescription medicine, uses frequency (once/twice/thrice)
 *    to determine default time slots and fires if current IST time matches.
 *
 * 2) PATIENT-SAVED CUSTOM REMINDERS (Reminder collection):
 *    For each active Reminder doc, checks if the current HH:MM matches any
 *    of the patient's chosen times and fires a notification.
 *
 * Both checks:
 *   - Deduplicate (no second notification within the same minute)
 *   - Create an in-app Notification in MongoDB
 *   - Auto-stop after endDate (prescription check) or if isActive = false (custom)
 */
import cron from 'node-cron';
import Prescription from '../models/Prescription';
import Notification  from '../models/Notification';
import Reminder      from '../models/Reminder';

// ── Default slots by frequency string ────────────────────────────────────
const FREQUENCY_SLOTS: Record<string, string[]> = {
  'once daily':          ['08:00'],
  'once a day':          ['08:00'],
  'od':                  ['08:00'],
  '1x':                  ['08:00'],
  'daily':               ['08:00'],
  'twice daily':         ['08:00', '20:00'],
  'twice a day':         ['08:00', '20:00'],
  'bd':                  ['08:00', '20:00'],
  'bid':                 ['08:00', '20:00'],
  '2x':                  ['08:00', '20:00'],
  'three times daily':   ['08:00', '14:00', '20:00'],
  'thrice daily':        ['08:00', '14:00', '20:00'],
  'three times a day':   ['08:00', '14:00', '20:00'],
  'tid':                 ['08:00', '14:00', '20:00'],
  '3x':                  ['08:00', '14:00', '20:00'],
  'every 8 hours':       ['08:00', '16:00', '00:00'],
  'every 12 hours':      ['08:00', '20:00'],
  'four times daily':    ['08:00', '12:00', '16:00', '20:00'],
  'before breakfast':    ['07:30'],
  'after meals':         ['09:00', '14:30', '21:00'],
  'before bed':          ['21:30'],
};

function normaliseFreq(freq: string): string {
  return (freq || '').toLowerCase().trim();
}

/** Returns "HH:MM" in Asia/Kolkata at the given moment */
function istTime(now: Date): string {
  return now.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'Asia/Kolkata',
  });
}

// ── Check 1: Prescription-based reminders ───────────────────────────────
async function checkPrescriptionReminders(now: Date, currentTime: string) {
  const prescriptions = await Prescription.find({ 'medicines.status': 'active' });

  for (const rx of prescriptions) {
    for (const med of rx.medicines) {
      if (med.status !== 'active') continue;

      // Auto-expire
      if (new Date(med.endDate) < now) {
        med.status = 'completed';
        await rx.save();
        continue;
      }

      const slots = FREQUENCY_SLOTS[normaliseFreq(med.frequency)] || [];
      if (!slots.includes(currentTime)) continue;

      // Dedup: avoid double-fire within the same minute
      const alreadySent = await Notification.findOne({
        patientId: rx.patientId,
        text:      { $regex: med.medicineName, $options: 'i' },
        createdAt: { $gte: new Date(now.getTime() - 60_000) },
      });
      if (alreadySent) continue;

      const text = `💊 Reminder: Take ${med.medicineName} (${med.dosage}) — ${med.frequency}`;

      await Notification.create({
        patientId: rx.patientId,
        type:      'prescription',
        text,
        date:      now.toISOString().slice(0, 10),
        isRead:    false,
      });

      console.log(`[MedReminder] ${text} → patient ${rx.patientId}`);
    }
  }
}

// ── Check 2: Patient-saved custom reminders ──────────────────────────────
async function checkCustomReminders(now: Date, currentTime: string) {
  const reminders = await Reminder.find({ isActive: true });

  for (const rem of reminders) {
    if (!rem.times.includes(currentTime)) continue;

    // Dedup
    const alreadySent = await Notification.findOne({
      patientId: rem.patientId,
      text:      { $regex: rem.medicineName, $options: 'i' },
      createdAt: { $gte: new Date(now.getTime() - 60_000) },
    });
    if (alreadySent) continue;

    const text = `🔔 Reminder: Take ${rem.medicineName} (${rem.dosage})`;

    await Notification.create({
      patientId: rem.patientId,
      type:      'prescription',
      text,
      date:      now.toISOString().slice(0, 10),
      isRead:    false,
    });

    console.log(`[CustomReminder] ${text} → patient ${rem.patientId}`);
  }
}

// ── Main job ────────────────────────────────────────────────────────────
async function runAllReminderChecks() {
  const now  = new Date();
  const time = istTime(now);

  await checkPrescriptionReminders(now, time);
  await checkCustomReminders(now, time);
}

export function startMedicationReminderScheduler() {
  // Run once immediately on startup (so we know it works)
  runAllReminderChecks().catch(err =>
    console.error('[MedReminder] Startup check failed:', err.message)
  );

  // Every minute  ┌─ min ─ hr ─ dom ─ month ─ dow
  cron.schedule('* * * * *', async () => {
    try {
      await runAllReminderChecks();
    } catch (err: any) {
      console.error('[MedReminder] Cron error:', err.message);
    }
  }, {
    timezone: 'Asia/Kolkata', // run in IST context
  });

  console.log('✅ Medication reminder scheduler started (every minute, IST).');
}
