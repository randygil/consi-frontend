import * as React from 'react';
import { cn } from '@/lib/utils';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'flex h-9 w-full appearance-none rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-surface)] py-0 pl-2.5 pr-8',
      'text-[length:var(--text-base)] text-[var(--color-ink)]',
      'transition-colors duration-[var(--dur-fast)] hover:border-[var(--color-rule-2)]',
      'focus-visible:border-[var(--color-accent)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-focus)]',
      'disabled:cursor-not-allowed disabled:opacity-45',
      // Chevron drawn in CSS — one fewer icon import, and it inherits the ink ramp.
      'bg-[image:linear-gradient(45deg,transparent_50%,currentColor_50%),linear-gradient(135deg,currentColor_50%,transparent_50%)]',
      'bg-[position:calc(100%-15px)_center,calc(100%-11px)_center] bg-[size:4px_4px,4px_4px] bg-no-repeat',
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = 'Select';
