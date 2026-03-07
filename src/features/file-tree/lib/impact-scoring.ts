import { IMPACT_THRESHOLDS } from "@/config/constants";
import type { ImpactLevel } from "../types";

/**
 * Determine impact level based on total number of changes (additions + deletions).
 * Uses thresholds from config/constants.ts.
 */
export function getImpactLevel(changes: number): ImpactLevel {
  if (changes > IMPACT_THRESHOLDS.high) return "critical";
  if (changes > IMPACT_THRESHOLDS.medium) return "high";
  if (changes > IMPACT_THRESHOLDS.low) return "medium";
  return "low";
}

/**
 * Map impact level to a display color class (Tailwind).
 */
export function getImpactColor(level: ImpactLevel): string {
  switch (level) {
    case "critical":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "high":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "medium":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "low":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  }
}

/**
 * Get a short label for the impact level.
 */
export function getImpactLabel(level: ImpactLevel): string {
  switch (level) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    case "medium":
      return "Med";
    case "low":
      return "Low";
  }
}
