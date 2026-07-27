'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Notice } from '@/components/ui/page-head';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

  if (error) return <Notice kind="err">{error}</Notice>;
  if (!merchant) return <span className="label">Cargando</span>;

  return (
    <div className="flex flex-col gap-[var(--space-md)]">
      <Link
        href="/admin/merchants"
        className="inline-flex w-fit items-center gap-1.5 text-[length:var(--text-sm)] text-[var(--color-ink-3)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--color-ink)]"
      >
        <ArrowLeft size={14} /> Comercios
      </Link>

      <div className="border-b border-[var(--color-rule)] pb-[var(--space-sm)]">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[length:var(--text-xl)]">{merchant.businessName}</h1>
          <Badge>{merchant.environment === 'LIVE' ? 'Real' : 'Prueba'}</Badge>
        </div>
        <dl className="mt-2 flex flex-wrap gap-x-[var(--space-md)] gap-y-1 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
          <Meta label="Correo" value={merchant.email} />
          <Meta label="Retención" value={`${merchant.retentionDays} días`} />
          <Meta label="Pasarela" value={merchant.defaultGateway ?? '—'} />
        </dl>
      </div>

      <div className="grid gap-[var(--space-sm)] sm:grid-cols-2">
        {merchant.wallets.map((w) => (
          <Card key={w.id} className="p-[var(--space-sm)]">
            <span className="label">Saldo · {w.currency}</span>
            <p className="num mt-2 text-[length:var(--text-lg)] font-medium text-[var(--color-ink)]">
              {formatMoney(w.balance, w.currency)}
            </p>
            <p className="num mt-1 text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
              disponible {formatMoney(w.available, w.currency)}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="text-right">Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {merchant.users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="text-[var(--color-ink)]">{u.email}</TableCell>
                  <TableCell>
                    <Badge>{u.role}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
                    {formatDate(u.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transacciones recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {merchant.transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap text-[var(--color-ink)]">
                    {typeLabel(t.type)}
                  </TableCell>
                  <TableCell className="num text-right text-[var(--color-ink)]">
                    {formatMoney(t.amount, t.currency)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
                    {formatDate(t.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
              {merchant.transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-[var(--space-lg)] text-center text-[var(--color-ink-3)]">
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

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="label">{label}</dt>
      <dd className="text-[var(--color-ink-2)]">{value}</dd>
    </div>
  );
}
