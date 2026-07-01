'use client';

import { useState } from 'react';
import { ImageOff } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { PRFile } from '@/types/pr';

interface ImageDiffViewProps {
  file: PRFile;
  org: string;
  repo: string;
  /** Base (old) commit sha -- the "before" side. */
  baseRef?: string;
  /** Head (new) commit sha -- the "after" side. */
  headRef?: string;
}

/** Build the URL to our authenticated raw-asset proxy. */
function rawUrl(
  org: string,
  repo: string,
  path: string,
  ref: string,
): string {
  const params = new URLSearchParams({ path, ref });
  return `/api/github/${encodeURIComponent(org)}/${encodeURIComponent(repo)}/raw?${params.toString()}`;
}

/**
 * Renders an image file change as a before/after preview.
 *
 * Which sides are shown depends on the file's status: added files show only the
 * new image, removed files only the old, and modified/renamed files show both
 * side by side. Falls back to a placeholder when a version can't be loaded.
 */
export function ImageDiffView({
  file,
  org,
  repo,
  baseRef,
  headRef,
}: ImageDiffViewProps) {
  const status = file.status;
  const showOld = status !== 'added' && status !== 'copied' && !!baseRef;
  const showNew = status !== 'removed' && !!headRef;

  // For renamed files the previous path differs from the current one.
  const oldPath =
    file.previousFilename && file.previousFilename !== file.filename
      ? file.previousFilename
      : file.filename;

  if (!showOld && !showNew) {
    // No ref available to fetch either version (shouldn't normally happen).
    return (
      <div className="flex items-center justify-center px-4 py-10 text-sm text-zinc-500">
        Image preview unavailable
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid gap-4 p-4',
        showOld && showNew ? 'md:grid-cols-2' : 'grid-cols-1',
      )}
    >
      {showOld && (
        <ImagePane
          label={showNew ? 'Before' : 'Deleted'}
          tone={showNew ? 'neutral' : 'deleted'}
          src={rawUrl(org, repo, oldPath, baseRef!)}
        />
      )}
      {showNew && (
        <ImagePane
          label={showOld ? 'After' : status === 'added' ? 'Added' : 'New'}
          tone={showOld ? 'neutral' : 'added'}
          src={rawUrl(org, repo, file.filename, headRef!)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ImagePane — a single labeled image with load/error/size state
// ---------------------------------------------------------------------------

interface ImagePaneProps {
  label: string;
  tone: 'neutral' | 'added' | 'deleted';
  src: string;
}

const TONE_CLASSES: Record<ImagePaneProps['tone'], string> = {
  neutral: 'text-zinc-400',
  added: 'text-green-400',
  deleted: 'text-red-400',
};

function ImagePane({ label, tone, src }: ImagePaneProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(
    'loading',
  );
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(
    null,
  );

  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <figcaption className="flex items-center justify-between gap-2 text-xs">
        <span className={cn('font-medium', TONE_CLASSES[tone])}>{label}</span>
        {dimensions && (
          <span className="font-mono text-zinc-600">
            {dimensions.w}×{dimensions.h}
          </span>
        )}
      </figcaption>

      <div
        className={cn(
          'flex min-h-[80px] items-center justify-center overflow-hidden rounded-md border border-zinc-800',
          // Checkerboard so transparent images read clearly.
          'bg-[length:16px_16px] bg-[position:0_0,8px_8px]',
          '[background-image:linear-gradient(45deg,#27272a_25%,transparent_25%,transparent_75%,#27272a_75%),linear-gradient(45deg,#27272a_25%,transparent_25%,transparent_75%,#27272a_75%)]',
        )}
      >
        {status === 'error' ? (
          <div className="flex flex-col items-center gap-1.5 px-4 py-8 text-zinc-500">
            <ImageOff className="h-5 w-5" />
            <span className="text-xs">Couldn&apos;t load image</span>
          </div>
        ) : (
          // Using a plain <img> (not next/image) because these are
          // authenticated, arbitrarily-sized assets served from our own proxy
          // route; the Next image optimizer offers no benefit here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={label}
            className={cn(
              'max-h-[520px] max-w-full object-contain transition-opacity',
              status === 'loaded' ? 'opacity-100' : 'opacity-0',
            )}
            onLoad={(e) => {
              const img = e.currentTarget;
              setDimensions({ w: img.naturalWidth, h: img.naturalHeight });
              setStatus('loaded');
            }}
            onError={() => setStatus('error')}
          />
        )}
      </div>
    </figure>
  );
}
