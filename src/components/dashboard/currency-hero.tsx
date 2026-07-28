import { ArrowLeftRight } from 'lucide-react';
import { GraphiteCard } from '@/components/ui/card';
import { formatMoney, formatRate } from '@/lib/format';
import type { Currency, Wallet } from '@/lib/types';

interface CurrencyHeroProps {
  wallets: Wallet[];
  rate: number;
  updatedLabel?: string;
}

/** Fixed display order: fiat first, crypto last. */
const CURRENCY_ORDER: Currency[] = ['USD', 'VES', 'USDT'];

/**
 * The page's one dark beat: a graphite instrument readout with one cell per
 * settlement asset. Each balance is its own ledger — nothing is summed or
 * converted across assets; the BCV rate below is reference only.
 */
export function CurrencyHero({ wallets, rate, updatedLabel = 'BCV en vivo' }: CurrencyHeroProps) {
  const cells = CURRENCY_ORDER.map((currency) => {
    const w = wallets.find((x) => x.currency === currency);
    return {
      currency,
      available: Number(w?.available ?? 0),
      balance: Number(w?.balance ?? 0),
    };
  });

  return (
    <GraphiteCard>
      <div className="grid grid-cols-1 divide-y divide-[var(--color-graphite-rule)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {cells.map((c) => (
          <Balance
            key={c.currency}
            label={`Saldo disponible · ${c.currency}`}
            value={formatMoney(c.available, c.currency)}
            note={`de ${formatMoney(c.balance, c.currency)} total en cartera`}
          />
        ))}
      </div>
      <div className="flex items-center justify-center gap-2.5 border-t border-[var(--color-graphite-rule)] px-[var(--space-md)] py-2.5">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-xs)] border border-[var(--color-graphite-rule)] bg-[var(--color-graphite-2)] text-[var(--color-on-graphite-2)]">
          <ArrowLeftRight size={12} />
        </span>
        <span className="num text-[length:var(--text-sm)] font-medium text-[var(--color-on-graphite)]">
          1 USD = {rate ? formatRate(rate) : '—'} Bs
        </span>
        <span className="flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] uppercase tracking-[var(--tracking-mono-label)] text-[var(--color-on-graphite-3)]">
          <span className="size-1.5 rounded-full bg-[var(--color-accent-on-graphite)]" aria-hidden />
          {updatedLabel} · referencial — los saldos no se convierten
        </span>
      </div>
    </GraphiteCard>
  );
}

function Balance({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex min-w-0 flex-col justify-center p-[var(--space-md)]">
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
