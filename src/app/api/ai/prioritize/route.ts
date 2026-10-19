import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';

import { auth } from '@/features/auth/auth';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { redisGet, redisSet } from '@/lib/redis';
import { askTypesafe, TypesafeError, type TypesafeChoiceQuestion } from '@/lib/ai/typesafe';
import { mapWithConcurrency } from '@/features/github/utils/concurrency';
import {
  PRIORITY_MIN_FILES,
  PRIORITY_PATCH_CHARS,
  TYPESAFE_KEY_HEADER,
  heuristicBucket,
  isAIPriorityBucket,
  type AIPriorityBucket,
  type FilePriority,
  type PriorityErrorCode,
  type PriorityFileInput,
  type PriorityResult,
  type PriorityStatus,
} from '@/features/ai-priority/lib/priority';

// Batches fan out to TypeSafe; give the whole run some headroom.
export const maxDuration = 60;

/** Max files sent to the model; the overflow lands in P2. */
const MAX_AI_FILES = 200;
/** Questions per TypeSafe request (they share one state object). */
const BATCH_SIZE = 25;
/** Parallel TypeSafe requests per run. */
const BATCH_CONCURRENCY = 4;
/** How long a result stays cached (keyed by file shas, so PR-stable). */
const CACHE_TTL_SECONDS = 60 * 60 * 24; // 24h

const CRITERIA: Record<AIPriorityBucket, string> = {
  p0: 'Critical: security, auth or permissions, payments or billing, data integrity, database migrations, or core business logic. A mistake here would be severe.',
  p1: 'Important: features, API contracts, state or data flow, or other non-trivial logic that deserves a careful read.',
  p2: 'Low risk: styling, copy, config, lockfiles, generated code, renames, formatting, small refactors, or assets.',
};

function errorResponse(error: PriorityErrorCode, status: number) {
  return NextResponse.json({ error }, { status });
}

function cacheKey(files: PriorityFileInput[]): string {
  const fingerprint = files
    .map((f) => `${f.filename}:${f.sha}`)
    .sort()
    .join('|');
  const hash = createHash('sha1').update(fingerprint).digest('hex');
  return `ai:prioritize:v1:${hash}`;
}

/** Validate the request body into well-formed inputs, or null if malformed. */
function parseFiles(body: unknown): PriorityFileInput[] | null {
  const raw = (body as { files?: unknown } | null)?.files;
  if (!Array.isArray(raw)) return null;

  const files: PriorityFileInput[] = [];
  for (const item of raw) {
    const f = item as Partial<Record<keyof PriorityFileInput, unknown>> | null;
    if (!f || typeof f.filename !== 'string' || typeof f.sha !== 'string') return null;
    files.push({
      filename: f.filename,
      sha: f.sha,
      status: typeof f.status === 'string' ? f.status : 'modified',
      additions: typeof f.additions === 'number' ? f.additions : 0,
      deletions: typeof f.deletions === 'number' ? f.deletions : 0,
      patch: typeof f.patch === 'string' ? f.patch : null,
    });
  }
  return files;
}

/** Rank one batch; files the model skipped or answered oddly default to P1. */
async function prioritizeBatch(
  batch: PriorityFileInput[],
  apiKey: string,
  signal: AbortSignal,
): Promise<FilePriority[]> {
  const state: Record<string, unknown> = {};
  const questions: Record<string, TypesafeChoiceQuestion> = {};

  batch.forEach((f, i) => {
    const id = `f${i + 1}`;
    state[id] = {
      path: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch
        ? f.patch.slice(0, PRIORITY_PATCH_CHARS)
        : '(no textual diff: binary or too large)',
    };
    questions[id] = {
      type: 'choice',
      instructions: `How carefully must a reviewer check the change to file ${id} (${f.filename})? Judge by what its diff actually changes, not just the path.`,
      criteria: CRITERIA,
    };
  });

  const answers = await askTypesafe({ apiKey, state, questions, signal });

  return batch.map((f, i) => {
    const answer = answers[`f${i + 1}`];
    if (!answer || !isAIPriorityBucket(answer.choice)) {
      return { filename: f.filename, bucket: 'p1' };
    }
    return {
      filename: f.filename,
      bucket: answer.choice,
      confidence: Number.isFinite(answer.confidence) ? answer.confidence : undefined,
    };
  });
}

/** Rank every file in parallel batches. Any failed batch aborts the rest. */
async function prioritizeWithModel(
  files: PriorityFileInput[],
  apiKey: string,
): Promise<Map<string, FilePriority>> {
  const batches: PriorityFileInput[][] = [];
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    batches.push(files.slice(i, i + BATCH_SIZE));
  }

  const controller = new AbortController();
  const results = await mapWithConcurrency(batches, BATCH_CONCURRENCY, async (batch) => {
    try {
      return await prioritizeBatch(batch, apiKey, controller.signal);
    } catch (err) {
      controller.abort();
      throw err;
    }
  });

  return new Map(results.flat().map((p) => [p.filename, p]));
}

/**
 * GET /api/ai/prioritize
 *
 * Whether the signed-in user still has their one free demo run.
 */
export async function GET() {
  const session = await auth();
  if (!session?.userId) return errorResponse('unauthenticated', 401);

  if (!process.env.TYPESAFE_API_KEY) {
    return NextResponse.json<PriorityStatus>({ demoAvailable: false });
  }

  const row = await getDb()
    .select({ aiDemoUsedAt: users.aiDemoUsedAt })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  return NextResponse.json<PriorityStatus>({ demoAvailable: !!row && row.aiDemoUsedAt === null });
}

/**
 * POST /api/ai/prioritize
 *
 * Buckets a PR's changed files into P0/P1/P2/Tests/Docs. Tests and docs are
 * decided by path; the rest are ranked by TypeSafe AI using either the key in
 * the `x-typesafe-key` header (used for this request only — never stored,
 * cached or logged) or, without one, the shared key as the user's single free
 * demo run. Cache hits are free and consume nothing.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.userId) return errorResponse('unauthenticated', 401);
  const userId = session.userId;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('invalid_request', 400);
  }

  const files = parseFiles(body);
  if (!files) return errorResponse('invalid_request', 400);
  if (files.length < PRIORITY_MIN_FILES) return errorResponse('too_few_files', 400);

  const ownKey = request.headers.get(TYPESAFE_KEY_HEADER)?.trim() || null;

  // Cache hit — a result is stable for a given set of file shas.
  const key = cacheKey(files);
  const cached = await redisGet<Pick<PriorityResult, 'files'>>(key);
  if (cached) {
    return NextResponse.json<PriorityResult>({ files: cached.files, source: 'cache' });
  }

  const buckets = new Map<string, FilePriority>();
  const forModel: PriorityFileInput[] = [];
  for (const f of files) {
    const bucket = heuristicBucket(f.filename);
    if (bucket) {
      buckets.set(f.filename, { filename: f.filename, bucket });
    } else if (forModel.length < MAX_AI_FILES) {
      forModel.push(f);
    } else {
      buckets.set(f.filename, { filename: f.filename, bucket: 'p2' });
    }
  }

  const toResult = (source: PriorityResult['source']): PriorityResult => ({
    files: files.map((f) => buckets.get(f.filename) ?? { filename: f.filename, bucket: 'p1' }),
    source,
  });

  // Only tests and docs: nothing to ask the model, so no demo is spent.
  if (forModel.length === 0) return NextResponse.json(toResult('heuristic'));

  const db = getDb();
  const demoKey = process.env.TYPESAFE_API_KEY;
  let apiKey: string;

  if (ownKey) {
    apiKey = ownKey;
  } else {
    if (!demoKey) return errorResponse('demo_unavailable', 403);
    // Claim the one free run atomically; concurrent requests can't both win.
    const claimed = await db
      .update(users)
      .set({ aiDemoUsedAt: sql`now()` })
      .where(and(eq(users.id, userId), isNull(users.aiDemoUsedAt)))
      .returning({ id: users.id });
    if (claimed.length === 0) return errorResponse('demo_used', 403);
    apiKey = demoKey;
  }

  try {
    const modeled = await prioritizeWithModel(forModel, apiKey);
    for (const [filename, priority] of modeled) buckets.set(filename, priority);
  } catch (err) {
    const status = err instanceof TypesafeError ? err.status : 0;
    console.warn(
      `[api/ai/prioritize] TypeSafe failed (${ownKey ? 'own key' : 'demo'}, status ${status})`,
    );

    if (!ownKey) {
      // Refund the demo run — the user got nothing for it.
      await db
        .update(users)
        .set({ aiDemoUsedAt: null })
        .where(eq(users.id, userId))
        .catch(() => console.error('[api/ai/prioritize] failed to refund demo run'));
    } else if (err instanceof TypesafeError && err.isAuthError) {
      return errorResponse('invalid_key', 401);
    }
    return errorResponse('prioritization_failed', 502);
  }

  const result = toResult(ownKey ? 'own-key' : 'demo');
  await redisSet<Pick<PriorityResult, 'files'>>(key, { files: result.files }, CACHE_TTL_SECONDS);
  return NextResponse.json(result);
}
