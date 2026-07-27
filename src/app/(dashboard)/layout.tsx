'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/components/auth-provider';
import { Header } from '@/components/dashboard/header';
import { MERCHANT_NAV, MobileNav, Sidebar } from '@/components/dashboard/sidebar';

function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, user, merchant } = useAuth();

  useEffect(() => {
    // Admins and operations users belong in their own panels, not the merchant one.
    if (!loading && user?.role === 'ADMIN') {
      router.replace('/admin');
    } else if (!loading && user?.role === 'OPERATIONS') {
      router.replace('/ops');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="label">Cargando</span>
      </div>
    );
  }
  if (!merchant) return null; // AuthProvider redirects to /login (or admin redirect above)

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <MobileNav items={MERCHANT_NAV} />
        <main className="flex-1 overflow-x-clip p-[var(--space-sm)] lg:p-[var(--space-md)]">
          {children}
        </main>
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

