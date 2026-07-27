'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MetricCard } from '@/components/dashboard/metric-card';
import { Notice, PageHead } from '@/components/ui/page-head';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api-client';
import { formatDate, formatMoney } from '@/lib/format';
import type { BankAccount, PlatformStats, Transaction } from '@/lib/types';

type PendingBank = BankAccount & { merchant: { businessName: string } };
type PendingPayout = Transaction & { merchant: { businessName: string }; bankAccount: BankAccount };

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [pendingBanks, setPendingBanks] = useState<PendingBank[]>([]);
  const [pendingPayouts, setPendingPayouts] = useState<PendingPayout[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(() => {
    Promise.all([api.adminGetStats(), api.adminGetPendingBankAccounts(), api.adminGetPendingPayouts()])
      .then(([s, b, p]) => {
        setStats(s);
        setPendingBanks(b);
        setPendingPayouts(p);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar datos'));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /** One handler for all four queue actions — they differ only by endpoint and label. */
  const act = useCallback(
    async (key: string, fn: (id: string) => Promise<unknown>, id: string) => {
      setActionLoading(key);
      setError(null);
      try {
        await fn(id);
        loadData();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'La acción falló');
      } finally {
        setActionLoading(null);
      }
    },
    [loadData],
  );

  const cards = [
    { label: 'Comercios', value: stats ? String(stats.merchantCount) : '—' },
    { label: 'Transacciones', value: stats ? String(stats.transactionCount) : '—' },
    {
      label: 'Volumen · USD',
      value: stats ? formatMoney(stats.totalPayinVolumeUsd, 'USD') : '—',
    },
    {
      label: 'Comisiones · USD',
      value: stats ? formatMoney(stats.commissionRevenueUsd, 'USD') : '—',
    },
  ];

  const queueTotal = pendingBanks.length + pendingPayouts.length;

  return (
    <div className="flex flex-col gap-[var(--space-md)]">
      <PageHead
        title="Plataforma"
        lede={
          queueTotal
            ? `${queueTotal} ${queueTotal === 1 ? 'elemento' : 'elementos'} esperando revisión.`
            : 'Nada pendiente de revisión.'
        }
        action={
          <Link href="/admin/merchants/new" className={buttonVariants()}>
            <Plus size={15} /> Nuevo comercio
          </Link>
        }
      />

      {error ? <Notice kind="err">{error}</Notice> : null}

      <div className="grid gap-[var(--space-sm)] sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <MetricCard key={c.label} title={c.label} value={c.value} />
        ))}
      </div>

      <div className="grid gap-[var(--space-md)] xl:grid-cols-2">
        <Queue
          title="Cuentas bancarias"
          count={pendingBanks.length}
          empty="No hay cuentas pendientes."
          columns={['Comercio', 'Cuenta', '']}
        >
          {pendingBanks.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="align-top">
                <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-ink)]">
                  {b.merchant.businessName}
                </p>
                <span className="label">{b.currency}</span>
              </TableCell>
              <TableCell className="align-top">
                <p className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">{b.bankName}</p>
                <p className="num text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                  {b.accountNumber}
                </p>
                <p className="text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
                  {b.accountHolder}
                </p>
              </TableCell>
              <TableCell className="text-right align-top">
                <Actions
                  busy={actionLoading !== null}
                  approveLabel="Aprobar"
                  approveBusy={actionLoading === `ba-${b.id}`}
                  rejectBusy={actionLoading === `br-${b.id}`}
                  onApprove={() => act(`ba-${b.id}`, api.adminApproveBankAccount, b.id)}
                  onReject={() => act(`br-${b.id}`, api.adminRejectBankAccount, b.id)}
                />
              </TableCell>
            </TableRow>
          ))}
        </Queue>

        <Queue
          title="Retiros manuales"
          count={pendingPayouts.length}
          empty="No hay retiros pendientes."
          columns={['Comercio', 'Neto', '']}
        >
          {pendingPayouts.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="align-top">
                <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-ink)]">
                  {p.merchant.businessName}
                </p>
                <p className="num truncate text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
                  {p.reference.slice(0, 14)}
                </p>
                {p.bankAccount ? (
                  <p className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                    {p.bankAccount.bankName} ····{p.bankAccount.accountNumber.slice(-4)}
                  </p>
                ) : (
                  <p className="text-[length:var(--text-xs)] text-[var(--color-bad)]">
                    Sin cuenta bancaria
                  </p>
                )}
              </TableCell>
              <TableCell className="align-top text-right">
                <p className="num text-[length:var(--text-sm)] text-[var(--color-ink)]">
                  {p.netAmount
                    ? formatMoney(p.netAmount, p.currency)
                    : formatMoney(p.amount, p.currency)}
                </p>
                <p className="num text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
                  bruto {formatMoney(p.amount, p.currency)}
                </p>
                <p className="text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
                  {formatDate(p.createdAt)}
                </p>
              </TableCell>
              <TableCell className="text-right align-top">
                <Actions
                  busy={actionLoading !== null || !p.bankAccount}
                  approveLabel="Liquidar"
                  approveBusy={actionLoading === `pa-${p.id}`}
                  rejectBusy={actionLoading === `pr-${p.id}`}
                  onApprove={() => act(`pa-${p.id}`, api.adminApprovePayout, p.id)}
                  onReject={() => act(`pr-${p.id}`, api.adminRejectPayout, p.id)}
                />
              </TableCell>
            </TableRow>
          ))}
        </Queue>
      </div>
    </div>
  );
}

function Queue({
  title,
  count,
  empty,
  columns,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  columns: string[];
  children: React.ReactNode;
}) {
  return (
    <Card className="p-[var(--space-md)]">
      <div className="mb-[var(--space-sm)] flex items-baseline justify-between gap-2">
        <h2 className="text-[length:var(--text-md)]">{title}</h2>
        <span
          className={`rounded-[var(--radius-xs)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] font-medium ${
            count
              ? 'bg-[var(--color-warn-soft)] text-[var(--color-warn)]'
              : 'text-[var(--color-ink-4)]'
          }`}
        >
          {count}
        </span>
      </div>
      {count === 0 ? (
        <p className="py-[var(--space-lg)] text-center text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
          {empty}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c, i) => (
                <TableHead key={c || i} className={i === columns.length - 1 ? 'text-right' : ''}>
                  {c}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>{children}</TableBody>
        </Table>
      )}
    </Card>
  );
}

function Actions({
  busy,
  approveLabel,
  approveBusy,
  rejectBusy,
  onApprove,
  onReject,
}: {
  busy: boolean;
  approveLabel: string;
  approveBusy: boolean;
  rejectBusy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="flex justify-end gap-1.5">
      <Button size="sm" variant="outline" disabled={busy} onClick={onApprove}>
        {approveBusy ? '…' : approveLabel}
      </Button>
      <Button size="sm" variant="destructive" disabled={busy} onClick={onReject}>
        {rejectBusy ? '…' : 'Rechazar'}
      </Button>
    </div>
  );
}
