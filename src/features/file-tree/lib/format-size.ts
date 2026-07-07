/**
 * Human-readable byte-size formatting for the file explorer.
 *
 * Uses binary units (1 KB = 1024 bytes) to match how tooling like `ls -h`,
 * GitHub, and most editors report file sizes.
 */

const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

/**
 * Format a byte count as a compact string (e.g. `842 B`, `12.4 KB`, `3.1 MB`).
 * Returns null for missing/invalid sizes so callers can skip rendering.
 */
export function formatBytes(bytes: number | null | undefined): string | null {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return null;
  if (bytes === 0) return "0 B";

  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < UNITS.length - 1) {
    size /= 1024;
    unit += 1;
  }

  // Whole bytes have no decimals; larger units get one decimal unless it's a
  // clean integer (e.g. "2 MB" rather than "2.0 MB").
  const rounded = unit === 0 ? size : Math.round(size * 10) / 10;
  const display = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);

  return `${display} ${UNITS[unit]}`;
}
