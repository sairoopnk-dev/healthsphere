/**
 * medicationScheduler.ts
 *
 * Runs daily at midnight (00:00).
 * Scans all prescriptions and marks any medicine whose endDate
 * has passed as "completed". This drives the automatic Active → Past transition.
 */
import cron from 'node-cron';
import Prescription from '../models/Prescription';

export async function runMedicationStatusUpdate() {
  const now = new Date();
  // Find prescriptions that still have at least one active medicine whose endDate has passed
  const prescriptions = await Prescription.find({
    'medicines.status': 'active',
  });

  let updatedCount = 0;
  for (const prescription of prescriptions) {
    let modified = false;
    for (const medicine of prescription.medicines) {
      if (medicine.status === 'active' && new Date(medicine.endDate) < now) {
        medicine.status = 'completed';
        modified = true;
        updatedCount++;
      }
    }
    if (modified) await prescription.save();
  }

  if (updatedCount > 0) {
    console.log(`[MedicationScheduler] ✅ Marked ${updatedCount} medicine(s) as completed.`);
  }
}

export function startMedicationScheduler() {
  // Run once on startup to catch any overnight transitions
  runMedicationStatusUpdate().catch(err =>
    console.error('[MedicationScheduler] Startup check failed:', err.message)
  );

  // Daily at midnight: "0 0 * * *"
  cron.schedule('0 0 * * *', async () => {
    try {
      await runMedicationStatusUpdate();
    } catch (err: any) {
      console.error('[MedicationScheduler] Cron error:', err.message);
    }
  });

  console.log('✅ Medication duration scheduler started (runs daily at midnight).');
}
