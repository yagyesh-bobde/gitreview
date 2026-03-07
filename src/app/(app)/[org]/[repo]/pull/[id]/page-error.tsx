'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageErrorProps {
  title: string;
  message: string;
  onRetry?: () => void;
}

export function PageError({ title, message, onRetry }: PageErrorProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <AlertTriangle className="size-12 text-destructive" />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-zinc-100">{title}</h1>
        <p className="max-w-md text-sm text-zinc-400">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw className="size-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}
