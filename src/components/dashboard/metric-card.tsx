import { Card } from '@/components/ui/card';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

/**
 * Stat tile: mono label, large tabular figure. No coloured icon chip — a row of
 * identical accent squares is the fingerprint this redesign is removing, so the
 * icon (when given) stays a muted hairline-weight glyph in the corner.
 */
export function MetricCard({ title, value, subtitle, icon }: MetricCardProps) {
  return (
    <Card className="p-[var(--space-sm)]">
      <div className="flex items-start justify-between gap-2">
        <span className="label">{title}</span>
        {icon ? <span className="shrink-0 text-[var(--color-ink-4)]">{icon}</span> : null}
      </div>
      <p className="num mt-2.5 truncate text-[length:var(--text-xl)] font-medium leading-none text-[var(--color-ink)]">
        {value}
      </p>
      {subtitle ? (
        <p className="mt-1.5 truncate text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
          {subtitle}
        </p>
      ) : null}
    </Card>
  );
}
