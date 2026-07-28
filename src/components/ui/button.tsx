import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Cobalt: 6px radii, never pills, never gradients. One solid accent button;
// everything else is hairline-outlined or plain text.
/** Exported so `<Link className={buttonVariants()}>` can share the voice
 * without nesting an <a> inside a <button>. */
export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)]',
    'font-medium leading-none transition-[background-color,border-color,color] duration-[var(--dur-fast)]',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]',
    'active:translate-y-px disabled:pointer-events-none',
  ].join(' '),
  {
    variants: {
      variant: {
        // A translucent accent fill still reads as a live button in a pale blue.
        // Disabled primaries go inert instead — flat paper, muted ink. The other
        // variants are already hairline-and-text, so 45% opacity reads right there.
        default:
          'bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:bg-[var(--color-accent-hover)] disabled:bg-[var(--color-paper-3)] disabled:text-[var(--color-ink-4)]',
        outline:
          'border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:border-[var(--color-rule-2)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)] disabled:opacity-45',
        ghost:
          'text-[var(--color-ink-3)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)] disabled:opacity-45',
        destructive:
          'border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-bad)] hover:border-[var(--color-bad)] hover:bg-[var(--color-bad-soft)] disabled:opacity-45',
      },
      size: {
        default: 'h-9 px-3.5 text-[length:var(--text-base)]',
        sm: 'h-8 px-2.5 text-[length:var(--text-sm)]',
        lg: 'h-10 px-5 text-[length:var(--text-md)]',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  ),
);
Button.displayName = 'Button';
