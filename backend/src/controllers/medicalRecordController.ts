import { Request, Response } from 'express';
import MedicalRecord from '../models/MedicalRecord';
import { generateAiSummary } from '../utils/aiSummarizer';
import { getPatientHistory, storeMedicalReport } from '../utils/memoryService';
import { logInteraction, updateContextFromReport, buildEnrichedPrompt } from '../services/insightEngine';
import path from 'path';

/**
 * POST /api/medical-records
 * Creates a new medical record (prescription or report).
 */
export const createRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, doctorId, type, recordType, title, description, date } = req.body;

    if (!patientId || !type || !title || !description) {
      res.status(400).json({ success: false, message: 'patientId, type, title, and description are required.' });
      return;
    }

    const files = (req as any).files as Express.Multer.File[] | undefined;
    const attachments = files
      ? files.map((f) => `http://localhost:5000/uploads/${f.filename}`)
      : (req.body.attachments
          ? (Array.isArray(req.body.attachments) ? req.body.attachments : [req.body.attachments])
          : []);

    const record = await MedicalRecord.create({
      patientId,
      doctorId:   doctorId || undefined,
      type:       type || 'prescription',
      recordType: recordType === 'prescription' ? 'prescription' : 'report',
      title,
      description,
      date:       date ? new Date(date) : new Date(),
      attachments,
      aiSummary: null,
    });

    // ── Store in Hindsight memory ──
    storeMedicalReport(patientId, title, description).catch(() => {});

    // ── Log interaction for continuous learning ──
    logInteraction(
      patientId,
      recordType === 'prescription' ? 'prescription' : 'report_summary',
      `${title}: ${description.slice(0, 300)}`,
      'Record created',
    ).catch(() => {});

    res.status(201).json({ success: true, record });
  } catch (error: any) {
    console.error('[MedicalRecord] createRecord error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create record.', error: error.message });
  }
};

/**
 * GET /api/medical-records/:recordId
 * Returns a single medical record by its MongoDB _id.
 */
export const getRecordById = async (req: Request, res: Response): Promise<void> => {
  try {
    const record = await MedicalRecord.findById(req.params.recordId);
    if (!record) {
      res.status(404).json({ success: false, message: 'Record not found.' });
      return;
    }
    res.json({ success: true, record });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch record.', error: error.message });
  }
};

/**
 * POST /api/medical-records/summarize/:recordId
 * Generates an AI summary (one-time, idempotent).
 */
export const summarizeRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const { recordId } = req.params;
    const record = await MedicalRecord.findById(recordId);
    if (!record) {
      res.status(404).json({ success: false, message: 'Medical record not found.' });
      return;
    }

    if (record.aiSummary) {
      res.json({ success: true, alreadyExists: true, aiSummary: record.aiSummary, summaryGeneratedAt: record.summaryGeneratedAt });
      return;
    }

    const content = `Title: ${record.title}\n\nDetails: ${record.description}`;

    // ── Fetch enriched intelligence context ──
    const patientHistory = await buildEnrichedPrompt(
      record.patientId,
      `${record.type} ${record.title}`,
      'report_summary',
    );

    const result  = await generateAiSummary(content, record.type, record.title, patientHistory || undefined);

    const updated = await MedicalRecord.findOneAndUpdate(
      { _id: recordId, aiSummary: null },
      { $set: { aiSummary: result.formatted, summaryGeneratedAt: new Date() } },
      { new: true }
    );

    const finalSummary = updated?.aiSummary ?? record.aiSummary;
    const finalDate    = updated?.summaryGeneratedAt ?? record.summaryGeneratedAt;

    // ── Store summary in memory ──
    if (updated) {
      storeMedicalReport(record.patientId, record.title, record.description, result.formatted).catch(() => {});

      // ── Log interaction + update medical context ──
      logInteraction(
        record.patientId,
        'report_summary',
        `${record.title}: ${record.description.slice(0, 300)}`,
        result.formatted.slice(0, 500),
      ).catch(() => {});

      updateContextFromReport(
        record.patientId,
        record.title,
        result.formatted.slice(0, 500),
      ).catch(() => {});
    }

    res.json({ success: true, alreadyExists: !updated, aiSummary: finalSummary, summaryGeneratedAt: finalDate });
  } catch (error: any) {
    console.error('[AI Summarizer] Error:', error.message);
    res.status(500).json({ success: false, message: 'AI summarization failed.', error: error.message });
  }
};

/**
 * GET /api/medical-records/patient/:patientId
 * Returns all medical records for a patient, sorted by date DESC.
 * Optional query param ?recordType=prescription|report to filter by section.
 */
export const getPatientRecords = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;
    const { recordType } = req.query;

    const filter: Record<string, any> = { patientId };
    if (recordType === 'prescription' || recordType === 'report') {
      filter.recordType = recordType;
    }

    const records = await MedicalRecord.find(filter).sort({ date: -1, createdAt: -1 });
    res.json({ success: true, records });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch records.', error: error.message });
  }
};

/**
 * POST /api/medical-records/patient-upload
 * Patient uploads their own historical record (PDF or image).
 * Body fields: patientId, recordDate, title, recordType ("prescription" | "report")
 * File via multipart field name "file".
 */
export const uploadOwnRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, recordDate, title, recordType } = req.body;

    if (!patientId) {
      res.status(400).json({ success: false, message: 'patientId is required.' });
      return;
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    const fileUrl = file ? `http://localhost:5000/uploads/${file.filename}` : undefined;

    const originalName = file ? file.originalname : 'Unknown file';
    const ext          = file ? path.extname(file.originalname).toLowerCase() : '';
    const isImage      = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);

    // recordType from body overrides auto-detection
    const resolvedRecordType: 'prescription' | 'report' =
      recordType === 'prescription' ? 'prescription' : 'report';

    // Map to legacy fine-grained type
    const legacyType = resolvedRecordType === 'prescription'
      ? 'prescription'
      : isImage ? 'xray' : 'lab_report';

    const record = new MedicalRecord({
      patientId,
      type:       legacyType,
      recordType: resolvedRecordType,
      title:      title || originalName,
      description:`Patient-uploaded record${title ? ': ' + title : ''}. File: ${originalName}`,
      date:       recordDate ? new Date(recordDate) : new Date(),
      attachments:fileUrl ? [fileUrl] : [],
      aiSummary:  null,
    });
    await record.save();

    res.status(201).json({ success: true, record });
  } catch (error: any) {
    console.error('[MedicalRecord] uploadOwnRecord error:', error.message);
    res.status(500).json({ success: false, message: 'Upload failed.', error: error.message });
  }
};

/**
 * DELETE /api/medical-records/:recordId
 * Permanently deletes a single record by its MongoDB _id.
 */
export const deleteRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const { recordId } = req.params;
    const deleted = await MedicalRecord.findByIdAndDelete(recordId);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Record not found.' });
      return;
    }
    res.json({ success: true, message: 'Record permanently deleted.' });
  } catch (error: any) {
    console.error('[MedicalRecord] deleteRecord error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete record.', error: error.message });
  }
};

/**
 * DELETE /api/medical-records/bulk
 * Permanently deletes multiple records.
 * Body: { ids: string[] }
 */
export const bulkDeleteRecords = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body as { ids: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, message: 'ids must be a non-empty array.' });
      return;
    }

    const result = await MedicalRecord.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, deletedCount: result.deletedCount, message: `${result.deletedCount} record(s) permanently deleted.` });
  } catch (error: any) {
    console.error('[MedicalRecord] bulkDeleteRecords error:', error.message);
    res.status(500).json({ success: false, message: 'Bulk delete failed.', error: error.message });
  }
};
