import posthog from 'posthog-js';

/**
 * Central registry of product analytics events. Add new events here so names
 * stay consistent and discoverable instead of being scattered as string
 * literals across the codebase.
 */
export const AnalyticsEvent = {
  // Auth
  SIGNED_IN: 'signed_in',
  SIGNED_OUT: 'signed_out',
  ACCOUNT_LINK_STARTED: 'account_link_started',
  ACCOUNT_LINKED: 'account_linked',

  // Navigation / discovery
  DASHBOARD_VIEWED: 'dashboard_viewed',

  // PR review
  PR_REVIEW_VIEWED: 'pr_review_viewed',
  COMMENT_POSTED: 'comment_posted',
  REVIEW_SUBMITTED: 'review_submitted',
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

/**
 * Client-side event capture. No-ops safely if PostHog was not initialized
 * (e.g. analytics disabled in local dev).
 */
export function track(
  event: AnalyticsEventName,
  properties?: Record<string, unknown>,
): void {
  if (!posthog.__loaded) return;
  posthog.capture(event, properties);
}
