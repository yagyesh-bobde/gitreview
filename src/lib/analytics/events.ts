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
  ACCOUNT_LINKED: 'account_linked',

  // Reviews
  PR_OPENED: 'pr_opened',
  REVIEW_REQUESTED: 'review_requested',
  REVIEW_COMPLETED: 'review_completed',
  COMMENT_POSTED: 'comment_posted',

  // Navigation / discovery
  DASHBOARD_VIEWED: 'dashboard_viewed',
  REPO_SELECTED: 'repo_selected',
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
