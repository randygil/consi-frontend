'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Notice, PageHead } from '@/components/ui/page-head';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api-client';
import { formatDate, formatMoney } from '@/lib/format';
import type { AdminMerchantSummary } from '@/lib/types';

export default function AdminMerchantsPage() {
  const [merchants, setMerchants] = useState<AdminMerchantSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .adminGetMerchants()
      .then(setMerchants)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'));
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

      {error ? <Notice kind="err">{error}</Notice> : null}

      <Card className="p-[var(--space-md)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Comercio</TableHead>
              <TableHead>Entorno</TableHead>
              <TableHead className="text-right">Saldos</TableHead>
              <TableHead className="text-right">Usuarios</TableHead>
              <TableHead className="text-right">Transacciones</TableHead>
              <TableHead className="text-right">Creado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {merchants.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="p-0">
                  {/* The whole cell is the hit area — no cursor-pointer on a non-link row. */}
                  <Link
                    href={`/admin/merchants/${m.id}`}
                    className="block px-3 py-2.5 transition-colors duration-[var(--dur-fast)] hover:text-[var(--color-accent)]"
                  >
                    <span className="block text-[length:var(--text-sm)] font-medium text-[var(--color-ink)]">
                      {m.businessName}
                    </span>
                    <span className="block truncate text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
                      {m.email}
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge>{m.environment === 'LIVE' ? 'Real' : 'Prueba'}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {m.wallets.map((w) => (
                    <div key={w.currency} className="num text-[length:var(--text-sm)]">
                      {formatMoney(w.balance, w.currency)}
                    </div>
                  ))}
                </TableCell>
                <TableCell className="num text-right">{m._count.users}</TableCell>
                <TableCell className="num text-right">{m._count.transactions}</TableCell>
                <TableCell className="whitespace-nowrap text-right text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
                  {formatDate(m.createdAt)}
                </TableCell>
              </TableRow>
            ))}
            {merchants.length === 0 && !error ? (
              <TableRow>
                <TableCell colSpan={6} className="py-[var(--space-lg)] text-center text-[var(--color-ink-3)]">
                  Sin comercios todavía.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
