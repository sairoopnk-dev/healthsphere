import { Router } from 'express';
import { upload } from '../utils/upload';
import {
  createRecord,
  getRecordById,
  summarizeRecord,
  getPatientRecords,
  uploadOwnRecord,
  deleteRecord,
  bulkDeleteRecords,
} from '../controllers/medicalRecordController';

const router = Router();

// ── Patient self-upload (PDF / image with custom date + recordType) ─────────
// POST /api/medical-records/patient-upload
router.post('/patient-upload', upload.single('file'), uploadOwnRecord);

// ── Bulk delete (MUST be before /:recordId wildcard) ───────────────────────
// DELETE /api/medical-records/bulk
router.delete('/bulk', bulkDeleteRecords);

// ── AI Summarization (one-time per record) ────────────────────────────────
// POST /api/medical-records/summarize/:recordId
router.post('/summarize/:recordId', summarizeRecord);

// ── Patient view: all records (sorted by date DESC) ──────────────────────
// GET /api/medical-records/patient/:patientId[?recordType=prescription|report]
router.get('/patient/:patientId', getPatientRecords);

// ── Creation (doctor adds record for a patient) ──────────────────────────
// POST /api/medical-records
router.post('/', upload.array('attachments', 5), createRecord);

// ── Single record delete ──────────────────────────────────────────────────
// DELETE /api/medical-records/:recordId
router.delete('/:recordId', deleteRecord);

// ── Single record fetch (MUST be last) ───────────────────────────────────
// GET /api/medical-records/:recordId
router.get('/:recordId', getRecordById);

export default router;
