export const CACHE_TTL_SECONDS = {
  prMetadata: 60,
  prFiles: 120,
  prDiff: 300,
  prComments: 30,
} as const;

export const RATE_LIMITS = {
  ai: { maxRequests: 10, windowMs: 60_000 },
  github: { maxRequests: 100, windowMs: 60_000 },
} as const;

export const IMPACT_THRESHOLDS = {
  high: 100,
  medium: 30,
  low: 10,
} as const;
