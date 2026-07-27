import * as React from 'react';
import { cn } from '@/lib/utils';

/** Wide tables scroll inside their own container so the page body never does. */
export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn('w-full border-collapse text-[length:var(--text-base)]', className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} />;
}

export function TableBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'border-b border-[var(--color-rule)] transition-colors duration-[var(--dur-fast)] last:border-0 hover:bg-[var(--color-paper-3)]',
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'whitespace-nowrap border-b border-[var(--color-rule-2)] px-3 pb-2 pt-0 text-left align-bottom',
        'font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] font-medium uppercase tracking-[var(--tracking-mono-label)] text-[var(--color-ink-4)]',
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn('px-3 py-2.5 align-middle text-[var(--color-ink-2)]', className)}
      {...props}
    />
  );
}
