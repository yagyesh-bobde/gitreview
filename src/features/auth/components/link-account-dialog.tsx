'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Loader2, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGenerateLinkToken, useLinkTokenStatus } from '@/features/auth/hooks/use-link-token';

interface LinkAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog that generates a one-time URL for cross-browser account linking.
 * The user copies the URL, opens it in another browser where a different
 * GitHub account is logged in, and this dialog polls until the link completes.
 */
export function LinkAccountDialog({ open, onOpenChange }: LinkAccountDialogProps) {
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const generateToken = useGenerateLinkToken();
  const tokenStatus = useLinkTokenStatus(token);
  const queryClient = useQueryClient();
  const hasGenerated = useRef(false);

  // Generate token once when dialog opens. We use a ref to avoid
  // re-triggering on every render while keeping the linter happy.
  useEffect(() => {
    if (open && !hasGenerated.current) {
      hasGenerated.current = true;
      generateToken.mutate(undefined, {
        onSuccess: (data) => {
          setToken(data.token);
          setUrl(data.url);
        },
      });
    }
    if (!open) {
      hasGenerated.current = false;
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-close when the token is consumed
  useEffect(() => {
    if (tokenStatus.data?.status === 'used') {
      queryClient.invalidateQueries({ queryKey: ['github-accounts'] });
      const timer = setTimeout(() => onOpenChange(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [tokenStatus.data?.status, queryClient, onOpenChange]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        // Reset all state when closing
        setToken(null);
        setUrl(null);
        setCopied(false);
        generateToken.reset();
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, generateToken],
  );

  const handleCopy = useCallback(async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.querySelector<HTMLInputElement>('[data-link-url]');
      if (input) {
        input.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  }, [url]);

  const handleRegenerate = useCallback(() => {
    setToken(null);
    setUrl(null);
    generateToken.reset();
    // Trigger a new generation
    generateToken.mutate(undefined, {
      onSuccess: (data) => {
        setToken(data.token);
        setUrl(data.url);
      },
    });
  }, [generateToken]);

  const isUsed = tokenStatus.data?.status === 'used';
  const isExpired = tokenStatus.data?.status === 'expired';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link Another GitHub Account</DialogTitle>
          <DialogDescription>
            Copy this URL and open it in a browser where your other GitHub account is logged in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {generateToken.isPending && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {generateToken.isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Failed to generate link. Please try again.
            </div>
          )}

          {url && (
            <>
              <div className="flex gap-2">
                <Input
                  data-link-url
                  readOnly
                  value={url}
                  className="font-mono text-xs"
                  onFocus={(e) => e.target.select()}
                />
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleCopy}
                  className="shrink-0 gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="size-3.5 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>

              <div className="rounded-lg bg-muted/50 px-4 py-3">
                <div className="flex items-start gap-2">
                  <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">How it works</p>
                    <ol className="mt-1.5 list-decimal space-y-1 pl-3.5">
                      <li>Copy the URL above</li>
                      <li>Open it in a different browser or incognito window</li>
                      <li>Sign in with the GitHub account you want to link</li>
                      <li>This dialog will close automatically when done</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Polling status indicator */}
              <div className="flex items-center gap-2 text-xs">
                {isUsed ? (
                  <>
                    <Check className="size-3.5 text-green-500" />
                    <span className="font-medium text-green-500">Account linked successfully!</span>
                  </>
                ) : isExpired ? (
                  <>
                    <span className="text-muted-foreground">Link expired.</span>
                    <button
                      className="font-medium text-primary hover:underline"
                      onClick={handleRegenerate}
                    >
                      Generate a new one
                    </button>
                  </>
                ) : (
                  <>
                    <Loader2 className="size-3 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">Waiting for account to be linked...</span>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
