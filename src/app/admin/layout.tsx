'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/components/auth-provider';
import { AdminSidebar } from '@/components/admin/sidebar';
import { Menu } from 'lucide-react';

function AdminHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, logout } = useAuth();
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Non-admins and non-operators (merchant users) don't belong here.
    if (!loading && user && user.role !== 'ADMIN' && user.role !== 'OPERATOR') {
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
  if (!user || (user.role !== 'ADMIN' && user.role !== 'OPERATOR')) return null; // redirecting

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-[236px] md:shrink-0">
        <AdminSidebar />
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
            <AdminSidebar onLinkClick={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        <AdminHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
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

