import * as React from 'react';
import { cn } from '@/lib/utils';

/** Form labels use the mono readout voice — same family as the values they name. */
export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'block font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] font-medium uppercase leading-none tracking-[var(--tracking-mono-label)] text-[var(--color-ink-4)]',
        className,
      )}
      {...props}
    />
  ),
);
Label.displayName = 'Label';
