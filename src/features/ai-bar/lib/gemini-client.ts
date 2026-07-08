// Google Generative AI client (server-only)
//
// Thin wrapper around @google/generative-ai. Centralizes API-key handling and
// a JSON-mode helper so feature routes (categorization, summaries, chat) don't
// each re-instantiate the SDK or re-implement JSON parsing.
import 'server-only';

import { GoogleGenerativeAI } from '@google/generative-ai';

/** Default fast, cheap model. Overridable via env for easy upgrades. */
const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

let cachedClient: GoogleGenerativeAI | null = null;

export class GeminiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiConfigError';
  }
}

/** Whether a Gemini API key is configured. Lets callers pick a fallback path. */
export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiConfigError('GEMINI_API_KEY is not set');
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenerativeAI(apiKey);
  }
  return cachedClient;
}

interface GenerateJSONOptions {
  /** System-level instruction steering the model. */
  system?: string;
  /** Model id override. */
  model?: string;
  /** Sampling temperature (default low for deterministic structured output). */
  temperature?: number;
}

/**
 * Run a prompt in JSON mode and parse the result into `T`.
 *
 * Uses Gemini's `responseMimeType: 'application/json'` so the model returns a
 * bare JSON document. Throws on a missing key, an API error, or unparseable
 * output — callers decide how to fall back.
 */
export async function generateJSON<T>(
  prompt: string,
  options: GenerateJSONOptions = {},
): Promise<T> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: options.model ?? DEFAULT_MODEL,
    ...(options.system ? { systemInstruction: options.system } : {}),
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: options.temperature ?? 0.1,
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  try {
    return JSON.parse(text) as T;
  } catch {
    // Models occasionally wrap JSON in prose or fences despite JSON mode.
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]) as T;
    }
    throw new Error('Gemini returned unparseable JSON');
  }
}
