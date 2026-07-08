import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Boxes,
  Bug,
  Cog,
  CreditCard,
  Database,
  FileText,
  FlaskConical,
  Gauge,
  Network,
  Package,
  Palette,
  Server,
  Shield,
  Sparkles,
} from 'lucide-react';

import type { DiffCategoryId } from '@/types/ai';

interface CategoryDisplay {
  icon: LucideIcon;
  /** Tailwind classes for the icon + accent used on the accordion header. */
  accent: string;
}

/**
 * Icon + accent color per category. Kept separate from the framework-agnostic
 * metadata in `@/lib/ai/diff-categories` so that module stays importable on the
 * server without pulling in lucide-react.
 */
export const CATEGORY_DISPLAY: Record<DiffCategoryId, CategoryDisplay> = {
  payment: { icon: CreditCard, accent: 'text-emerald-400' },
  security: { icon: Shield, accent: 'text-red-400' },
  bugfix: { icon: Bug, accent: 'text-orange-400' },
  feature: { icon: Sparkles, accent: 'text-violet-400' },
  api: { icon: Network, accent: 'text-sky-400' },
  database: { icon: Database, accent: 'text-cyan-400' },
  performance: { icon: Gauge, accent: 'text-yellow-400' },
  refactoring: { icon: Boxes, accent: 'text-blue-400' },
  infrastructure: { icon: Server, accent: 'text-teal-400' },
  tests: { icon: FlaskConical, accent: 'text-lime-400' },
  configuration: { icon: Cog, accent: 'text-zinc-400' },
  dependencies: { icon: Package, accent: 'text-amber-400' },
  styling: { icon: Palette, accent: 'text-pink-400' },
  documentation: { icon: FileText, accent: 'text-zinc-400' },
  other: { icon: AlertTriangle, accent: 'text-zinc-500' },
};
