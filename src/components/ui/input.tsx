import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-surface)] px-2.5',
        'text-[length:var(--text-base)] text-[var(--color-ink)]',
        'transition-colors duration-[var(--dur-fast)] placeholder:text-[var(--color-ink-4)]',
        'hover:border-[var(--color-rule-2)]',
        'focus-visible:border-[var(--color-accent)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-focus)]',
        'disabled:cursor-not-allowed disabled:opacity-45',
        'read-only:bg-[var(--color-paper-3)] read-only:text-[var(--color-ink-3)]',
        'aria-[invalid=true]:border-[var(--color-bad)]',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
