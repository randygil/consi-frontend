import * as React from 'react';
import { cn } from '@/lib/utils';
import { statusLabel } from '@/lib/format';
import type { TransactionStatus } from '@/lib/types';

const statusStyles: Record<TransactionStatus, string> = {
  COMPLETED: 'bg-[var(--success-100)] text-[var(--success-600)]',
  PENDING: 'bg-[var(--warning-100)] text-[var(--warning-600)]',
  FAILED: 'bg-[var(--danger-100)] text-[var(--danger-600)]',
  REFUNDED: 'bg-[var(--ink-100)] text-[var(--text-muted)]',
  EXPIRED: 'bg-[var(--warning-100)] text-[var(--warning-600)]',
  CHARGEBACK: 'bg-[var(--danger-100)] text-[var(--danger-600)]',
};

export function StatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-pill)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em]',
        statusStyles[status],
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-pill)] border border-[var(--border)] px-2.5 py-0.5 text-xs font-medium',
        className,
      )}
      {...props}
    />
  );
}
