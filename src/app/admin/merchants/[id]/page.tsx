'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api-client';
import { formatDate, formatMoney, typeLabel } from '@/lib/format';
import type { AdminMerchantDetail } from '@/lib/types';

export default function AdminMerchantDetailPage() {
  const params = useParams<{ id: string }>();
  const [merchant, setMerchant] = useState<AdminMerchantDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    api
      .adminGetMerchant(params.id)
      .then(setMerchant)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'));
  }, [params.id]);

  if (error) return <p className="text-sm text-[var(--destructive)]">{error}</p>;
  if (!merchant) return <p className="text-[var(--text-muted)]">Cargando…</p>;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/merchants"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-strong)]"
      >
        <ArrowLeft size={16} /> Comercios
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-[var(--text-strong)]">{merchant.businessName}</h1>
        <Badge>{merchant.environment === 'LIVE' ? 'Real' : 'Prueba'}</Badge>
      </div>
      <p className="-mt-4 text-sm text-[var(--text-muted)]">
        {merchant.email} · Retención {merchant.retentionDays} días · Pasarela{' '}
        {merchant.defaultGateway ?? '—'}
      </p>

      {/* Wallets */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {merchant.wallets.map((w) => (
          <Card key={w.id}>
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-[var(--text-muted)]">Saldo {w.currency}</p>
              <p className="text-lg font-bold text-[var(--text-strong)]">
                {formatMoney(w.balance, w.currency)}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Disponible {formatMoney(w.available, w.currency)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {merchant.users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge>{u.role}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-[var(--text-muted)]">
                    {formatDate(u.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Transacciones recientes</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {merchant.transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{typeLabel(t.type)}</TableCell>
                  <TableCell>{formatMoney(t.amount, t.currency)}</TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                  </TableCell>
                  <TableCell className="text-sm text-[var(--text-muted)]">
                    {formatDate(t.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
              {merchant.transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-[var(--text-muted)]">
                    Sin transacciones.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
