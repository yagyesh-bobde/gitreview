import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
};

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Sign in to GitReview</h1>
        <p className="text-sm text-muted-foreground">
          Use your GitHub account to get started
        </p>
      </div>
      <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
        Sign in with GitHub
      </button>
    </div>
  );
}
