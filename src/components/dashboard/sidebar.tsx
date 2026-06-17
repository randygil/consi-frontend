'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeftRight,
  Banknote,
  BookOpen,
  Code2,
  LayoutDashboard,
  Link2,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Panel', icon: LayoutDashboard },
  { href: '/links', label: 'Links de pago', icon: Link2 },
  { href: '/transactions', label: 'Cobros', icon: ArrowLeftRight },
  { href: '/payouts', label: 'Retiros', icon: Banknote },
  { href: '/settlements', label: 'Liquidaciones', icon: Wallet },
  { href: '/disputes', label: 'Disputas', icon: ShieldAlert },
  { href: '/developers', label: 'Desarrolladores', icon: Code2 },
  { href: '/docs', label: 'Documentación', icon: BookOpen },
];

export function Sidebar({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const [rate, setRate] = useState<string | null>(null);

  useEffect(() => {
    api
      .getLatestRate()
      .then((r) => setRate(Number(r.rate).toLocaleString('es-VE', { minimumFractionDigits: 2 })))
      .catch(() => setRate(null));
  }, []);

  return (
    <aside className="flex h-full w-[236px] shrink-0 flex-col gap-6 border-r border-[var(--border)] bg-[var(--sidebar)] p-4">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2 pt-2">
        <span
          className="size-2.5 rounded-full"
          style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--glow-brand)' }}
        />
        <span className="text-lg font-extrabold tracking-tight text-[var(--text-strong)]">Consi</span>
        <span className="text-xs font-semibold text-[var(--text-subtle)]">Pagos</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onLinkClick}
              className={cn(
                'relative flex items-center gap-3 rounded-[var(--radius-md)] px-3.5 py-2.5 text-sm transition-all duration-200',
                active
                  ? 'bg-[var(--blue-50)] font-bold text-[var(--blue-700)]'
                  : 'font-semibold text-[var(--text-muted)] hover:bg-[var(--ink-100)] hover:text-[var(--text-strong)]',
              )}
            >
              {active ? (
                <span
                  className="absolute inset-y-2 left-0 w-[3px] rounded-full"
                  style={{ background: 'var(--gradient-brand)' }}
                />
              ) : null}
              <Icon size={19} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* BCV rate card */}
      <div
        className="mt-auto rounded-[var(--radius-md)] border border-[var(--blue-100)] p-3.5"
        style={{ background: 'var(--gradient-brand-soft)' }}
      >
        <div className="mb-0.5 text-xs font-bold text-[var(--blue-700)]">Tasa BCV</div>
        <div className="font-mono text-[15px] font-semibold text-[var(--text-strong)]">
          {rate ?? '—'} <span className="text-[11px] text-[var(--text-muted)]">VES/USD</span>
        </div>
      </div>
    </aside>
  );
}

