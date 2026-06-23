// PostHog client-side initialization.
// Next.js automatically loads this file in the browser before the app hydrates.
import posthog from 'posthog-js';

const key = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

// Only initialize when a key is present AND analytics are enabled for this
// environment. Local dev is opted out by default to avoid polluting data —
// set NEXT_PUBLIC_POSTHOG_ENABLED=true to capture from localhost.
const enabled =
  process.env.NODE_ENV === 'production' ||
  process.env.NEXT_PUBLIC_POSTHOG_ENABLED === 'true';

if (key && enabled) {
  posthog.init(key, {
    api_host: '/ingest', // reverse proxy — see rewrites in next.config.ts
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.posthog.com',
    defaults: '2026-05-30',
    capture_pageview: 'history_change', // SPA-aware automatic pageviews
    capture_pageleave: true,
    capture_exceptions: true,
    person_profiles: 'identified_only',
  });
}
