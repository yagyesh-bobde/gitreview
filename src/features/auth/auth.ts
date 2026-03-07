// NextAuth.js v5 exports
// When auth is fully configured, this will export from NextAuth.
// For now, export stub functions that the page shell can import.

export async function auth() {
  // Stub: returns null session until NextAuth is wired up
  return null as {
    user?: { name?: string | null; email?: string | null; image?: string | null };
    accessToken?: string;
  } | null;
}

export async function getToken(): Promise<string | null> {
  return null;
}

export async function requireToken(): Promise<string> {
  const token = await getToken();
  if (!token) {
    throw new Error('Authentication required');
  }
  return token;
}

export async function signIn() {
  // Stub: redirect to login
}

export async function signOut() {
  // Stub: clear session
}

export const handlers = {
  GET: () => new Response('Auth not configured', { status: 501 }),
  POST: () => new Response('Auth not configured', { status: 501 }),
};
