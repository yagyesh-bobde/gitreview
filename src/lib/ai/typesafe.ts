/**
 * Minimal server-side client for TypeSafe AI's SystemOne endpoint.
 *
 * Server-only: the API blocks browser origins (CORS) and keys must never reach
 * client bundles. The key is passed per call and never stored, so the same
 * client serves both the shared demo key and a user's own key.
 *
 * Errors deliberately carry only the HTTP status — never the key, request or
 * upstream body — so they're safe to log.
 */
import 'server-only';

const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone';
const TYPESAFE_MODEL = 'jev-latest';
/** Per-request timeout; a 25-file batch normally answers in about a second. */
const REQUEST_TIMEOUT_MS = 30_000;

export interface TypesafeChoiceQuestion {
  type: 'choice';
  instructions: string;
  /** label -> description of when to pick it. */
  criteria: Record<string, string>;
}

export interface TypesafeChoiceAnswer {
  type: 'choice';
  choice: string;
  confidence?: number;
  probabilities?: Record<string, number>;
}

interface TypesafeResponse {
  model?: string;
  answers?: Record<string, TypesafeChoiceAnswer | undefined>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

export class TypesafeError extends Error {
  constructor(readonly status: number) {
    super(`TypeSafe request failed (${status})`);
    this.name = 'TypesafeError';
  }

  /** The key was missing, invalid or lacks access. */
  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

interface AskOptions {
  apiKey: string;
  /** Shared context for every question (string or JSON object). */
  state: string | Record<string, unknown>;
  questions: Record<string, TypesafeChoiceQuestion>;
  signal?: AbortSignal;
}

/**
 * Ask a batch of choice questions against one shared state. Returns answers
 * keyed by question id; ids the model skipped are simply absent.
 */
export async function askTypesafe({
  apiKey,
  state,
  questions,
  signal,
}: AskOptions): Promise<Record<string, TypesafeChoiceAnswer | undefined>> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(TYPESAFE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: TYPESAFE_MODEL, state, questions }),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      cache: 'no-store',
    });
  } catch {
    // Network error, timeout or abort. 0 = no HTTP response.
    throw new TypesafeError(0);
  }

  if (!res.ok) throw new TypesafeError(res.status);

  const body = (await res.json().catch(() => null)) as TypesafeResponse | null;
  if (!body || typeof body.answers !== 'object' || body.answers === null) {
    throw new TypesafeError(502);
  }
  return body.answers;
}
