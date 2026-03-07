'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface ContentAreaProps {
  children: ReactNode;
  className?: string;
}

export function ContentArea({ children, className }: ContentAreaProps) {
  return (
    <div className={cn('flex h-full flex-1 flex-col overflow-hidden', className)}>
      {children}
    </div>
  );
}
