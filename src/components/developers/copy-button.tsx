'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-8 rounded-md hover:bg-[var(--blue-50)] hover:text-[var(--blue-700)] transition-colors"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      aria-label={`Copiar ${label}`}
    >
      {copied ? <Check size={14} className="text-[var(--success-600)]" /> : <Copy size={14} />}
    </Button>
  );
}
