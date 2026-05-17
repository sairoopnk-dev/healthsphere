import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

router.delete('/reset-db', async (req, res) => {
  // SAFETY: Protect reset route so it only runs in development
  if (process.env.NODE_ENV !== "development") {
    return res.status(403).json({ message: "Not allowed: Database reset is restricted to development environment." });
  }

  try {
    const db = mongoose.connection.db;
    if (!db) {
      return res.status(500).json({ message: "Database connection not established." });
    }

    const collections = await db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }

    res.json({ message: "Database reset successful: All collections have been cleared." });
  } catch (error: any) {
    console.error("Error resetting database:", error);
    res.status(500).json({ message: "Failed to reset database", error: error.message });
  }
});

export default router;
