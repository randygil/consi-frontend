'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeftRight,
  Banknote,
  BookOpen,
  Code2,
  CreditCard,
  LayoutDashboard,
  Link2,
  Receipt,
  ShieldAlert,
  Store,
  Users,
  Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { formatRate } from '@/lib/format';
import { cn } from '@/lib/utils';

export const MERCHANT_NAV = [
  { href: '/', label: 'Panel', icon: LayoutDashboard, keywords: 'resumen dashboard inicio' },
  { href: '/terminals', label: 'Terminales', icon: Store, keywords: 'punto de venta pos canal app movil tienda contabilidad' },
  { href: '/links', label: 'Links de pago', icon: Link2, keywords: 'cobrar checkout sesiones' },
  { href: '/methods', label: 'Métodos de pago', icon: CreditCard, keywords: 'pago movil zelle usdt tarjeta' },
  { href: '/transactions', label: 'Cobros', icon: ArrowLeftRight, keywords: 'pagos movimientos transacciones' },
  { href: '/customers', label: 'Clientes', icon: Users, keywords: 'customers pagadores cedula' },
  { href: '/payouts', label: 'Retiros', icon: Banknote, keywords: 'payout banco cuenta convertir fx' },
  { href: '/settlements', label: 'Liquidaciones', icon: Wallet, keywords: 'settlement dispersion reporte' },
  { href: '/ledger', label: 'Movimientos', icon: Receipt, keywords: 'ledger libro mayor asientos contabilidad' },
  { href: '/disputes', label: 'Disputas', icon: ShieldAlert, keywords: 'contracargo chargeback reclamo' },
  { href: '/developers', label: 'Desarrolladores', icon: Code2, keywords: 'api keys webhooks' },
  { href: '/docs', label: 'Documentación', icon: BookOpen, keywords: 'docs guia integracion' },
];

/** Wordmark: a filled accent square, not a gradient dot. One mark, one colour. */
export function Wordmark({ suffix }: { suffix: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="size-3 rounded-[2px] bg-[var(--color-accent)]" aria-hidden />
      <span className="font-[family-name:var(--font-display)] text-[length:var(--text-md)] font-semibold tracking-[var(--tracking-display)] text-[var(--color-ink)]">
        Consi
      </span>
      <span className="label pt-px">{suffix}</span>
    </div>
  );
}

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

const itemBase =
  'relative flex items-center gap-2.5 rounded-[var(--radius-sm)] text-[length:var(--text-base)] transition-colors duration-[var(--dur-fast)]';

export function Sidebar() {
  const pathname = usePathname();
  const [rate, setRate] = useState<string | null>(null);

  useEffect(() => {
    api
      .getLatestRate()
      .then((r) => setRate(formatRate(r.rate)))
      .catch(() => setRate(null));
  }, []);

  return (
    <aside className="hidden w-[var(--rail-w)] shrink-0 flex-col border-r border-[var(--color-rule)] bg-[var(--color-surface)] lg:flex">
      <div className="flex h-[var(--header-h)] items-center border-b border-[var(--color-rule)] px-[var(--space-sm)]">
        <Wordmark suffix="Pagos" />
      </div>

      <nav className="flex flex-col gap-0.5 p-[var(--space-2xs)]">
        <div className="label px-2 pb-1.5 pt-2">Comercio</div>
        {MERCHANT_NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                itemBase,
                'px-2.5 py-2',
                active
                  ? 'bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent)]'
                  : 'text-[var(--color-ink-3)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]',
              )}
            >
              {active ? (
                <span
                  className="absolute inset-y-1.5 -left-[var(--space-2xs)] w-0.5 rounded-r-full bg-[var(--color-accent)]"
                  aria-hidden
                />
              ) : null}
              <Icon size={16} strokeWidth={active ? 2.25 : 1.75} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Live BCV rate — a readout, not a promo card. */}
      <div className="mt-auto border-t border-[var(--color-rule)] p-[var(--space-sm)]">
        <div className="label pb-1">Tasa BCV</div>
        <div className="num text-[length:var(--text-md)] font-medium text-[var(--color-ink)]">
          {rate ?? '—'}
        </div>
        <div className="label pt-0.5 normal-case tracking-normal">VES por USD</div>
      </div>
    </aside>
  );
}

/**
 * Below lg the rail is replaced by a scrollable strip rather than a drawer —
 * no overlay, no focus trap, no state, and it never forces the body to scroll
 * sideways at 320px.
 */
export function MobileNav({ items }: { items: typeof MERCHANT_NAV }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-[var(--color-rule)] bg-[var(--color-surface)] px-[var(--space-xs)] py-1.5 lg:hidden">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              itemBase,
              'shrink-0 whitespace-nowrap px-2.5 py-1.5',
              active
                ? 'bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent)]'
                : 'text-[var(--color-ink-3)]',
            )}
          >
            <Icon size={15} strokeWidth={active ? 2.25 : 1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
