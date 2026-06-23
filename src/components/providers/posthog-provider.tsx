'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

/**
 * Wraps the app with PostHog context (enables the `usePostHog` hook) and
 * keeps the identified user in sync with the auth session.
 *
 * PostHog is initialized in `instrumentation-client.ts`; this provider only
 * supplies the React context and handles identify/reset on auth changes.
 */
function UserIdentity() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;

    const user = session?.user;
    if (user?.id) {
      posthog.identify(user.id, {
        email: user.email ?? undefined,
        name: user.name ?? undefined,
      });
    } else if (status === 'unauthenticated') {
      // Clear identity on logout so subsequent events are anonymous.
      posthog.reset();
    }
  }, [session, status]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <UserIdentity />
      {children}
    </PHProvider>
  );
}
