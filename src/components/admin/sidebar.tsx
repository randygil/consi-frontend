'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Store, UserPlus } from 'lucide-react';
import { Wordmark } from '@/components/dashboard/sidebar';
import { cn } from '@/lib/utils';

export const ADMIN_NAV = [
  { href: '/admin', label: 'Panel', icon: LayoutDashboard, keywords: 'resumen plataforma stats' },
  { href: '/admin/merchants', label: 'Comercios', icon: Store, keywords: 'merchants comercios' },
  { href: '/admin/merchants/new', label: 'Onboarding', icon: UserPlus, keywords: 'nuevo alta merchant' },
];

// /admin is exact; nested routes match by prefix (but not the bare panel).
function isActive(pathname: string, href: string): boolean {
  return href === '/admin' ? pathname === href : pathname.startsWith(href);
}

const itemBase =
  'relative flex items-center gap-2.5 rounded-[var(--radius-sm)] text-[length:var(--text-base)] transition-colors duration-[var(--dur-fast)]';

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[var(--rail-w)] shrink-0 flex-col border-r border-[var(--color-rule)] bg-[var(--color-surface)] lg:flex">
      <div className="flex h-[var(--header-h)] items-center border-b border-[var(--color-rule)] px-[var(--space-sm)]">
        <Wordmark suffix="Admin" />
      </div>

      <nav className="flex flex-col gap-0.5 p-[var(--space-2xs)]">
        <div className="label px-2 pb-1.5 pt-2">Plataforma</div>
        {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
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
    </aside>
  );
}

export function AdminMobileNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-[var(--color-rule)] bg-[var(--color-surface)] px-[var(--space-xs)] py-1.5 lg:hidden">
      {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
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
