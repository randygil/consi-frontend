'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/components/auth-provider';

function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, user, logout } = useAuth();

  useEffect(() => {
    // Only operations and admins manage Consi liquidity accounts.
    if (!loading && user && user.role !== 'OPERATIONS' && user.role !== 'ADMIN') {
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
  if (!user || (user.role !== 'OPERATIONS' && user.role !== 'ADMIN')) return null;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="flex h-[68px] items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-4 md:px-7">
        <div className="flex items-center gap-2.5">
          <span
            className="size-2.5 rounded-full"
            style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--glow-brand)' }}
          />
          <span className="text-lg font-extrabold tracking-tight text-[var(--text-strong)]">Consi</span>
          <span className="text-xs font-semibold text-[var(--text-subtle)]">Operaciones</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {user.role === 'ADMIN' ? (
            <Link href="/admin" className="font-semibold text-[var(--text-muted)] hover:text-[var(--text-strong)]">
              ← Admin
            </Link>
          ) : null}
          <span className="text-[var(--text-subtle)]">{user.email}</span>
          <button onClick={logout} className="font-semibold text-[var(--text-muted)] hover:text-[var(--text-strong)]">
            Salir
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 md:p-6">{children}</main>
    </div>
  );
}

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}
