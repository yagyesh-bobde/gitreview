import { detectMimeType } from "@/features/diff-viewer/lib/diff-utils";

/**
 * True if a file is a binary asset (image, PDF, video, audio, font, archive)
 * rather than a text file we diff line-by-line. Mirrors the diff viewer's
 * asset detection: anything with a recognised non-text MIME type counts.
 */
export function isAssetFile(filename: string): boolean {
  return detectMimeType(filename) !== "application/octet-stream";
}
