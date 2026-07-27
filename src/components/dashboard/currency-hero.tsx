import { ArrowLeftRight } from 'lucide-react';
import { GraphiteCard } from '@/components/ui/card';
import { formatMoney, formatRate } from '@/lib/format';

interface CurrencyHeroProps {
  usdAvailable: number;
  vesAvailable: number;
  totalUsd: number;
  rate: number;
  updatedLabel?: string;
}

/**
 * The page's one dark beat: a graphite instrument readout carrying both wallet
 * balances and the live BCV rate between them. Everything is mono and tabular —
 * these are the numbers the merchant is actually here to read.
 */
export function CurrencyHero({
  usdAvailable,
  vesAvailable,
  totalUsd,
  rate,
  updatedLabel = 'BCV en vivo',
}: CurrencyHeroProps) {
  const rateLabel = rate ? formatRate(rate) : '—';

  return (
    <GraphiteCard className="grid grid-cols-1 divide-y divide-[var(--color-graphite-rule)] sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:divide-x sm:divide-y-0">
      <Balance
        label="Saldo disponible · USD"
        value={formatMoney(usdAvailable, 'USD')}
        note={`de ${formatMoney(totalUsd, 'USD')} total en cartera`}
      />

      <div className="flex items-center justify-center gap-3 px-[var(--space-md)] py-[var(--space-sm)] sm:flex-col sm:gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-graphite-rule)] bg-[var(--color-graphite-2)] text-[var(--color-on-graphite-2)]">
          <ArrowLeftRight size={15} />
        </span>
        <div className="text-center">
          <div className="num text-[length:var(--text-md)] font-medium leading-none text-[var(--color-on-graphite)]">
            {rateLabel}
          </div>
          <div className="mt-1 flex items-center justify-center gap-1.5 font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] uppercase tracking-[var(--tracking-mono-label)] text-[var(--color-on-graphite-3)]">
            <span
              className="size-1.5 rounded-full bg-[var(--color-accent-on-graphite)]"
              aria-hidden
            />
            {updatedLabel}
          </div>
        </div>
      </div>

      <Balance
        label="Saldo disponible · VES"
        value={formatMoney(vesAvailable, 'VES')}
        note={`≈ ${formatMoney(rate ? vesAvailable / rate : 0, 'USD')}`}
        align="sm:text-right sm:items-end"
      />
    </GraphiteCard>
  );
}

function Balance({
  label,
  value,
  note,
  align = '',
}: {
  label: string;
  value: string;
  note: string;
  align?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-col justify-center p-[var(--space-md)] ${align}`}>
      <div className="font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] uppercase tracking-[var(--tracking-mono-label)] text-[var(--color-on-graphite-3)]">
        {label}
      </div>
      <div className="num mt-2 truncate text-[length:var(--text-2xl)] font-medium leading-none text-[var(--color-on-graphite)]">
        {value}
      </div>
      <div className="mt-1.5 truncate text-[length:var(--text-xs)] text-[var(--color-on-graphite-3)]">
        {note}
      </div>
    </div>
  );
}

