'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Store, UserPlus, Coins, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin', label: 'Panel', icon: LayoutDashboard },
  { href: '/admin/merchants', label: 'Comercios', icon: Store },
  { href: '/admin/merchants/new', label: 'Onboarding', icon: UserPlus },
  { href: '/admin/gateways', label: 'Pasarelas', icon: Coins },
  { href: '/admin/alerts', label: 'Alertas', icon: AlertTriangle },
];

export function AdminSidebar({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[236px] shrink-0 flex-col gap-6 border-r border-[var(--border)] bg-[var(--sidebar)] p-4">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2 pt-2">
        <span
          className="size-2.5 rounded-full"
          style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--glow-brand)' }}
        />
        <span className="text-lg font-extrabold tracking-tight text-[var(--text-strong)]">Consi</span>
        <span className="text-xs font-semibold text-[var(--text-subtle)]">Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          // /admin is exact; nested routes match by prefix (but not the bare panel).
          const active =
            href === '/admin' ? pathname === href : pathname.startsWith(href);
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
    </aside>
  );
}

