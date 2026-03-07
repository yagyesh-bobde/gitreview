'use client';

import { useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

/**
 * Client component that auto-redirects to the github-link OAuth flow.
 * Shown after the server component validates the token and sets cookies.
 */
export function LinkRedirect() {
  useEffect(() => {
    // Small delay so the user sees the message before redirect
    const timer = setTimeout(() => {
      signIn('github-link', { callbackUrl: '/settings' });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
      <div className="max-w-sm text-center">
        <Loader2 className="mx-auto size-6 animate-spin text-zinc-400" />
        <h1 className="mt-4 text-lg font-semibold">Linking to GitReview</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Redirecting to GitHub to authorize your account...
        </p>
      </div>
    </div>
  );
}
