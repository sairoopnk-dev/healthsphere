const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

async function clearDB() {
  try {
    console.log("Connecting to", uri);
    await mongoose.connect(uri);
    console.log("Connected DB:", mongoose.connection.name);
    
    const db = mongoose.connection.db;
    
    const collections = await db.collections();
    for (const collection of collections) {
      console.log(`Clearing collection: ${collection.collectionName}`);
      await collection.deleteMany({});
      
      console.log(`Dropping indexes for: ${collection.collectionName}`);
      try {
        await collection.dropIndexes();
      } catch (err) {
        console.log(`Error dropping indexes for ${collection.collectionName}:`, err.message);
      }
    }
    
    console.log("Database cleared and indexes dropped successfully.");
  } catch (error) {
    console.error("Error clearing database:", error);
  } finally {
    await mongoose.disconnect();
  }
}

clearDB();
