'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepperProps {
  steps: string[];
  /** Zero-based index of the active step. */
  current: number;
}

/** Horizontal progress indicator for the onboarding wizard. */
export function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
                done
                  ? 'bg-[var(--success-600)] text-white'
                  : active
                    ? 'text-white'
                    : 'bg-[var(--ink-100)] text-[var(--text-muted)]',
              )}
              style={active ? { background: 'var(--gradient-brand)' } : undefined}
            >
              {done ? <Check size={15} /> : i + 1}
            </span>
            <span
              className={cn(
                'text-xs font-semibold',
                active ? 'text-[var(--text-strong)]' : 'text-[var(--text-muted)]',
              )}
            >
              {label}
            </span>
            {i < steps.length - 1 ? (
              <span className="h-px flex-1 bg-[var(--border)]" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
