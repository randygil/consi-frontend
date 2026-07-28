'use client';

/* Hallmark · genre: modern-minimal · macrostructure: 05 Workbench
 * design-system: design.md · theme: Cobalt (light + dark)
 */

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Column, DataTable } from '@/components/ui/data-table';
import { PageHead } from '@/components/ui/page-head';
import { api } from '@/lib/api-client';
import { formatDate, formatMoney } from '@/lib/format';
import type { AdminMerchantSummary } from '@/lib/types';

const COLUMNS: Column<AdminMerchantSummary>[] = [
  {
    id: 'businessName',
    header: 'Comercio',
    value: (m) => m.businessName,
    cell: (m) => (
      <Link
        href={`/admin/merchants/${m.id}`}
        className="block transition-colors duration-[var(--dur-fast)] hover:text-[var(--color-accent)]"
      >
        <span className="block text-[length:var(--text-sm)] font-medium text-[var(--color-ink)]">
          {m.businessName}
        </span>
        <span className="block truncate text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
          {m.email}
        </span>
      </Link>
    ),
  },
  { id: 'email', header: 'Correo', value: (m) => m.email, defaultHidden: true },
  {
    id: 'environment',
    header: 'Entorno',
    value: (m) => m.environment,
    text: (m) => (m.environment === 'LIVE' ? 'Real' : 'Prueba'),
    cell: (m) => <Badge>{m.environment === 'LIVE' ? 'Real' : 'Prueba'}</Badge>,
  },
  {
    id: 'wallets',
    header: 'Saldos',
    align: 'right',
    // Multi-currency: there is no single number to rank these by.
    sortable: false,
    value: (m) => m.wallets.map((w) => `${w.currency} ${w.balance}`).join(' '),
    text: (m) => m.wallets.map((w) => formatMoney(w.balance, w.currency)).join(' · '),
    cell: (m) =>
      m.wallets.length === 0 ? (
        '—'
      ) : (
        <>
          {m.wallets.map((w) => (
            <div key={w.currency} className="num text-[length:var(--text-sm)]">
              {formatMoney(w.balance, w.currency)}
            </div>
          ))}
        </>
      ),
  },
  { id: 'users', header: 'Usuarios', num: true, value: (m) => m._count.users },
  { id: 'transactions', header: 'Transacciones', num: true, value: (m) => m._count.transactions },
  {
    id: 'createdAt',
    header: 'Creado',
    num: true,
    value: (m) => m.createdAt,
    text: (m) => formatDate(m.createdAt),
    cell: (m) => (
      <span className="whitespace-nowrap text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
        {formatDate(m.createdAt)}
      </span>
    ),
  },
];

export default function AdminMerchantsPage() {
  const [merchants, setMerchants] = useState<AdminMerchantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .adminGetMerchants()
      .then(setMerchants)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-[var(--space-md)]">
      <PageHead
        title="Comercios"
        lede={`${merchants.length} ${merchants.length === 1 ? 'comercio registrado' : 'comercios registrados'}.`}
        action={
          <Link href="/admin/merchants/new" className={buttonVariants()}>
            <Plus size={15} /> Nuevo comercio
          </Link>
        }
      />

      <Card className="p-[var(--space-md)]">
        <DataTable
          id="admin-merchants"
          caption="Comercios"
          columns={COLUMNS}
          rows={merchants}
          rowKey={(m) => m.id}
          loading={loading}
          error={error}
          empty="Sin comercios todavía."
          searchPlaceholder="Buscar por nombre o correo…"
          defaultSort={{ id: 'createdAt', dir: 'desc' }}
          exportFilename="comercios_consi"
        />
      </Card>
    </div>
  );
}
