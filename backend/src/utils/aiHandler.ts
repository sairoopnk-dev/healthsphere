import axios from 'axios';
import { GoogleGenAI } from '@google/genai';

// ─── Config ───────────────────────────────────────────────────────────────────
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;

// ─── Custom Error ─────────────────────────────────────────────────────────────
export class AIAllProvidersFailedError extends Error {
  constructor(message = 'All AI providers failed. Using offline fallback.') {
    super(message);
    this.name = 'AIAllProvidersFailedError';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Layer 1: Gemini ──────────────────────────────────────────────────────────
async function callGemini(
  prompt: string,
  maxRetries: number,
  timeoutMs: number,
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  let lastError: Error = new Error('Gemini: unknown error');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt }),
        timeoutMs,
        'Gemini',
      );
      const text = (response.text ?? '').trim();
      if (!text) throw new Error('Gemini returned empty response');
      return text;
    } catch (err: any) {
      lastError = err;
      console.error(`[AI] Gemini attempt ${attempt}/${maxRetries} failed:`, err?.message);
      if (attempt < maxRetries) await delay(500 * attempt);
    }
  }
  throw lastError;
}

// ─── Layer 2: Grok ────────────────────────────────────────────────────────────
async function callGrok(
  prompt: string,
  maxRetries: number,
  timeoutMs: number,
): Promise<string> {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) throw new Error('GROK_API_KEY not configured');

  let lastError: Error = new Error('Grok: unknown error');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await withTimeout(
        axios.post(
          'https://api.x.ai/v1/chat/completions',
          {
            model: 'grok-3',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
        timeoutMs,
        'Grok',
      );
      const text: string =
        response.data?.choices?.[0]?.message?.content?.trim() ?? '';
      if (!text) throw new Error('Grok returned empty response');
      return text;
    } catch (err: any) {
      lastError = err;
      console.error(`[AI] Grok attempt ${attempt}/${maxRetries} failed:`, err?.message);
      if (attempt < maxRetries) await delay(500 * attempt);
    }
  }
  throw lastError;
}

// ─── Unified Handler ──────────────────────────────────────────────────────────
export async function getAIResponse(
  prompt: string,
  options?: { timeoutMs?: number; maxRetries?: number },
): Promise<string> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, maxRetries = DEFAULT_MAX_RETRIES } =
    options ?? {};

  // Layer 1: Gemini
  try {
    const text = await callGemini(prompt, maxRetries, timeoutMs);
    console.log('[AI] Provider: Gemini ✓');
    return text;
  } catch (err: any) {
    console.error('[AI] Gemini failed — falling back to Grok:', err?.message);
  }

  // Layer 2: Grok
  try {
    const text = await callGrok(prompt, maxRetries, timeoutMs);
    console.log('[AI] Provider: Grok ✓');
    return text;
  } catch (err: any) {
    console.error('[AI] Grok failed — switching to offline fallback:', err?.message);
  }

  // Layer 3: signal offline
  console.warn('[AI] All providers failed. Offline fallback active.');
  throw new AIAllProvidersFailedError();
}
