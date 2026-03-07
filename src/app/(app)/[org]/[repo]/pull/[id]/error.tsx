'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PullRequestError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <AlertTriangle className="size-12 text-destructive" />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-zinc-100">Error loading pull request</h1>
        <p className="max-w-md text-sm text-zinc-400">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={reset}>
        <RotateCcw className="size-3.5" />
        Try again
      </Button>
    </div>
  );
}
