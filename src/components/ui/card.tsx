import * as React from 'react';
import { cn } from '@/lib/utils';

/** Depth comes from a hairline, not a shadow. Cobalt has no elevation system. */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-md)] border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink-2)]',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 p-[var(--space-md)] pb-[var(--space-xs)]', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'font-[family-name:var(--font-display)] text-[length:var(--text-md)] font-semibold tracking-[var(--tracking-display)] text-[var(--color-ink)]',
        className,
      )}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-[var(--space-md)] pt-0', className)} {...props} />;
}

/**
 * The one dark beat. Reserved for the balance readout and code blocks —
 * a graphite surface anywhere else dilutes it into decoration.
 */
export function GraphiteCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--color-graphite-rule)] bg-[var(--color-graphite)] text-[var(--color-on-graphite-2)]',
        className,
      )}
      {...props}
    />
  );
}
