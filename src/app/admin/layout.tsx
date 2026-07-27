'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/components/auth-provider';
import { AdminMobileNav, ADMIN_NAV, AdminSidebar } from '@/components/admin/sidebar';
import { CommandPalette, type Command } from '@/components/command-palette';
import { ThemeToggle } from '@/components/theme-toggle';
import { User } from 'lucide-react';
import Link from 'next/link';

const COMMANDS: Command[] = ADMIN_NAV.map((n) => ({
  group: 'Ir a',
  label: n.label,
  keywords: n.keywords,
  href: n.href,
}));

function AdminHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, logout } = useAuth();
  return (
    <header className="flex h-[var(--header-h)] shrink-0 items-center justify-between gap-[var(--space-sm)] border-b border-[var(--color-rule)] bg-[var(--color-surface)] px-[var(--space-sm)]">
      <div className="min-w-0">
        <p className="truncate font-[family-name:var(--font-display)] text-[length:var(--text-base)] font-semibold tracking-[var(--tracking-display)] text-[var(--color-ink)]">
          Administración
        </p>
        <p className="truncate font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] text-[var(--color-ink-4)]">
          {user?.email ? (
            <>
              {user.email.split('@')[0]}
              <span>@</span>
              {user.email.split('@')[1]}
            </>
          ) : (
            '—'
          )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <CommandPalette commands={COMMANDS} />
        <Link
          href="/admin/profile"
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
          A
        </button>
      </div>
    </header>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, user } = useAuth();

  useEffect(() => {
    // Non-admins (merchant users) don't belong here.
    if (!loading && user && user.role !== 'ADMIN') {
      router.replace('/');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="label">Cargando</span>
      </div>
    );
  }
  if (!user || user.role !== 'ADMIN') return null; // redirecting

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader />
        <AdminMobileNav />
        <main className="flex-1 overflow-x-clip p-[var(--space-sm)] lg:p-[var(--space-md)]">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}

