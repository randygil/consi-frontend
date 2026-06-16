'use client';

import Link from 'next/link';
import { Store, ArrowLeftRight, Wallet, Percent } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';
import type { PlatformStats } from '@/lib/types';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .adminGetStats()
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'));
  }, []);

  const cards = [
    { label: 'Comercios', value: stats ? String(stats.merchantCount) : '—', icon: Store },
    {
      label: 'Transacciones',
      value: stats ? String(stats.transactionCount) : '—',
      icon: ArrowLeftRight,
    },
    {
      label: 'Volumen de pagos (USD)',
      value: stats ? formatMoney(stats.totalPayinVolumeUsd, 'USD') : '—',
      icon: Wallet,
    },
    {
      label: 'Comisiones (USD)',
      value: stats ? formatMoney(stats.commissionRevenueUsd, 'USD') : '—',
      icon: Percent,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--text-strong)]">Resumen de la plataforma</h1>
        <Link
          href="/admin/merchants/new"
          className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-bold text-white"
          style={{ background: 'var(--gradient-brand)' }}
        >
          + Nuevo comercio
        </Link>
      </div>

      {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-5">
              <span className="flex size-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--blue-50)] text-[var(--blue-700)]">
                <Icon size={20} />
              </span>
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)]">{label}</p>
                <p className="text-lg font-bold text-[var(--text-strong)]">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
