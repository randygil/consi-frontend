'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/components/auth-provider';
import { Header } from '@/components/dashboard/header';
import { Sidebar } from '@/components/dashboard/sidebar';

function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, user, merchant } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      <div className="flex min-h-screen items-center justify-center text-[var(--muted-foreground)]">
        Cargando…
      </div>
    );
  }
  if (!merchant) return null; // AuthProvider redirects to /login (or admin redirect above)

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-[236px] md:shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar (Drawer Overlay) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Overlay backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer content */}
          <div className="relative flex w-[260px] flex-col bg-[var(--sidebar)] p-4 shadow-xl animate-in slide-in-from-left duration-200">
            {/* Close button inside drawer */}
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-md text-[var(--text-muted)] hover:bg-[var(--ink-100)]"
              >
                <span className="sr-only">Close sidebar</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <Sidebar onLinkClick={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
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

