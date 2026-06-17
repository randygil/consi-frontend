'use client';

import { Bell, Menu } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

function initials(name: string | undefined): string {
  if (!name) return 'C';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { merchant, logout } = useAuth();

  return (
    <header className="flex h-[68px] items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-4 md:px-7">
      <div className="flex items-center gap-3">
        {/* Hamburger button visible only on mobile/tablet */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Abrir menú"
          className="flex size-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--text-muted)] hover:text-[var(--text-strong)] md:hidden transition-colors"
        >
          <Menu size={18} />
        </button>

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
      </div>

      <div className="flex items-center gap-3.5">
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

