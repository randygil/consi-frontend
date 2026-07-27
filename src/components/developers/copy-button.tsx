'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Silent success: the icon swaps to a check for 1.2s and reverts. No toast,
 * no colour flash on the button itself — design.md's microinteraction stance.
 */
export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn('size-9 shrink-0', className)}
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      aria-label={copied ? `${label} copiado` : `Copiar ${label}`}
    >
      {copied ? <Check size={14} className="text-[var(--color-ok)]" /> : <Copy size={14} />}
    </Button>
  );
}
