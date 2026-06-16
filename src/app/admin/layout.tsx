'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/components/auth-provider';
import { AdminSidebar } from '@/components/admin/sidebar';

function AdminHeader() {
  const { user, logout } = useAuth();
  return (
    <header className="flex h-[68px] items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-7">
      <div>
        <p className="text-[15px] font-bold text-[var(--text-strong)]">Panel de administración</p>
        <p className="text-[12.5px] text-[var(--text-subtle)]">
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
      <button
        type="button"
        onClick={logout}
        title="Cerrar sesión"
        aria-label="Cerrar sesión"
        className="flex size-[38px] items-center justify-center rounded-full text-[13px] font-bold text-white"
        style={{ background: 'var(--gradient-warm)' }}
      >
        A
      </button>
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
      <div className="flex min-h-screen items-center justify-center text-[var(--muted-foreground)]">
        Cargando…
      </div>
    );
  }
  if (!user || user.role !== 'ADMIN') return null; // redirecting

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex flex-1 flex-col">
        <AdminHeader />
        <main className="flex-1 overflow-auto p-6">{children}</main>
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
