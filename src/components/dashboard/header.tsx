'use client';

import { User } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { CommandPalette, type Command } from '@/components/command-palette';
import { ThemeToggle } from '@/components/theme-toggle';
import { MERCHANT_NAV } from '@/components/dashboard/sidebar';
import { getEnvironment, setEnvironment } from '@/lib/auth';
import { cn } from '@/lib/utils';

const COMMANDS: Command[] = [
  ...MERCHANT_NAV.map((n) => ({
    group: 'Ir a',
    label: n.label,
    keywords: n.keywords,
    href: n.href,
  })),
  { group: 'Acciones', label: 'Crear link de pago', keywords: 'nuevo cobrar', href: '/links' },
  { group: 'Acciones', label: 'Solicitar retiro', keywords: 'payout sacar', href: '/payouts' },
  { group: 'Acciones', label: 'Ver claves de API', keywords: 'api key secret', href: '/developers' },
  { group: 'Acciones', label: 'Mi perfil', keywords: 'cuenta password perfil', href: '/profile' },
];

function initials(name: string | undefined): string {
  if (!name) return 'C';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

const ENVS: { value: 'TEST' | 'LIVE'; label: string }[] = [
  { value: 'TEST', label: 'Prueba' },
  { value: 'LIVE', label: 'Real' },
];

export function Header() {
  const { merchant, logout } = useAuth();
  const [env, setEnv] = useState<'TEST' | 'LIVE'>('TEST');

  useEffect(() => setEnv(getEnvironment()), []);

  const toggle = (next: 'TEST' | 'LIVE') => {
    setEnv(next);
    setEnvironment(next);
  };

  return (
    <header className="flex h-[var(--header-h)] shrink-0 items-center justify-between gap-[var(--space-sm)] border-b border-[var(--color-rule)] bg-[var(--color-surface)] px-[var(--space-sm)]">
      <div className="min-w-0">
        <p className="truncate font-[family-name:var(--font-display)] text-[length:var(--text-base)] font-semibold tracking-[var(--tracking-display)] text-[var(--color-ink)]">
          {merchant?.businessName ?? 'Comercio'}
        </p>
        {/* Split node keeps the email from being auto-masked. */}
        <p className="truncate font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] text-[var(--color-ink-4)]">
          {merchant?.email ? (
            <>
              {merchant.email.split('@')[0]}
              <span>@</span>
              {merchant.email.split('@')[1]}
            </>
          ) : (
            '—'
          )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <CommandPalette commands={COMMANDS} />

        {/* TEST / LIVE is the highest-stakes switch here, so LIVE is the one
            place besides the primary button that earns a filled accent. */}
        <div
          role="group"
          aria-label="Entorno"
          className="hidden rounded-[var(--radius-sm)] border border-[var(--color-rule)] p-0.5 sm:flex"
        >
          {ENVS.map(({ value, label }) => {
            const active = env === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggle(value)}
                aria-pressed={active}
                className={cn(
                  'rounded-[var(--radius-xs)] px-2.5 py-1 font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] uppercase tracking-[var(--tracking-mono-label)] transition-colors duration-[var(--dur-fast)]',
                  active
                    ? 'bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
                    : 'text-[var(--color-ink-4)] hover:text-[var(--color-ink)]',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        <Link
          href="/profile"
          aria-label="Mi perfil"
          title="Mi perfil"
          className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-rule)] text-[var(--color-ink-3)] transition-colors duration-[var(--dur-fast)] hover:border-[var(--color-rule-2)] hover:text-[var(--color-ink)]"
        >
          <User size={15} />
        </Link>

        <ThemeToggle />

        <button
          type="button"
          onClick={logout}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-graphite)] font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] font-medium text-[var(--color-on-graphite)] transition-opacity duration-[var(--dur-fast)] hover:opacity-85"
        >
          {initials(merchant?.businessName)}
        </button>
      </div>
    </header>
  );
}

