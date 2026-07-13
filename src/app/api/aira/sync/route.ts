import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getDb } from '@/lib/db';
import { airaMessages, type NewAiraMessage } from '@/lib/db/schema';

const MAX_MESSAGES_PER_BATCH = 100;
const MAX_TEXT_LENGTH = 65_536;
const MAX_ID_LENGTH = 256;
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  messages: ValidatedAiraMessage[];
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
  if (value === undefined) {
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

function validateBody(value: unknown): ValidatedSyncBody {
  if (!isRecord(value)) {
    throw new Error('Body must be an object');
  }
  if (typeof value.userId !== 'string' || !UUID_V4_REGEX.test(value.userId)) {
    throw new Error('userId must be a uuid v4 string');
  }
  if (!Array.isArray(value.messages)) {
    throw new Error('messages must be an array');
  }
  if (value.messages.length === 0 || value.messages.length > MAX_MESSAGES_PER_BATCH) {
    throw new Error('messages length must be between 1 and 100');
  }

  return {
    userId: value.userId,
    messages: value.messages.map((message, index) => validateMessage(message, index)),
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
 * Idempotently syncs Aira client messages into Postgres.
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

  const values: NewAiraMessage[] = body.messages.map((message) => ({
    userId: body.userId,
    clientId: message.clientId,
    role: message.role,
    text: message.text,
    source: message.source,
    imageKey: message.imageKey,
    createdAt: new Date(message.createdAt),
  }));

  const db = getDb();
  const inserted = await db
    .insert(airaMessages)
    .values(values)
    .onConflictDoNothing({ target: [airaMessages.userId, airaMessages.clientId] })
    .returning({ clientId: airaMessages.clientId });

  return NextResponse.json({ accepted: inserted.length });
}
