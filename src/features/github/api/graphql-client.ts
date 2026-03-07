/**
 * GitHub GraphQL API client.
 *
 * Used for queries that are more efficient via GraphQL (e.g. fetching
 * nested review threads with comments in a single request).
 */

import { GitHubApiError } from './client';
import { parseRateLimitHeaders, updateRateLimit, getRateLimitDelay } from '@/features/github/utils/rate-limit-tracker';

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

export interface GraphQLResponse<T> {
  data: T;
  errors?: Array<{ message: string; type?: string; path?: string[] }>;
}

/**
 * Execute a GitHub GraphQL query.
 *
 * @param token - GitHub access token
 * @param query - GraphQL query string
 * @param variables - Query variables
 */
export async function graphqlRequest<T>(
  token: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const delay = getRateLimitDelay(token);
  if (delay > 0) {
    throw new GitHubApiError(
      429,
      `Rate limited. Resets in ${Math.ceil(delay / 1000)}s.`,
    );
  }

  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  const rateLimit = parseRateLimitHeaders(response.headers);
  updateRateLimit(token, rateLimit);

  if (!response.ok) {
    let message: string;
    try {
      const body = await response.json();
      message = body.message ?? response.statusText;
    } catch {
      message = response.statusText;
    }
    throw new GitHubApiError(response.status, message);
  }

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors?.length) {
    const errorMessage = result.errors.map((e) => e.message).join('; ');
    throw new GitHubApiError(200, `GraphQL errors: ${errorMessage}`);
  }

  return result.data;
}
