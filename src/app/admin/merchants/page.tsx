'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--text-strong)]">Comercios</h1>
        <Link
          href="/admin/merchants/new"
          className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-bold text-white"
          style={{ background: 'var(--gradient-brand)' }}
        >
          + Nuevo comercio
        </Link>
      </div>

      {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}

      <Card className="p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Comercio</TableHead>
              <TableHead>Entorno</TableHead>
              <TableHead>Saldos</TableHead>
              <TableHead>Usuarios</TableHead>
              <TableHead>Transacciones</TableHead>
              <TableHead>Creado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {merchants.map((m) => (
              <TableRow key={m.id} className="cursor-pointer">
                <TableCell>
                  <Link href={`/admin/merchants/${m.id}`} className="block">
                    <span className="font-semibold text-[var(--text-strong)]">
                      {m.businessName}
                    </span>
                    <span className="block text-xs text-[var(--text-muted)]">{m.email}</span>
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge>{m.environment === 'LIVE' ? 'Real' : 'Prueba'}</Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {m.wallets.map((w) => (
                    <div key={w.currency}>{formatMoney(w.balance, w.currency)}</div>
                  ))}
                </TableCell>
                <TableCell>{m._count.users}</TableCell>
                <TableCell>{m._count.transactions}</TableCell>
                <TableCell className="text-sm text-[var(--text-muted)]">
                  {formatDate(m.createdAt)}
                </TableCell>
              </TableRow>
            ))}
            {merchants.length === 0 && !error ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
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
