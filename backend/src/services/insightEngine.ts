/**
 * Insight Engine — HealthSphere Hindsight Intelligence System
 *
 * Central module that powers pattern detection, prompt enrichment,
 * evolution tracking, and the health intelligence report.
 *
 * Every public function is async/await, uses try-catch, and degrades
 * gracefully so that the main AI flow is never blocked by analytics.
 */

import Interaction from '../models/Interaction';
import UserInsight, { type InsightConfidence, type InsightCategory } from '../models/UserInsight';
import MedicalContext from '../models/MedicalContext';
import { getMemory, formatMemoriesForPrompt } from '../utils/hindsightClient';
import Prescription from '../models/Prescription';

/* ═══════════════════════════════════════════════════════════════════════════
   KEYWORD DICTIONARIES
   Used to extract health-relevant terms from free-text user input.
═══════════════════════════════════════════════════════════════════════════ */

const SYMPTOM_KEYWORDS = [
  'headache', 'migraine', 'fever', 'fatigue', 'tiredness', 'nausea',
  'vomiting', 'cough', 'cold', 'sore throat', 'dizziness', 'chest pain',
  'shortness of breath', 'back pain', 'joint pain', 'muscle pain',
  'stomachache', 'stomach pain', 'abdominal pain', 'diarrhea', 'constipation',
  'insomnia', 'anxiety', 'stress', 'depression', 'rash', 'itching',
  'swelling', 'bleeding', 'palpitations', 'weight loss', 'weight gain',
  'blurry vision', 'ear pain', 'runny nose', 'body ache', 'weakness',
  'numbness', 'tingling', 'cramps', 'bloating', 'heartburn', 'sneezing',
  'wheezing', 'chills', 'sweating', 'loss of appetite',
];

const CONDITION_KEYWORDS = [
  'diabetes', 'hypertension', 'high blood pressure', 'asthma', 'arthritis',
  'anemia', 'thyroid', 'cholesterol', 'heart disease', 'kidney disease',
  'liver disease', 'cancer', 'stroke', 'epilepsy', 'migraine disorder',
  'copd', 'pneumonia', 'bronchitis', 'sinusitis', 'uti',
  'urinary tract infection', 'acid reflux', 'gerd', 'ibs',
  'irritable bowel', 'allergy', 'eczema', 'psoriasis',
];

const RISK_KEYWORDS = [
  'high sugar', 'high blood sugar', 'low blood sugar', 'high cholesterol',
  'high bp', 'low bp', 'overweight', 'obese', 'underweight',
  'smoking', 'alcohol', 'sedentary', 'irregular heartbeat',
];

const BEHAVIOR_KEYWORDS = [
  'skips meals', 'skip meals', 'irregular sleep', 'poor sleep',
  'no exercise', 'sedentary lifestyle', 'stress eating',
  'late night eating', 'junk food', 'overeating',
];

/* ═══════════════════════════════════════════════════════════════════════════
   EXTRACT KEYWORDS FROM INPUT
═══════════════════════════════════════════════════════════════════════════ */

interface ExtractedTerms {
  symptoms: string[];
  conditions: string[];
  risks: string[];
  behaviors: string[];
}

function extractHealthTerms(text: string): ExtractedTerms {
  const lower = text.toLowerCase();

  const match = (dict: string[]) =>
    dict.filter(kw => lower.includes(kw));

  return {
    symptoms:   match(SYMPTOM_KEYWORDS),
    conditions: match(CONDITION_KEYWORDS),
    risks:      match(RISK_KEYWORDS),
    behaviors:  match(BEHAVIOR_KEYWORDS),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONFIDENCE CALCULATOR
═══════════════════════════════════════════════════════════════════════════ */

function calcConfidence(count: number): InsightConfidence {
  if (count >= 7) return 'high';
  if (count >= 3) return 'medium';
  return 'low';
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. ANALYZE AND UPDATE INSIGHTS
   Extracts keywords and upserts insight documents for the user.
═══════════════════════════════════════════════════════════════════════════ */

export async function analyzeAndUpdateInsights(
  userId: string,
  content: string,
  metadata?: { conditions?: string[]; severity?: number },
): Promise<void> {
  try {
    const terms = extractHealthTerms(content);

    // Build a flat list: { pattern, category }
    const entries: { pattern: string; category: InsightCategory }[] = [
      ...terms.symptoms.map(s => ({ pattern: s, category: 'symptom' as InsightCategory })),
      ...terms.conditions.map(c => ({ pattern: c, category: 'condition' as InsightCategory })),
      ...terms.risks.map(r => ({ pattern: r, category: 'risk' as InsightCategory })),
      ...terms.behaviors.map(b => ({ pattern: b, category: 'behavior' as InsightCategory })),
    ];

    // Also include conditions from AI metadata (possibleConditions)
    if (metadata?.conditions?.length) {
      for (const cond of metadata.conditions) {
        const lower = cond.toLowerCase().trim();
        if (lower && !entries.some(e => e.pattern === lower)) {
          entries.push({ pattern: lower, category: 'condition' });
        }
      }
    }

    // Upsert each pattern
    const now = new Date();
    const ops = entries.map(({ pattern, category }) =>
      UserInsight.findOneAndUpdate(
        { userId, pattern },
        {
          $inc:         { count: 1 },
          $set:         { category, lastUpdated: now },
          $setOnInsert: { firstDetected: now },
        },
        { upsert: true, new: true },
      ).then(doc => {
        // Recalculate confidence based on new count
        if (doc) {
          const newConfidence = calcConfidence(doc.count);
          if (doc.confidence !== newConfidence) {
            return UserInsight.updateOne(
              { _id: doc._id },
              { $set: { confidence: newConfidence } },
            );
          }
        }
      }),
    );

    await Promise.all(ops);
  } catch (err) {
    console.error('[InsightEngine] analyzeAndUpdateInsights error:', err);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. GET USER INSIGHTS
   Returns all insights for a user, sorted by count DESC.
═══════════════════════════════════════════════════════════════════════════ */

export interface InsightItem {
  pattern: string;
  category: InsightCategory;
  count: number;
  confidence: InsightConfidence;
  firstDetected: Date;
  lastUpdated: Date;
}

export async function getUserInsights(userId: string): Promise<InsightItem[]> {
  try {
    const docs = await UserInsight.find({ userId })
      .sort({ count: -1 })
      .limit(30)
      .lean();

    return docs.map(d => ({
      pattern:       d.pattern,
      category:      d.category,
      count:         d.count,
      confidence:    d.confidence,
      firstDetected: d.firstDetected,
      lastUpdated:   d.lastUpdated,
    }));
  } catch (err) {
    console.error('[InsightEngine] getUserInsights error:', err);
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. BUILD ENRICHED PROMPT
   Constructs the memory/insight enrichment block for AI prompts.
═══════════════════════════════════════════════════════════════════════════ */

export async function buildEnrichedPrompt(
  userId: string,
  currentInput: string,
  interactionType: string,
): Promise<string> {
  if (!userId) return '';

  try {
    // Fetch all data sources in parallel
    const [
      recentInteractions,
      insights,
      medicalCtx,
      hindsightMemories,
    ] = await Promise.all([
      // Last 15 interactions
      Interaction.find({ userId })
        .sort({ timestamp: -1 })
        .limit(15)
        .lean()
        .catch(() => []),

      // User insights (top 15)
      UserInsight.find({ userId })
        .sort({ count: -1 })
        .limit(15)
        .lean()
        .catch(() => []),

      // Medical context
      MedicalContext.findOne({ userId })
        .lean()
        .catch(() => null),

      // Hindsight semantic recall
      getMemory(userId, currentInput, 10).catch(() => []),
    ]);

    const sections: string[] = [];

    // ── Section 1: Hindsight memories ──
    if (hindsightMemories.length > 0) {
      const memBlock = formatMemoriesForPrompt(hindsightMemories);
      if (memBlock) sections.push(memBlock);
    }

    // ── Section 2: Recent interactions ──
    if (recentInteractions.length > 0) {
      const lines = recentInteractions.slice(0, 10).map((inter: any, i: number) => {
        const date = new Date(inter.timestamp).toLocaleDateString();
        return `${i + 1}. [${inter.type}] (${date}) Input: "${inter.userInput.slice(0, 120)}"`;
      });
      sections.push([
        '── Recent Interactions ──',
        ...lines,
        '── End Recent Interactions ──',
      ].join('\n'));
    }

    // ── Section 3: Detected patterns (insights) ──
    if (insights.length > 0) {
      const lines = insights.map((ins: any) => {
        const conf = ins.confidence === 'high' ? '⚠️ HIGH' : ins.confidence === 'medium' ? '⚡ MEDIUM' : 'LOW';
        return `- ${ins.pattern} (${ins.category}, reported ${ins.count}x, confidence: ${conf})`;
      });
      sections.push([
        '── Detected Health Patterns ──',
        ...lines,
        '',
        'If any pattern is recurring or worsening, proactively mention it and suggest appropriate follow-up.',
        '── End Patterns ──',
      ].join('\n'));
    }

    // ── Section 4: Medical context ──
    if (medicalCtx) {
      const ctx: string[] = ['── Medical Context ──'];

      if (medicalCtx.conditions?.length) {
        ctx.push(`Known Conditions: ${(medicalCtx as any).conditions.join(', ')}`);
      }
      if (medicalCtx.medications?.length) {
        ctx.push(`Current Medications: ${(medicalCtx as any).medications.join(', ')}`);
      }
      if (medicalCtx.allergies?.length) {
        ctx.push(`Allergies: ${(medicalCtx as any).allergies.join(', ')}`);
      }
      if (medicalCtx.dietPreferences?.length) {
        ctx.push(`Diet Preferences: ${(medicalCtx as any).dietPreferences.join(', ')}`);
      }
      if ((medicalCtx as any).reports?.length) {
        const recentReports = (medicalCtx as any).reports.slice(-3);
        ctx.push('Recent Reports:');
        for (const r of recentReports) {
          ctx.push(`  - ${r.title}: ${r.summary.slice(0, 150)}`);
        }
      }

      ctx.push('── End Medical Context ──');
      if (ctx.length > 2) sections.push(ctx.join('\n'));
    }

    // Combine all
    if (sections.length === 0) return '';

    return [
      '',
      '╔══════════════════════════════════════════════════════════╗',
      '║          PATIENT INTELLIGENCE CONTEXT                   ║',
      '╚══════════════════════════════════════════════════════════╝',
      '',
      ...sections,
      '',
      'IMPORTANT: Use the above patient context to provide personalized, history-aware responses.',
      `This is a ${interactionType} interaction. Reference relevant history where applicable.`,
      '',
    ].join('\n');
  } catch (err) {
    console.error('[InsightEngine] buildEnrichedPrompt error:', err);
    return '';
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. GET EVOLUTION LEVEL
   Calculates the AI personalization level for a user.
═══════════════════════════════════════════════════════════════════════════ */

export interface EvolutionLevel {
  level: number;
  label: string;
  description: string;
  interactionCount: number;
  insightCount: number;
  nextLevelAt: number | null; // interactions needed for next level
  progress: number;           // 0-100 within current level
}

const EVOLUTION_TIERS = [
  { min: 0,  label: 'Generic',      description: 'AI provides standard responses' },
  { min: 5,  label: 'Learning',     description: 'AI is starting to learn your patterns' },
  { min: 10, label: 'Adaptive',     description: 'AI adapts responses to your history' },
  { min: 20, label: 'Personalized', description: 'AI is fully personalized to you' },
];

export async function getEvolutionLevel(userId: string): Promise<EvolutionLevel> {
  const defaultLevel: EvolutionLevel = {
    level: 1, label: 'Generic', description: 'AI provides standard responses',
    interactionCount: 0, insightCount: 0, nextLevelAt: 5, progress: 0,
  };

  if (!userId) return defaultLevel;

  try {
    const [interactionCount, insightCount] = await Promise.all([
      Interaction.countDocuments({ userId }),
      UserInsight.countDocuments({ userId }),
    ]);

    // Determine tier
    let tierIndex = 0;
    for (let i = EVOLUTION_TIERS.length - 1; i >= 0; i--) {
      if (interactionCount >= EVOLUTION_TIERS[i].min) {
        tierIndex = i;
        break;
      }
    }

    const tier = EVOLUTION_TIERS[tierIndex];
    const nextTier = EVOLUTION_TIERS[tierIndex + 1] || null;

    // Calculate progress within current tier
    let progress = 100;
    if (nextTier) {
      const rangeSize = nextTier.min - tier.min;
      const position = interactionCount - tier.min;
      progress = Math.min(100, Math.round((position / rangeSize) * 100));
    }

    return {
      level: tierIndex + 1,
      label: tier.label,
      description: tier.description,
      interactionCount,
      insightCount,
      nextLevelAt: nextTier ? nextTier.min : null,
      progress,
    };
  } catch (err) {
    console.error('[InsightEngine] getEvolutionLevel error:', err);
    return defaultLevel;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. GENERATE HEALTH INTELLIGENCE REPORT
═══════════════════════════════════════════════════════════════════════════ */

export interface ContextBulletGroup {
  category: string;
  items: string[];
}

export interface HealthReport {
  recurringIssues: { pattern: string; count: number; confidence: InsightConfidence }[];
  riskIndicators: { pattern: string; count: number; confidence: InsightConfidence }[];
  behaviorPatterns: { pattern: string; count: number; confidence: InsightConfidence }[];
  conditions: string[];
  medications: string[];
  allergies: string[];
  totalInteractions: number;
  reportGeneratedAt: string;
  contextSummary: string;
  contextBullets: ContextBulletGroup[];
}

/**
 * Groups related medical terms into human-readable categories.
 */
function groupTermsIntoCategories(
  conditions: string[],
  medications: string[],
  allergies: string[],
  insights: { pattern: string; category: string; count: number }[],
): ContextBulletGroup[] {
  const groups: ContextBulletGroup[] = [];

  // Map symptom insights into digestive, pain, neurological, respiratory, etc.
  const digestive = ['indigestion', 'acidity', 'bloating', 'gas', 'diarrhea', 'constipation',
    'stomachache', 'stomach pain', 'abdominal pain', 'heartburn', 'acid reflux', 'gerd',
    'ibs', 'irritable bowel', 'nausea', 'vomiting', 'loss of appetite'];
  const pain = ['headache', 'migraine', 'back pain', 'joint pain', 'muscle pain',
    'body ache', 'ear pain', 'cramps', 'chest pain'];
  const respiratory = ['cough', 'cold', 'sore throat', 'shortness of breath', 'wheezing',
    'sneezing', 'runny nose', 'sinusitis', 'bronchitis', 'pneumonia', 'asthma', 'copd'];
  const mental = ['anxiety', 'stress', 'depression', 'insomnia', 'poor sleep', 'irregular sleep'];
  const skinImmune = ['rash', 'itching', 'swelling', 'eczema', 'psoriasis', 'allergy'];

  const allPatterns = insights.map(i => i.pattern.toLowerCase());

  const match = (dict: string[]) => allPatterns.filter(p => dict.includes(p));

  const digestiveMatches = match(digestive);
  const painMatches = match(pain);
  const respiratoryMatches = match(respiratory);
  const mentalMatches = match(mental);
  const skinMatches = match(skinImmune);

  // Collect unmatched
  const matched = new Set([...digestiveMatches, ...painMatches, ...respiratoryMatches, ...mentalMatches, ...skinMatches]);
  const other = allPatterns.filter(p => !matched.has(p));

  if (digestiveMatches.length > 0) groups.push({ category: 'Digestive Issues', items: digestiveMatches });
  if (painMatches.length > 0) groups.push({ category: 'Pain & Discomfort', items: painMatches });
  if (respiratoryMatches.length > 0) groups.push({ category: 'Respiratory Issues', items: respiratoryMatches });
  if (mentalMatches.length > 0) groups.push({ category: 'Mental Health & Sleep', items: mentalMatches });
  if (skinMatches.length > 0) groups.push({ category: 'Skin & Immune', items: skinMatches });
  if (other.length > 0) groups.push({ category: 'Other Conditions', items: other });

  if (conditions.length > 0) {
    const existingPatterns = new Set(allPatterns);
    const uniqueConditions = conditions.filter(c => !existingPatterns.has(c.toLowerCase()));
    if (uniqueConditions.length > 0) {
      groups.push({ category: 'Known Medical Conditions', items: uniqueConditions });
    }
  }
  if (medications.length > 0) groups.push({ category: 'Current Medications', items: medications });
  if (allergies.length > 0) groups.push({ category: 'Allergies & Sensitivities', items: allergies });

  return groups;
}

/**
 * Generates a human-readable paragraph summarizing the patient's medical context.
 */
function generateContextParagraph(
  conditions: string[],
  medications: string[],
  allergies: string[],
  insights: { pattern: string; category: string; count: number }[],
): string {
  if (conditions.length === 0 && medications.length === 0 && allergies.length === 0 && insights.length === 0) {
    return '';
  }

  const parts: string[] = [];

  // Symptom summary
  const symptomInsights = insights.filter(i => i.category === 'symptom');
  if (symptomInsights.length > 0) {
    const topSymptoms = symptomInsights.slice(0, 5).map(s => s.pattern);
    if (topSymptoms.length === 1) {
      parts.push(`You have frequently reported experiencing ${topSymptoms[0]}.`);
    } else {
      const last = topSymptoms.pop();
      parts.push(`You have experienced symptoms such as ${topSymptoms.join(', ')} and ${last}. These may be related to your lifestyle, diet, or an underlying condition.`);
    }
  }

  // Conditions
  if (conditions.length > 0) {
    const condList = conditions.map(c => c.charAt(0).toUpperCase() + c.slice(1));
    if (condList.length === 1) {
      parts.push(`You have a known medical condition: ${condList[0]}.`);
    } else {
      const last = condList.pop();
      parts.push(`Your medical history includes conditions such as ${condList.join(', ')} and ${last}.`);
    }
  }

  // Medications
  if (medications.length > 0) {
    const medList = medications.map(m => m.charAt(0).toUpperCase() + m.slice(1));
    parts.push(`You are currently taking ${medList.join(', ')}.`);
  }

  // Allergies
  if (allergies.length > 0) {
    parts.push(`You have reported allergies or sensitivities to ${allergies.join(', ')}. It is important to avoid these triggers.`);
  }

  // Risk/behavior
  const riskInsights = insights.filter(i => i.category === 'risk' || i.category === 'behavior');
  if (riskInsights.length > 0) {
    const riskNames = riskInsights.slice(0, 3).map(r => r.pattern);
    parts.push(`Lifestyle factors such as ${riskNames.join(', ')} have been noted and may impact your overall health.`);
  }

  if (parts.length === 0) return '';

  return parts.join(' ') + ' We recommend discussing these patterns with your healthcare provider for personalized guidance.';
}

export async function generateHealthReport(userId: string): Promise<HealthReport> {
  const empty: HealthReport = {
    recurringIssues: [], riskIndicators: [], behaviorPatterns: [],
    conditions: [], medications: [], allergies: [],
    totalInteractions: 0, reportGeneratedAt: new Date().toISOString(),
    contextSummary: '', contextBullets: [],
  };

  if (!userId) return empty;

  try {
    const [insights, medicalCtx, interactionCount] = await Promise.all([
      UserInsight.find({ userId }).sort({ count: -1 }).lean(),
      MedicalContext.findOne({ userId }).lean(),
      Interaction.countDocuments({ userId }),
    ]);

    // Categorize insights
    const recurringIssues = insights
      .filter(i => i.category === 'symptom' || i.category === 'condition')
      .map(i => ({ pattern: i.pattern, count: i.count, confidence: i.confidence }));

    const riskIndicators = insights
      .filter(i => i.category === 'risk')
      .map(i => ({ pattern: i.pattern, count: i.count, confidence: i.confidence }));

    const behaviorPatterns = insights
      .filter(i => i.category === 'behavior')
      .map(i => ({ pattern: i.pattern, count: i.count, confidence: i.confidence }));

    const conditionsArr = medicalCtx?.conditions || [];
    const medicationsArr = medicalCtx?.medications || [];
    const allergiesArr = medicalCtx?.allergies || [];

    // Generate readable summary
    const allInsightsFlat = insights.map(i => ({
      pattern: i.pattern, category: i.category, count: i.count,
    }));

    const contextSummary = generateContextParagraph(
      conditionsArr, medicationsArr, allergiesArr, allInsightsFlat,
    );

    const contextBullets = groupTermsIntoCategories(
      conditionsArr, medicationsArr, allergiesArr, allInsightsFlat,
    );

    return {
      recurringIssues,
      riskIndicators,
      behaviorPatterns,
      conditions:  conditionsArr,
      medications: medicationsArr,
      allergies:   allergiesArr,
      totalInteractions: interactionCount,
      reportGeneratedAt: new Date().toISOString(),
      contextSummary,
      contextBullets,
    };
  } catch (err) {
    console.error('[InsightEngine] generateHealthReport error:', err);
    return empty;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. LOG INTERACTION (Continuous Learning Loop)
   Called after every AI interaction. Stores the interaction, updates
   insights, and enriches the medical context.
═══════════════════════════════════════════════════════════════════════════ */

export async function logInteraction(
  userId: string,
  type: 'symptom_check' | 'diet_plan' | 'report_summary' | 'prescription' | 'appointment',
  userInput: string,
  aiResponse: string,
  metadata?: { keywords?: string[]; severity?: number; conditions?: string[] },
): Promise<void> {
  if (!userId) return;

  try {
    // 1. Extract keywords if not supplied
    const terms = extractHealthTerms(userInput + ' ' + aiResponse);
    const keywords = metadata?.keywords?.length
      ? metadata.keywords
      : [...terms.symptoms, ...terms.conditions, ...terms.risks, ...terms.behaviors];

    // 2. Store interaction
    await Interaction.create({
      userId,
      type,
      userInput: userInput.slice(0, 2000),
      aiResponse: aiResponse.slice(0, 2000),
      metadata: {
        keywords,
        severity:   metadata?.severity,
        conditions: metadata?.conditions || terms.conditions,
      },
      timestamp: new Date(),
    });

    // 3. Update insights
    await analyzeAndUpdateInsights(userId, userInput + ' ' + aiResponse, {
      conditions: metadata?.conditions || terms.conditions,
      severity:   metadata?.severity,
    });

    // 4. Update medical context (merge new conditions, medications)
    const allConditions = [
      ...(metadata?.conditions || []),
      ...terms.conditions,
    ].map(c => c.toLowerCase().trim()).filter(Boolean);

    if (allConditions.length > 0) {
      await MedicalContext.findOneAndUpdate(
        { userId },
        {
          $addToSet: { conditions: { $each: allConditions } },
          $set:      { lastUpdated: new Date() },
        },
        { upsert: true },
      );
    }

    // 5. Sync active medications from prescriptions into context
    if (type === 'prescription' || type === 'symptom_check') {
      try {
        const activePrescriptions = await Prescription.find({ userId })
          .sort({ prescribedDate: -1 })
          .limit(5)
          .lean();

        if (activePrescriptions.length > 0) {
          const meds = activePrescriptions
            .flatMap((p: any) => p.medicines || [])
            .filter((m: any) => m.status === 'active')
            .map((m: any) => m.medicineName?.toLowerCase().trim())
            .filter(Boolean);

          if (meds.length > 0) {
            await MedicalContext.findOneAndUpdate(
              { userId },
              {
                $addToSet: { medications: { $each: [...new Set(meds)] } },
                $set:      { lastUpdated: new Date() },
              },
              { upsert: true },
            );
          }
        }
      } catch {
        // Prescription sync is best-effort
      }
    }
  } catch (err) {
    console.error('[InsightEngine] logInteraction error:', err);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. UPDATE MEDICAL CONTEXT FROM REPORT
   Called when a medical report is summarized to capture key findings.
═══════════════════════════════════════════════════════════════════════════ */

export async function updateContextFromReport(
  userId: string,
  title: string,
  summary: string,
): Promise<void> {
  if (!userId) return;

  try {
    await MedicalContext.findOneAndUpdate(
      { userId },
      {
        $push: {
          reports: {
            $each:     [{ title, summary: summary.slice(0, 500), date: new Date() }],
            $slice:    -10, // keep last 10 reports
            $position: 0,
          },
        },
        $set: { lastUpdated: new Date() },
      },
      { upsert: true },
    );
  } catch (err) {
    console.error('[InsightEngine] updateContextFromReport error:', err);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. GET RECENT SYMPTOMS
   Returns extracted symptom keywords from the user's last N interactions.
   Used by the diet plan generator in symptom-based mode.
═══════════════════════════════════════════════════════════════════════════ */

export async function getRecentSymptoms(userId: string, limit = 10): Promise<string[]> {
  if (!userId) return [];

  try {
    const recentInteractions = await Interaction.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    if (recentInteractions.length === 0) return [];

    // Collect all keywords from recent interactions
    const allKeywords = recentInteractions.flatMap((inter: any) =>
      inter.metadata?.keywords || [],
    );

    // Deduplicate and return unique symptoms
    const unique = [...new Set(allKeywords.map((k: string) => k.toLowerCase().trim()))].filter(Boolean);
    return unique;
  } catch (err) {
    console.error('[InsightEngine] getRecentSymptoms error:', err);
    return [];
  }
}
