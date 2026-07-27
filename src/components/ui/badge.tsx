import * as React from 'react';
import { cn } from '@/lib/utils';
import { statusLabel } from '@/lib/format';
import type { TransactionStatus } from '@/lib/types';

/**
 * Status is a machine readout, not a decoration: mono, tracked, tinted-flat,
 * with a leading dot so state survives a greyscale print or a colour-blind read.
 */
const TONE: Record<TransactionStatus, string> = {
  COMPLETED: 'text-[var(--color-ok)] bg-[var(--color-ok-soft)]',
  PENDING: 'text-[var(--color-warn)] bg-[var(--color-warn-soft)]',
  AUTHORIZED: 'text-[var(--color-accent)] bg-[var(--color-accent-soft)]',
  FAILED: 'text-[var(--color-bad)] bg-[var(--color-bad-soft)]',
  REFUNDED: 'text-[var(--color-ink-3)] bg-[var(--color-paper-3)]',
  EXPIRED: 'text-[var(--color-ink-3)] bg-[var(--color-paper-3)]',
  CHARGEBACK: 'text-[var(--color-bad)] bg-[var(--color-bad-soft)]',
};

const chip =
  'inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] font-medium uppercase tracking-[var(--tracking-mono-label)]';

export function StatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <span className={cn(chip, TONE[status])}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {statusLabel(status)}
    </span>
  );
}

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(chip, 'border border-[var(--color-rule)] text-[var(--color-ink-3)]', className)}
      {...props}
    />
  );
}
