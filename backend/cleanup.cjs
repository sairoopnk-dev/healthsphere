const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.collection('medicalrecords');
    const result = await db.deleteMany({ type: 'consultation', title: new RegExp('Appointment', 'i') });
    console.log('Deleted ' + result.deletedCount + ' consultation records.');
  } catch (error) {
    console.error(error);
  } finally {
    mongoose.disconnect();
  }
}

cleanup();
