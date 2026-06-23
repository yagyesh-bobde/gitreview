import 'server-only';
import { PostHog } from 'posthog-node';

/**
 * Server-side PostHog client for capturing events from route handlers,
 * server actions, and background jobs.
 *
 * In serverless / Fluid Compute, always `await client.shutdown()` after
 * capturing so events flush before the function suspends. Returns `null`
 * when no key is configured (e.g. local dev without analytics enabled).
 */
let client: PostHog | null | undefined;

export function getPostHogServer(): PostHog | null {
  if (client !== undefined) return client;

  const key = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const enabled =
    process.env.NODE_ENV === 'production' ||
    process.env.NEXT_PUBLIC_POSTHOG_ENABLED === 'true';

  if (!key || !enabled) {
    client = null;
    return client;
  }

  client = new PostHog(key, {
    host: 'https://us.i.posthog.com',
    flushAt: 1,
    flushInterval: 0,
  });
  return client;
}

/**
 * Capture a server-side event and flush immediately. Safe to call when
 * analytics are disabled — it no-ops.
 */
export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  const ph = getPostHogServer();
  if (!ph) return;
  ph.capture({ distinctId, event, properties });
  await ph.shutdown();
}
