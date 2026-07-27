'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepperProps {
  steps: string[];
  /** Zero-based index of the active step. */
  current: number;
}

/** Horizontal progress indicator for the onboarding wizard. Square markers, mono numerals. */
export function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex shrink-0 items-center gap-2 last:flex-1">
            <span
              aria-hidden
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-xs)]',
                'font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] font-medium',
                'transition-colors duration-[var(--dur-fast)]',
                done
                  ? 'bg-[var(--color-ok-soft)] text-[var(--color-ok)]'
                  : active
                    ? 'bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
                    : 'border border-[var(--color-rule)] text-[var(--color-ink-4)]',
              )}
            >
              {done ? <Check size={13} /> : i + 1}
            </span>
            <span
              aria-current={active ? 'step' : undefined}
              className={cn(
                'whitespace-nowrap text-[length:var(--text-sm)]',
                active
                  ? 'font-medium text-[var(--color-ink)]'
                  : done
                    ? 'text-[var(--color-ink-3)]'
                    : 'text-[var(--color-ink-4)]',
              )}
            >
              {label}
            </span>
            {i < steps.length - 1 ? (
              <span className="h-px w-6 shrink-0 bg-[var(--color-rule)] sm:w-10" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
