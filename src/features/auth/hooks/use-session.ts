'use client';

import { useState, useEffect } from 'react';

interface Session {
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
  };
  accessToken: string | null;
}

interface UseSessionReturn {
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
}

/**
 * Client-side session hook.
 * Returns session data from NextAuth SessionProvider.
 * Currently returns a stub until auth is fully wired.
 */
export function useSession(): UseSessionReturn {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate session resolution
    const timer = setTimeout(() => setIsLoading(false), 0);
    return () => clearTimeout(timer);
  }, []);

  // Stub session -- replace with real NextAuth useSession when configured
  return {
    session: null,
    isLoading,
    isAuthenticated: false,
    accessToken: null,
  };
}
