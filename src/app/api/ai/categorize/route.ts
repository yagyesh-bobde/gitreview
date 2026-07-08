import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';

import { auth } from '@/features/auth/auth';
import { redisGet, redisSet } from '@/lib/redis';
import {
  DIFF_CATEGORIES,
  DIFF_CATEGORY_META,
  normalizeCategory,
} from '@/lib/ai/diff-categories';
import { heuristicCategory } from '@/lib/ai/heuristic-categorize';
import {
  generateJSON,
  isGeminiConfigured,
} from '@/features/ai-bar/lib/gemini-client';
import type {
  CategorizationFileInput,
  CategorizationRequest,
  CategorizationResult,
  FileCategory,
} from '@/types/ai';

// Categorization fans out to the model; give it a little headroom.
export const maxDuration = 30;

/** Max files we send to the model in one request. */
const MAX_FILES = 80;
/** Per-file patch budget (chars) so a single huge file can't blow the prompt. */
const PER_FILE_PATCH_CHARS = 1200;
/** How long a categorization stays cached (keyed by file shas, so PR-stable). */
const CACHE_TTL_SECONDS = 60 * 60 * 24; // 24h

function cacheKey(files: CategorizationFileInput[]): string {
  const fingerprint = files
    .map((f) => `${f.filename}:${f.sha}`)
    .sort()
    .join('|');
  const hash = createHash('sha1').update(fingerprint).digest('hex');
  return `ai:categorize:v1:${hash}`;
}

/** Fill in any files the model didn't return using the path heuristic. */
function withHeuristicFallback(
  files: CategorizationFileInput[],
  fromModel: Map<string, FileCategory>,
): FileCategory[] {
  return files.map((f) => {
    const modeled = fromModel.get(f.filename);
    if (modeled) return modeled;
    return { filename: f.filename, category: heuristicCategory(f.filename) };
  });
}

function buildPrompt(files: CategorizationFileInput[]): string {
  const categoryList = DIFF_CATEGORIES.map(
    (id) => `- ${id}: ${DIFF_CATEGORY_META[id].description}`,
  ).join('\n');

  const fileBlocks = files
    .map((f, i) => {
      const patch = f.patch
        ? f.patch.slice(0, PER_FILE_PATCH_CHARS)
        : '(no textual diff available — binary or too large)';
      return [
        `### File ${i + 1}: ${f.filename}`,
        `status: ${f.status} (+${f.additions} / -${f.deletions})`,
        '```diff',
        patch,
        '```',
      ].join('\n');
    })
    .join('\n\n');

  return [
    'You are classifying the files changed in a pull request so a reviewer can',
    'group and prioritize them. For each file, choose the SINGLE best-fitting',
    'category from this fixed list (use the exact id):',
    '',
    categoryList,
    '',
    'Base your decision primarily on what the diff actually changes, not just',
    'the filename. Add a short reason (max ~8 words).',
    '',
    'Return ONLY a JSON object of the form:',
    '{"files":[{"filename":"<exact path>","category":"<id>","reason":"<short>"}]}',
    'Include every file exactly once, using the exact filename given.',
    '',
    '## Files',
    '',
    fileBlocks,
  ].join('\n');
}

interface ModelResponse {
  files?: Array<{ filename?: string; category?: string; reason?: string }>;
}

async function categorizeWithModel(
  files: CategorizationFileInput[],
): Promise<Map<string, FileCategory>> {
  const result = new Map<string, FileCategory>();
  const valid = new Set(files.map((f) => f.filename));

  const response = await generateJSON<ModelResponse>(buildPrompt(files), {
    system:
      'You are a precise code-review assistant that classifies diffs into categories.',
  });

  for (const entry of response.files ?? []) {
    if (!entry.filename || !valid.has(entry.filename)) continue;
    result.set(entry.filename, {
      filename: entry.filename,
      category: normalizeCategory(entry.category),
      reason: entry.reason?.trim() || undefined,
    });
  }

  return result;
}

/**
 * POST /api/ai/categorize
 *
 * Classifies each changed file into a review category based on its diff.
 * Falls back to a filename heuristic when Gemini is unconfigured or errors,
 * so the client always receives a full categorization.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: CategorizationRequest;
  try {
    body = (await request.json()) as CategorizationRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const files = Array.isArray(body.files) ? body.files : [];
  if (files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 });
  }

  const key = cacheKey(files);

  // Cache hit — categorization is stable for a given set of file shas.
  const cached = await redisGet<CategorizationResult>(key);
  if (cached) {
    return NextResponse.json({ ...cached, source: 'cache' });
  }

  // Cap the number of files sent to the model; the remainder get the heuristic.
  const forModel = files.slice(0, MAX_FILES);

  let categories: FileCategory[];
  let source: CategorizationResult['source'];

  if (isGeminiConfigured()) {
    try {
      const modeled = await categorizeWithModel(forModel);
      categories = withHeuristicFallback(files, modeled);
      source = 'ai';
    } catch (err) {
      console.warn(
        '[api/ai/categorize] model call failed, using heuristic:',
        err instanceof Error ? err.message : err,
      );
      categories = withHeuristicFallback(files, new Map());
      source = 'heuristic';
    }
  } else {
    categories = withHeuristicFallback(files, new Map());
    source = 'heuristic';
  }

  const payload: CategorizationResult = { categories, source };

  // Only cache confident (AI) results; heuristic output is cheap to recompute
  // and we want to re-attempt the model once it becomes available.
  if (source === 'ai') {
    await redisSet(key, payload, CACHE_TTL_SECONDS);
  }

  return NextResponse.json(payload);
}
