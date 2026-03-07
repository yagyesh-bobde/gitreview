/**
 * Typed GitHub REST API client using native fetch.
 *
 * Features:
 * - Proper Accept / Authorization / API-version headers
 * - Rate limit tracking from response headers
 * - ETag-based conditional requests (304 handling)
 * - Automatic pagination for list endpoints
 * - Typed error handling
 */

import type { GitHubApiOptions, GitHubApiResponse, GitHubRateLimit } from './types';
import { parseRateLimitHeaders, updateRateLimit, getRateLimitDelay } from '@/features/github/utils/rate-limit-tracker';
import { getETag, getCachedBody, setETagCache } from '@/features/github/utils/etag-cache';

const GITHUB_API_BASE = 'https://api.github.com';
const API_VERSION = '2022-11-28';

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class GitHubApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly documentationUrl?: string,
  ) {
    super(message);
    this.name = 'GitHubApiError';
  }

  get isRateLimited(): boolean {
    return this.status === 403 || this.status === 429;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

// ---------------------------------------------------------------------------
// Core request function
// ---------------------------------------------------------------------------

function buildHeaders(token: string, etag?: string, accept?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: accept ?? 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': API_VERSION,
  };
  if (etag) {
    headers['If-None-Match'] = etag;
  }
  return headers;
}

/**
 * Make a single request to the GitHub API.
 * Handles rate limiting, ETags, and error responses.
 */
export async function githubRequest<T>(
  path: string,
  options: GitHubApiOptions,
  accept?: string,
): Promise<GitHubApiResponse<T>> {
  const url = path.startsWith('http') ? path : `${GITHUB_API_BASE}${path}`;

  // Check rate limit before making the request
  const delay = getRateLimitDelay(options.token);
  if (delay > 0) {
    throw new GitHubApiError(
      429,
      `Rate limited. Resets in ${Math.ceil(delay / 1000)}s.`,
    );
  }

  // Check for cached ETag
  const cachedEtag = options.etag ?? getETag(url, options.token);
  const headers = buildHeaders(options.token, cachedEtag ?? undefined, accept);

  const response = await fetch(url, {
    method: 'GET',
    headers,
    signal: options.signal,
  });

  // Parse rate limit from every response
  const rateLimit: GitHubRateLimit = parseRateLimitHeaders(response.headers);
  updateRateLimit(options.token, rateLimit);

  const etag = response.headers.get('etag');

  // 304 Not Modified -- return cached body
  if (response.status === 304) {
    const cachedBody = getCachedBody<T>(url, options.token);
    if (cachedBody !== null) {
      return { data: cachedBody, etag, rateLimit, notModified: true };
    }
    // Cache miss after 304 should not happen, but fall through to re-fetch without etag
    const fallbackHeaders = buildHeaders(options.token, undefined, accept);
    const fallbackResponse = await fetch(url, {
      method: 'GET',
      headers: fallbackHeaders,
      signal: options.signal,
    });
    if (!fallbackResponse.ok) {
      await throwApiError(fallbackResponse);
    }
    const fallbackData = (await fallbackResponse.json()) as T;
    return { data: fallbackData, etag: fallbackResponse.headers.get('etag'), rateLimit, notModified: false };
  }

  // Error responses
  if (!response.ok) {
    await throwApiError(response);
  }

  const data = (await response.json()) as T;

  // Cache the ETag + body for future conditional requests
  if (etag) {
    setETagCache(url, options.token, etag, data);
  }

  return { data, etag, rateLimit, notModified: false };
}

async function throwApiError(response: Response): Promise<never> {
  let message: string;
  let documentationUrl: string | undefined;

  try {
    const body = await response.json();
    message = body.message ?? response.statusText;
    documentationUrl = body.documentation_url;
  } catch {
    message = response.statusText;
  }

  throw new GitHubApiError(response.status, message, documentationUrl);
}

// ---------------------------------------------------------------------------
// Paginated request
// ---------------------------------------------------------------------------

const LINK_NEXT_RE = /<([^>]+)>;\s*rel="next"/;

/**
 * Fetch all pages of a paginated GitHub API endpoint.
 * Items are concatenated in order.
 */
export async function githubPaginatedRequest<T>(
  path: string,
  options: GitHubApiOptions,
  /** Max pages to fetch (safety valve). Default: 10 */
  maxPages = 10,
): Promise<GitHubApiResponse<T[]>> {
  const separator = path.includes('?') ? '&' : '?';
  let url = path.startsWith('http')
    ? path
    : `${GITHUB_API_BASE}${path}${separator}per_page=100`;

  // Ensure per_page is set
  if (!url.includes('per_page=')) {
    url += `${url.includes('?') ? '&' : '?'}per_page=100`;
  }

  const allItems: T[] = [];
  let lastRateLimit: GitHubRateLimit | null = null;
  let lastEtag: string | null = null;
  let page = 0;

  while (url && page < maxPages) {
    const delay = getRateLimitDelay(options.token);
    if (delay > 0) {
      throw new GitHubApiError(429, `Rate limited. Resets in ${Math.ceil(delay / 1000)}s.`);
    }

    const headers = buildHeaders(options.token);
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: options.signal,
    });

    lastRateLimit = parseRateLimitHeaders(response.headers);
    updateRateLimit(options.token, lastRateLimit);
    lastEtag = response.headers.get('etag');

    if (!response.ok) {
      await throwApiError(response);
    }

    const data = (await response.json()) as T[];
    allItems.push(...data);

    // Check Link header for next page
    const linkHeader = response.headers.get('link');
    const match = linkHeader?.match(LINK_NEXT_RE);
    url = match ? match[1] : '';
    page++;
  }

  return {
    data: allItems,
    etag: lastEtag,
    rateLimit: lastRateLimit ?? { limit: 0, remaining: 0, reset: 0, used: 0 },
    notModified: false,
  };
}

// ---------------------------------------------------------------------------
// POST / PATCH / DELETE helpers
// ---------------------------------------------------------------------------

export async function githubPost<TBody, TResponse>(
  path: string,
  body: TBody,
  options: GitHubApiOptions,
): Promise<GitHubApiResponse<TResponse>> {
  const url = path.startsWith('http') ? path : `${GITHUB_API_BASE}${path}`;

  const delay = getRateLimitDelay(options.token);
  if (delay > 0) {
    throw new GitHubApiError(429, `Rate limited. Resets in ${Math.ceil(delay / 1000)}s.`);
  }

  const headers = buildHeaders(options.token);
  const response = await fetch(url, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  const rateLimit = parseRateLimitHeaders(response.headers);
  updateRateLimit(options.token, rateLimit);

  if (!response.ok) {
    await throwApiError(response);
  }

  const data = (await response.json()) as TResponse;
  return { data, etag: null, rateLimit, notModified: false };
}

export async function githubPatch<TBody, TResponse>(
  path: string,
  body: TBody,
  options: GitHubApiOptions,
): Promise<GitHubApiResponse<TResponse>> {
  const url = path.startsWith('http') ? path : `${GITHUB_API_BASE}${path}`;

  const delay = getRateLimitDelay(options.token);
  if (delay > 0) {
    throw new GitHubApiError(429, `Rate limited. Resets in ${Math.ceil(delay / 1000)}s.`);
  }

  const headers = buildHeaders(options.token);
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  const rateLimit = parseRateLimitHeaders(response.headers);
  updateRateLimit(options.token, rateLimit);

  if (!response.ok) {
    await throwApiError(response);
  }

  const data = (await response.json()) as TResponse;
  return { data, etag: null, rateLimit, notModified: false };
}

export async function githubDelete(
  path: string,
  options: GitHubApiOptions,
): Promise<void> {
  const url = path.startsWith('http') ? path : `${GITHUB_API_BASE}${path}`;

  const delay = getRateLimitDelay(options.token);
  if (delay > 0) {
    throw new GitHubApiError(429, `Rate limited. Resets in ${Math.ceil(delay / 1000)}s.`);
  }

  const headers = buildHeaders(options.token);
  const response = await fetch(url, {
    method: 'DELETE',
    headers,
    signal: options.signal,
  });

  const rateLimit = parseRateLimitHeaders(response.headers);
  updateRateLimit(options.token, rateLimit);

  if (!response.ok) {
    await throwApiError(response);
  }
}

/**
 * Fetch raw diff content (Accept: application/vnd.github.diff).
 */
export async function githubRawDiff(
  path: string,
  options: GitHubApiOptions,
): Promise<string> {
  const url = path.startsWith('http') ? path : `${GITHUB_API_BASE}${path}`;

  const delay = getRateLimitDelay(options.token);
  if (delay > 0) {
    throw new GitHubApiError(429, `Rate limited. Resets in ${Math.ceil(delay / 1000)}s.`);
  }

  const headers = buildHeaders(options.token, undefined, 'application/vnd.github.diff');
  const response = await fetch(url, {
    method: 'GET',
    headers,
    signal: options.signal,
  });

  const rateLimit = parseRateLimitHeaders(response.headers);
  updateRateLimit(options.token, rateLimit);

  if (!response.ok) {
    await throwApiError(response);
  }

  return response.text();
}
