"use client";

import { cn } from "@/lib/utils";
import type { ImpactLevel } from "../types";
import { getImpactColor, getImpactLabel } from "../lib/impact-scoring";

interface FileImpactBadgeProps {
  level: ImpactLevel;
  className?: string;
}

export function FileImpactBadge({ level, className }: FileImpactBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1 py-0.5 text-[10px] font-medium leading-none border",
        getImpactColor(level),
        className
      )}
    >
      {getImpactLabel(level)}
    </span>
  );
}
