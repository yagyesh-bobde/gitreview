'use client';

import { cn } from '@/lib/utils/cn';

type SpinnerSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'size-4 border-[1.5px]',
  md: 'size-6 border-2',
  lg: 'size-8 border-2',
};

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  className?: string;
  label?: string;
}

export function LoadingSpinner({ size = 'md', className, label }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center gap-2', className)} role="status">
      <div
        className={cn(
          'animate-spin rounded-full border-zinc-700 border-t-zinc-400',
          sizeClasses[size],
        )}
      />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
      <span className="sr-only">{label ?? 'Loading...'}</span>
    </div>
  );
}
