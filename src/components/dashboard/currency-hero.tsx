import { ArrowLeftRight } from 'lucide-react';
import { formatMoney } from '@/lib/format';

interface CurrencyHeroProps {
  usdAvailable: number;
  vesAvailable: number;
  totalUsd: number;
  rate: number;
  updatedLabel?: string;
}

/**
 * USD ⇄ VES converter hero — Midnight's "saldo" layout rendered on Aurora's
 * gradient-mesh surface. USD balance · live BCV swap node · VES balance.
 */
export function CurrencyHero({
  usdAvailable,
  vesAvailable,
  totalUsd,
  rate,
  updatedLabel = 'En vivo · BCV',
}: CurrencyHeroProps) {
  const rateLabel = rate ? rate.toLocaleString('es-VE', { minimumFractionDigits: 2 }) : '—';

  return (
    <section
      className="relative flex items-stretch gap-4 overflow-hidden rounded-[var(--radius-xl)] p-6 text-white sm:gap-6 sm:p-7"
      style={{
        background: 'var(--gradient-mesh)',
        boxShadow: 'var(--glow-brand)',
        animation: 'riseSafe .6s cubic-bezier(.2,.8,.2,1)',
      }}
    >
      {/* Saldo USD */}
      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-white/60">
          Saldo USD
        </div>
        <div className="font-mono text-3xl font-semibold leading-none tracking-tight sm:text-[34px]">
          {formatMoney(usdAvailable, 'USD')}
        </div>
        <div className="mt-1 text-xs text-white/55">de {formatMoney(totalUsd, 'USD')} total</div>
      </div>

      {/* Swap node + live rate */}
      <div className="flex flex-none flex-col items-center justify-center gap-2 px-1 sm:px-2">
        <div
          className="flex size-14 items-center justify-center rounded-full"
          style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--glow-brand)' }}
        >
          <ArrowLeftRight size={24} strokeWidth={2} />
        </div>
        <div className="text-center">
          <div className="font-mono text-base font-semibold leading-tight">{rateLabel}</div>
          <div className="flex items-center justify-center gap-1.5 text-[10px] tracking-[0.04em] text-white/55">
            <span className="relative inline-flex size-2">
              <span
                className="absolute inset-0 rounded-full"
                style={{ background: 'var(--accent-pop)', animation: 'pulseDot 1.8s ease-in-out infinite' }}
              />
            </span>
            VES/USD · {updatedLabel}
          </div>
        </div>
      </div>

      {/* Saldo VES */}
      <div className="flex flex-1 flex-col items-end justify-center text-right">
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-white/60">
          Saldo VES
        </div>
        <div className="font-mono text-3xl font-semibold leading-none tracking-tight sm:text-[34px]">
          {formatMoney(vesAvailable, 'VES')}
        </div>
        <div className="mt-1 text-xs text-white/55">
          ≈ {formatMoney(rate ? vesAvailable / rate : 0, 'USD')}
        </div>
      </div>
    </section>
  );
}
