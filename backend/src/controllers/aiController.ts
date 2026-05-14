import { Request, Response } from 'express';
import { checkSymptomsAI } from '../utils/aiSymptomChecker';
import { matchDoctorAI } from '../utils/doctorMatcher';
import { simplifyReportAI } from '../utils/reportSimplifier';
import { storeSymptomCheck } from '../utils/memoryService';
import { sanitizeForAI } from '../utils/aiSanitizer';
import { generateFollowUpQuestionsAI } from '../utils/followUpQuestions';
import {
  buildEnrichedPrompt,
  logInteraction,
  getUserInsights,
  getEvolutionLevel,
  generateHealthReport,
} from '../services/insightEngine';

/* ═══════════════════════════════════════════════════════════════════════════
   CHECK SYMPTOMS — enriched with full intelligence context
═══════════════════════════════════════════════════════════════════════════ */

export const checkSymptoms = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;

    // ── Sanitize & validate — strips all PII before AI call ──
    let sanitizedData;
    try {
      sanitizedData = sanitizeForAI(req.body);
    } catch (sanitizeErr: any) {
      res.status(sanitizeErr.statusCode || 400).json({ success: false, message: sanitizeErr.message });
      return;
    }
    const { symptoms } = sanitizedData;

    // ── Fetch enriched intelligence context BEFORE AI call ──
    let patientHistory = '';
    if (userId) {
      patientHistory = await buildEnrichedPrompt(userId, symptoms, 'symptom_check');
    }

    // ── Call AI with sanitized + enriched prompt + follow-up answers ──
    const answers: { question: string; answer: string }[] = Array.isArray(req.body.answers) ? req.body.answers : [];
    const result = await checkSymptomsAI(symptoms, patientHistory || undefined, answers.length > 0 ? answers : undefined);

    // ── Store in Hindsight memory ──
    if (userId) {
      storeSymptomCheck(userId, symptoms.trim(), result).catch(() => {});
    }

    // ── Log interaction + update insights (continuous learning loop) ──
    if (userId) {
      logInteraction(
        userId,
        'symptom_check',
        symptoms.trim(),
        `Severity: ${result.severity}/10. ${result.explanation}`,
        {
          severity:   result.severity,
          conditions: result.possibleConditions || [],
        },
      ).catch(() => {});
    }

    // ── Fetch evolution level for response ──
    let evolution = null;
    if (userId) {
      evolution = await getEvolutionLevel(userId).catch(() => null);
    }

    res.status(200).json({
      success: true,
      data: result,
      memoryActive: !!patientHistory,
      evolution,
    });
  } catch (error: any) {
    console.error('[AI] checkSymptoms error:', error.message);
    res.status(500).json({ success: false, message: 'AI symptom analysis failed', error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   MATCH DOCTOR
═══════════════════════════════════════════════════════════════════════════ */

export const matchDoctor = async (req: Request, res: Response): Promise<void> => {
  try {
    // ── Sanitize & validate — strips all PII before AI call ──
    let sanitizedData;
    try {
      sanitizedData = sanitizeForAI(req.body);
    } catch (sanitizeErr: any) {
      res.status(sanitizeErr.statusCode || 400).json({ success: false, message: sanitizeErr.message });
      return;
    }
    const { symptoms } = sanitizedData;

    const result = await matchDoctorAI(symptoms);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[AI] matchDoctor error:', error.message);
    res.status(500).json({ success: false, message: 'AI doctor matching failed', error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   SIMPLIFY REPORT
═══════════════════════════════════════════════════════════════════════════ */

export const simplifyReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { report } = req.body;

    if (!report || typeof report !== 'string' || report.trim() === '') {
      res.status(400).json({ success: false, message: 'report field is required and must be a non-empty string' });
      return;
    }

    const result = await simplifyReportAI(report.trim());

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[AI] simplifyReport error:', error.message);
    res.status(500).json({ success: false, message: 'AI report simplification failed', error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   MEMORY INSIGHTS — enhanced with persistent insights + evolution
═══════════════════════════════════════════════════════════════════════════ */

export const getInsights = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId as string;

    if (!userId) {
      res.status(400).json({ success: false, message: 'userId is required' });
      return;
    }

    const [insights, evolution] = await Promise.all([
      getUserInsights(userId),
      getEvolutionLevel(userId),
    ]);

    res.status(200).json({
      success: true,
      data: {
        insights,
        evolution,
      },
    });
  } catch (error: any) {
    console.error('[AI] getInsights error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch insights', error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   EVOLUTION LEVEL
═══════════════════════════════════════════════════════════════════════════ */

export const getEvolution = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId as string;

    if (!userId) {
      res.status(400).json({ success: false, message: 'userId is required' });
      return;
    }

    const evolution = await getEvolutionLevel(userId);

    res.status(200).json({
      success: true,
      data: evolution,
    });
  } catch (error: any) {
    console.error('[AI] getEvolution error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch evolution level', error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   HEALTH INTELLIGENCE REPORT
═══════════════════════════════════════════════════════════════════════════ */

export const getHealthReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId as string;

    if (!userId) {
      res.status(400).json({ success: false, message: 'userId is required' });
      return;
    }

    const report = await generateHealthReport(userId);

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('[AI] getHealthReport error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to generate health report', error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   GENERATE FOLLOW-UP QUESTIONS — step 1 of 2-pass symptom flow
═══════════════════════════════════════════════════════════════════════════ */

export const generateQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { symptoms } = req.body;

    if (!symptoms || typeof symptoms !== 'string' || symptoms.trim() === '') {
      res.status(400).json({ success: false, message: '"symptoms" is required and must be a non-empty string' });
      return;
    }

    const questions = await generateFollowUpQuestionsAI(symptoms.trim());
    const safeQuestions = (questions || []).slice(0, 5);

    res.status(200).json({ success: true, questions: safeQuestions });
  } catch (error: any) {
    console.error('[AI] generateQuestions error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to generate follow-up questions', error: error.message });
  }
};
