import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getDb } from '@/lib/db';
import { airaMessages, type NewAiraMessage } from '@/lib/db/schema';

const MAX_MESSAGES_PER_BATCH = 100;
const MAX_TEXT_LENGTH = 16_384;
const MAX_ID_LENGTH = 256;
// Version-agnostic UUID (any RFC 4122 version 1-8), not pinned to v4.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AiraRole = 'user' | 'aira';

type ValidatedAiraMessage = {
  clientId: string;
  role: AiraRole;
  text: string;
  source?: string;
  imageKey?: string;
  createdAt: number;
};

type ValidatedSyncBody = {
  userId: string;
  messages: unknown[];
};

type RejectedMessage = {
  clientId?: string;
  index: number;
  error: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isAiraRole(value: unknown): value is AiraRole {
  return value === 'user' || value === 'aira';
}

function validateOptionalString(value: unknown, fieldName: string): string | undefined {
  // Columns are nullable, so treat JSON null the same as an omitted field.
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  if (value.length > MAX_ID_LENGTH) {
    throw new Error(`${fieldName} must be at most ${MAX_ID_LENGTH} characters`);
  }
  return value;
}

function validateMessage(value: unknown, index: number): ValidatedAiraMessage {
  if (!isRecord(value)) {
    throw new Error(`messages[${index}] must be an object`);
  }

  if (!isNonEmptyString(value.clientId) || value.clientId.length > MAX_ID_LENGTH) {
    throw new Error(
      `messages[${index}].clientId must be a non-empty string of at most ${MAX_ID_LENGTH} characters`,
    );
  }
  if (!isAiraRole(value.role)) {
    throw new Error(`messages[${index}].role must be user or aira`);
  }
  if (!isNonEmptyString(value.text) || value.text.length > MAX_TEXT_LENGTH) {
    throw new Error(
      `messages[${index}].text must be a non-empty string of at most ${MAX_TEXT_LENGTH} characters`,
    );
  }
  if (typeof value.createdAt !== 'number' || !Number.isFinite(value.createdAt)) {
    throw new Error(`messages[${index}].createdAt must be a number`);
  }
  if (Number.isNaN(new Date(value.createdAt).getTime())) {
    throw new Error(`messages[${index}].createdAt must be a valid ms epoch`);
  }

  return {
    clientId: value.clientId,
    role: value.role,
    text: value.text,
    source: validateOptionalString(value.source, `messages[${index}].source`),
    imageKey: validateOptionalString(value.imageKey, `messages[${index}].imageKey`),
    createdAt: value.createdAt,
  };
}

/**
 * Structural validation of the request body only. Individual messages are
 * validated per-message in the handler so one malformed message cannot wedge
 * an entire batch (clients retry batches until HTTP 200).
 */
function validateBody(value: unknown): ValidatedSyncBody {
  if (!isRecord(value)) {
    throw new Error('Body must be an object');
  }
  if (typeof value.userId !== 'string' || !UUID_REGEX.test(value.userId)) {
    throw new Error('userId must be a uuid string');
  }
  if (!Array.isArray(value.messages)) {
    throw new Error('messages must be an array');
  }
  if (value.messages.length === 0 || value.messages.length > MAX_MESSAGES_PER_BATCH) {
    throw new Error('messages length must be between 1 and 100');
  }

  return {
    userId: value.userId,
    messages: value.messages,
  };
}

function secretsMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    const paddedActual = Buffer.alloc(expectedBuffer.length);
    actualBuffer.copy(paddedActual, 0, 0, Math.min(actualBuffer.length, expectedBuffer.length));
    timingSafeEqual(paddedActual, expectedBuffer);
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

/**
 * POST /api/aira/sync
 *
 * Idempotently syncs Aira client messages into Postgres. Malformed messages are
 * skipped and reported rather than failing the whole batch, so a client that
 * retries until 200 can never be wedged by one permanently-bad message.
 */
export async function POST(request: Request) {
  const syncSecret = process.env.AIRA_SYNC_SECRET;
  if (!syncSecret) {
    return NextResponse.json({ error: 'Aira sync is not configured' }, { status: 503 });
  }

  const syncKey = request.headers.get('x-aira-sync-key');
  if (!syncKey || !secretsMatch(syncKey, syncSecret)) {
    return NextResponse.json({ error: 'Invalid sync key' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let body: ValidatedSyncBody;
  try {
    body = validateBody(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid body';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Validate each message independently: collect the valid ones (deduped by
  // clientId so a batch with repeats maps cleanly onto the (user_id, client_id)
  // primary key) and record the rejected ones for the client to drop.
  const validByClientId = new Map<string, ValidatedAiraMessage>();
  const rejected: RejectedMessage[] = [];

  body.messages.forEach((message, index) => {
    try {
      const validated = validateMessage(message, index);
      validByClientId.set(validated.clientId, validated);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'invalid message';
      const clientId =
        isRecord(message) &&
        isNonEmptyString(message.clientId) &&
        message.clientId.length <= MAX_ID_LENGTH
          ? message.clientId
          : undefined;
      rejected.push({ clientId, index, error: errorMessage });
    }
  });

  const validMessages = [...validByClientId.values()];

  // `accepted` counts every valid message we durably processed (newly inserted
  // OR already present), so an idempotent full resync reports the real total
  // rather than accepted: 0.
  if (validMessages.length === 0) {
    return NextResponse.json({ accepted: 0, rejected });
  }

  const values: NewAiraMessage[] = validMessages.map((message) => ({
    userId: body.userId,
    clientId: message.clientId,
    role: message.role,
    text: message.text,
    source: message.source,
    imageKey: message.imageKey,
    createdAt: new Date(message.createdAt),
  }));

  try {
    const db = getDb();
    await db
      .insert(airaMessages)
      .values(values)
      .onConflictDoNothing({ target: [airaMessages.userId, airaMessages.clientId] });
  } catch (error) {
    console.error('[aira/sync] database insert failed', error);
    return NextResponse.json({ error: 'database error' }, { status: 500 });
  }

  return NextResponse.json({ accepted: validMessages.length, rejected });
}
