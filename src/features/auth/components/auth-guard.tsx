'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Client-side auth guard. Redirects unauthenticated users to /login.
 * Prefer middleware-level protection for most routes -- use this only
 * when you need client-side conditional rendering around auth state.
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return fallback ?? null;
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return <>{children}</>;
}
