/**
 * One-time script to clean up duplicate timeline entries in MedicalRecord.
 * Run with: npx ts-node src/scripts/cleanupDuplicates.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';

async function main() {
  if (!MONGO_URI) {
    console.error('No MONGODB_URI found in env');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const MedicalRecord = mongoose.connection.collection('medicalrecords');

  // 1. Find duplicates where appointmentId is not null
  //    Group by appointmentId, keep the oldest, delete the rest
  const pipeline = [
    { $match: { appointmentId: { $ne: null, $exists: true } } },
    {
      $group: {
        _id: '$appointmentId',
        count: { $sum: 1 },
        docs: { $push: '$_id' },
        oldest: { $min: '$_id' },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ];

  const duplicates = await MedicalRecord.aggregate(pipeline).toArray();

  if (duplicates.length === 0) {
    console.log('✅ No duplicate entries found. Database is clean.');
  } else {
    let totalDeleted = 0;
    for (const dup of duplicates) {
      // Keep the oldest, delete the rest
      const toDelete = dup.docs.filter(
        (id: any) => id.toString() !== dup.oldest.toString(),
      );
      if (toDelete.length > 0) {
        const result = await MedicalRecord.deleteMany({
          _id: { $in: toDelete },
        });
        totalDeleted += result.deletedCount;
        console.log(
          `  Cleaned appointmentId=${dup._id}: kept 1, deleted ${result.deletedCount}`,
        );
      }
    }
    console.log(`\n✅ Cleanup complete. Deleted ${totalDeleted} duplicate entries.`);
  }

  // 2. Also find duplicate consultation records by title+patientId+date (legacy duplicates without appointmentId)
  const legacyPipeline = [
    { $match: { type: 'consultation', $or: [{ appointmentId: null }, { appointmentId: { $exists: false } }] } },
    {
      $group: {
        _id: { patientId: '$patientId', title: '$title', date: '$date' },
        count: { $sum: 1 },
        docs: { $push: '$_id' },
        oldest: { $min: '$_id' },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ];

  const legacyDups = await MedicalRecord.aggregate(legacyPipeline).toArray();

  if (legacyDups.length === 0) {
    console.log('✅ No legacy duplicate consultation entries found.');
  } else {
    let legacyDeleted = 0;
    for (const dup of legacyDups) {
      const toDelete = dup.docs.filter(
        (id: any) => id.toString() !== dup.oldest.toString(),
      );
      if (toDelete.length > 0) {
        const result = await MedicalRecord.deleteMany({
          _id: { $in: toDelete },
        });
        legacyDeleted += result.deletedCount;
        console.log(
          `  Cleaned legacy dup "${dup._id.title}": kept 1, deleted ${result.deletedCount}`,
        );
      }
    }
    console.log(`\n✅ Legacy cleanup complete. Deleted ${legacyDeleted} duplicate entries.`);
  }

  await mongoose.disconnect();
  console.log('\nDone. Disconnected from MongoDB.');
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
