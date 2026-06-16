'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { getEnvironment, setEnvironment } from '@/lib/auth';
import { cn } from '@/lib/utils';

function initials(name: string | undefined): string {
  if (!name) return 'C';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export function Header() {
  const { merchant, logout } = useAuth();
  const [env, setEnv] = useState<'TEST' | 'LIVE'>('TEST');

  useEffect(() => setEnv(getEnvironment()), []);

  const toggle = (next: 'TEST' | 'LIVE') => {
    setEnv(next);
    setEnvironment(next);
  };

  const ENVS: { value: 'TEST' | 'LIVE'; label: string }[] = [
    { value: 'TEST', label: 'Prueba' },
    { value: 'LIVE', label: 'Real' },
  ];

  return (
    <header className="flex h-[68px] items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-7">
      <div>
        <p className="text-[15px] font-bold text-[var(--text-strong)]">
          {merchant?.businessName ?? 'Comercio'}
        </p>
        {/* Split node keeps the email from being auto-masked. */}
        <p className="text-[12.5px] text-[var(--text-subtle)]">
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

      <div className="flex items-center gap-3.5">
        {/* Prueba / Real switch */}
        <div className="flex rounded-[var(--radius-pill)] bg-[var(--ink-100)] p-[3px]">
          {ENVS.map(({ value, label }) => {
            const active = env === value;
            return (
              <button
                key={value}
                onClick={() => toggle(value)}
                className={cn(
                  'rounded-[var(--radius-pill)] px-4 py-1.5 text-xs transition-all',
                  active ? 'font-bold text-white' : 'font-semibold text-[var(--text-muted)]',
                )}
                style={
                  active
                    ? { background: 'var(--gradient-brand)', boxShadow: 'var(--glow-brand)' }
                    : undefined
                }
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notificaciones"
          className="flex size-[38px] items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--text-muted)] transition-colors hover:text-[var(--text-strong)]"
        >
          <Bell size={18} />
        </button>

        {/* Avatar (logout) */}
        <button
          type="button"
          onClick={logout}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className="flex size-[38px] items-center justify-center rounded-full text-[13px] font-bold text-white"
          style={{ background: 'var(--gradient-warm)' }}
        >
          {initials(merchant?.businessName)}
        </button>
      </div>
    </header>
  );
}
