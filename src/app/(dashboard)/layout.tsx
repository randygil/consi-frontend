'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/components/auth-provider';
import { Header } from '@/components/dashboard/header';
import { Sidebar } from '@/components/dashboard/sidebar';

function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, user, merchant } = useAuth();

  useEffect(() => {
    // Admins belong in the admin dashboard, not the merchant one.
    if (!loading && user?.role === 'ADMIN') {
      router.replace('/admin');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--muted-foreground)]">
        Cargando…
      </div>
    );
  }
  if (!merchant) return null; // AuthProvider redirects to /login (or admin redirect above)
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}
