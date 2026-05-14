import { Request, Response } from 'express';
import DeluluChat, { type MoodTag } from '../models/DeluluChat';
import { getAIResponse } from '../utils/aiHandler';

/* ═══════════════════════════════════════════════════════════════════════════
   MOOD ANALYSIS — classifies user message sentiment
═══════════════════════════════════════════════════════════════════════════ */

import Sentiment from 'sentiment';
const sentimentAnalyzer = new Sentiment();

const NEGATIVE_WORDS = [
  'anxious', 'anxiety', 'stressed', 'stress', 'sad', 'depressed', 'depression',
  'hopeless', 'worthless', 'tired', 'exhausted', 'overwhelmed', 'scared',
  'afraid', 'worried', 'lonely', 'alone', 'hurt', 'pain', 'bad day',
  'terrible', 'awful', 'miserable', 'upset', 'angry', 'frustrated',
  'crying', 'cry', 'helpless', 'empty', 'broken', 'numb', 'lost',
];

const POSITIVE_WORDS = [
  'happy', 'great', 'good', 'amazing', 'wonderful', 'excited', 'grateful',
  'blessed', 'joyful', 'fantastic', 'better', 'improving', 'hopeful',
  'calm', 'peaceful', 'relaxed', 'confident', 'proud', 'love', 'cheerful',
];

function classifyMood(text: string): MoodTag {
  const lower = text.toLowerCase();
  const words: string[] = lower.match(/\b\w+\b/g) || [];

  // 1. Custom Emotion Tagging (Overrides)
  for (const w of NEGATIVE_WORDS) {
    if (w.includes(' ')) {
      if (lower.includes(w)) return 'negative';
    } else {
      if (words.includes(w)) return 'negative';
    }
  }

  for (const w of POSITIVE_WORDS) {
    if (words.includes(w)) return 'positive';
  }

  // 2. Real Sentiment Detection (Fallback)
  const result = sentimentAnalyzer.analyze(text);
  if (result.score < 0) return 'negative';
  if (result.score > 0) return 'positive';

  return 'neutral';
}

/* ═══════════════════════════════════════════════════════════════════════════
   WELLNESS SCORE CALCULATOR
   Derived from the last 10 messages mood distribution.
═══════════════════════════════════════════════════════════════════════════ */

function recalcWellnessScore(moodTags: MoodTag[]): number {
  if (moodTags.length === 0) return 70;
  const weights: Record<MoodTag, number> = { positive: 1, neutral: 0.5, negative: 0 };
  const sum = moodTags.reduce((acc, tag) => acc + weights[tag], 0);
  const raw = (sum / moodTags.length) * 100;
  // Clamp between 10 and 95 — never absolute 0 or 100
  return Math.min(95, Math.max(10, Math.round(raw)));
}

/* ═══════════════════════════════════════════════════════════════════════════
   SYSTEM PROMPT — Delulu personality
═══════════════════════════════════════════════════════════════════════════ */

const DELULU_SYSTEM = `
You are Delulu — an interactive, emotion-aware, and highly conversational mental health support companion on HealthSphere.

CORE BEHAVIOR:
- You are a supportive friend, a listener, and a gentle guide.
- You are NOT a doctor, NOT a symptom analyzer, and NOT a robotic chatbot.
- Keep the conversation flowing and deeply engaging.

RESPONSE STRUCTURE (MUST FOLLOW EVERY TIME):
1. Acknowledge Emotion + Emoji: Validate and reflect the user's feeling directly, appending one appropriate emoji at the end of the sentence.
2. Personalized Statement: Offer emotional support, light encouragement, reflection, or gentle suggestions. 
3. Follow-up Question: ALWAYS end your response with a question or gentle prompt to keep the user talking (e.g., "Want to talk about it?", "What happened today?", "Do you feel this often?").

TONE & STYLE:
- Warm, understanding, conversational, and slightly informal but not childish.
- Professional but friendly. Calm and human-like.
- If NEGATIVE emotion: Calm, supportive, reassuring.
- If POSITIVE emotion: Encouraging, celebratory.
- If NEUTRAL emotion: Curious, engaging.
- Occasionally suggest micro-actions (e.g., "Maybe taking a short break or writing it down could help. Want to try that?").

EMOJI USAGE (STRICT RULES):
✔ Use MAX 1–2 emojis per response.
✔ Place emojis naturally at the end of a sentence or thought.
✔ Emojis MUST match the user's emotional tone:
   - NEGATIVE (Sad 😔, Stressed 😓, Anxious 😟, Overwhelmed 😞, Tired 😴)
   - POSITIVE (Happy 😊, Relieved 😌, Excited 😄, Calm 🌿)
   - NEUTRAL (Curious 🤔, Reflective 💭)
✗ DO NOT spam emojis.
✗ DO NOT use emojis in every sentence.
✗ DO NOT use random or overly playful emojis.

MEMORY & CONTEXT:
- Actively use the provided Conversation History. 
- If the user repeats an emotion: "You mentioned feeling stressed before 😓… is it the same situation or something new?"
- If there's improvement: "You seem a bit better now 😊. Did something change?"

STRICT RULES:
✗ NO overly dramatic tone (Do not use phrases like "Oh honey...", "Oh my goodness", etc. Use calm phrasing like "I hear you... that sounds really exhausting 😓.")
✗ NO overly casual slang.
✗ NO generic responses (e.g., "That's unfortunate.")
✗ NO clinical/medical diagnosis or treatment advice.
✗ NO repetition of phrases.
✗ NO long paragraphs (keep it concise, 2-4 sentences max).
✗ If the user says "I feel hopeless" or expresses self-harm/suicide, respond with: "I’m really sorry you're feeling this way… you don’t have to go through it alone. Would you like me to help you find someone to talk to?"
`.trim();

/* ═══════════════════════════════════════════════════════════════════════════
   BUILD CONTEXT FROM PAST MESSAGES (last 8 turns for concise context)
═══════════════════════════════════════════════════════════════════════════ */

function buildConversationContext(
  messages: { role: string; content: string; timestamp: Date }[],
): string {
  if (messages.length === 0) return '';

  const recent = messages.slice(-8); // last 8 messages
  const lines = recent.map((m) => {
    const who = m.role === 'user' ? 'User' : 'Delulu';
    return `${who}: ${m.content}`;
  });

  return [
    '── Conversation History ──',
    ...lines,
    '── End History ──',
  ].join('\n');
}

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/delulu/chat
═══════════════════════════════════════════════════════════════════════════ */

export const deluluChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, message } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      res.status(400).json({ success: false, message: '"message" is required' });
      return;
    }
    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ success: false, message: '"userId" is required' });
      return;
    }

    const userMessage = message.trim().slice(0, 2000);
    const userMood = classifyMood(userMessage);

    // ── Fetch or create chat document ──
    let chat = await DeluluChat.findOne({ userId });
    if (!chat) {
      chat = await DeluluChat.create({ userId, messages: [], wellnessScore: 70 });
    }

    // ── Build AI prompt with history ──
    const historyContext = buildConversationContext(chat.messages as any);

    const prompt = [
      DELULU_SYSTEM,
      '',
      historyContext ? historyContext : '',
      '',
      `New message from user: "${userMessage}"`,
      '',
      'Respond as Delulu (empathetic, concise, supportive — 2-4 sentences):',
    ]
      .filter(Boolean)
      .join('\n');

    // ── Get AI reply ──
    let reply = '';
    try {
      reply = await getAIResponse(prompt, { timeoutMs: 25_000 });
    } catch {
      // Offline fallback — graceful degradation
      reply = offlineFallback(userMood);
    }

    // Clean up reply — remove any system noise
    reply = reply
      .replace(/^(Delulu:|Bot:|Assistant:)\s*/i, '')
      .trim()
      .slice(0, 2000);

    // ── Persist both messages ──
    const now = new Date();
    chat.messages.push(
      { role: 'user', content: userMessage, moodTag: userMood, timestamp: now } as any,
      { role: 'bot',  content: reply, moodTag: 'neutral', timestamp: now } as any,
    );

    // Keep last 200 messages to prevent unbounded growth
    if (chat.messages.length > 200) {
      chat.messages = chat.messages.slice(-200) as any;
    }

    // ── Recalculate wellness score from user mood history ──
    const userMoods = chat.messages
      .filter((m: any) => m.role === 'user' && m.moodTag)
      .slice(-10)
      .map((m: any) => m.moodTag as MoodTag);

    chat.wellnessScore = recalcWellnessScore(userMoods);
    chat.lastActive = now;

    await chat.save();

    res.status(200).json({
      success: true,
      reply,
      moodTag: userMood,
      wellnessScore: chat.wellnessScore,
    });
  } catch (error: any) {
    console.error('[Delulu] chat error:', error.message);
    res.status(500).json({ success: false, message: 'Delulu is resting. Please try again.', error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/delulu/history/:userId
   Returns chat history + wellness score
═══════════════════════════════════════════════════════════════════════════ */

export const getDeluluHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({ success: false, message: 'userId is required' });
      return;
    }

    const chat = await DeluluChat.findOne({ userId }).lean();

    if (!chat) {
      res.status(200).json({
        success: true,
        messages: [],
        wellnessScore: 70,
      });
      return;
    }

    // Return last 50 messages (to keep the frontend snappy)
    const messages = (chat.messages || []).slice(-50);

    res.status(200).json({
      success: true,
      messages,
      wellnessScore: chat.wellnessScore,
    });
  } catch (error: any) {
    console.error('[Delulu] getHistory error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch chat history', error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   OFFLINE FALLBACK — empathetic canned responses
═══════════════════════════════════════════════════════════════════════════ */

function offlineFallback(mood: MoodTag): string {
  const responses: Record<MoodTag, string[]> = {
    negative: [
      "I hear you, and it's completely okay to feel that way 😔 You don't have to go through this alone. Can you tell me a bit more about what's been weighing on you?",
      "That sounds really tough 😞 Your feelings are valid. What's been the hardest part today?",
      "I'm really glad you're talking about this 😓 Sometimes just expressing what's inside can help a little. What's been on your mind the most?",
    ],
    positive: [
      "That's wonderful to hear! 😊 I'm so happy you're feeling good today. What's been making things better?",
      "It's so great that you're in a positive space right now 🌿 Would you like to share what's been going well?",
    ],
    neutral: [
      "Thanks for checking in 🤔 How are you feeling inside — is there anything specific on your mind today?",
      "I'm here for you 💭 Sometimes it's the quiet days that need the most attention. How's your heart doing?",
    ],
  };

  const pool = responses[mood];
  return pool[Math.floor(Math.random() * pool.length)];
}
