'use client';

import Link from 'next/link';
import { Store, ArrowLeftRight, Wallet, Percent, Banknote, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api-client';
import { formatMoney, formatDate } from '@/lib/format';
import type { PlatformStats, BankAccount, Transaction } from '@/lib/types';

type PendingBank = BankAccount & { merchant: { businessName: string } };
type PendingPayout = Transaction & { merchant: { businessName: string }; bankAccount: BankAccount };

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [pendingBanks, setPendingBanks] = useState<PendingBank[]>([]);
  const [pendingPayouts, setPendingPayouts] = useState<PendingPayout[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(() => {
    Promise.all([
      api.adminGetStats(),
      api.adminGetPendingBankAccounts(),
      api.adminGetPendingPayouts()
    ])
      .then(([s, b, p]) => {
        setStats(s);
        setPendingBanks(b);
        setPendingPayouts(p);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar datos del administrador'));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleApproveBank(id: string) {
    setActionLoading(`bank-approve-${id}`);
    try {
      await api.adminApproveBankAccount(id);
      loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al aprobar la cuenta');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRejectBank(id: string) {
    setActionLoading(`bank-reject-${id}`);
    try {
      await api.adminRejectBankAccount(id);
      loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al rechazar la cuenta');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleApprovePayout(id: string) {
    setActionLoading(`payout-approve-${id}`);
    try {
      await api.adminApprovePayout(id);
      loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al aprobar el retiro');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRejectPayout(id: string) {
    setActionLoading(`payout-reject-${id}`);
    try {
      await api.adminRejectPayout(id);
      loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al rechazar el retiro');
    } finally {
      setActionLoading(null);
    }
  }

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
          className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--gradient-brand)' }}
        >
          + Nuevo comercio
        </Link>
      </div>

      {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}

      {/* Metric Cards */}
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

      {/* Admin Queue Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Queue: Pending Bank Accounts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-bold text-[var(--text-strong)] flex items-center gap-2">
              <CheckCircle2 className="text-[var(--blue-500)]" size={18} />
              <span>Validación de Cuentas Bancarias ({pendingBanks.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comercio</TableHead>
                  <TableHead>Detalles de Cuenta</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingBanks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-xs text-[var(--muted-foreground)]">
                      No hay cuentas bancarias pendientes de aprobación.
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingBanks.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="align-top">
                        <p className="font-semibold text-sm text-[var(--foreground)]">{b.merchant.businessName}</p>
                        <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
                          Moneda: {b.currency}
                        </span>
                      </TableCell>
                      <TableCell className="align-top space-y-0.5">
                        <p className="font-semibold text-xs text-[var(--foreground)]">{b.bankName}</p>
                        <p className="text-xs text-[var(--muted-foreground)] font-mono">{b.accountNumber}</p>
                        <p className="text-[10px] text-[var(--muted-foreground)]">Titular: {b.accountHolder}</p>
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800 border-green-200 text-xs px-2.5 py-1 h-auto"
                            disabled={actionLoading !== null}
                            onClick={() => handleApproveBank(b.id)}
                          >
                            {actionLoading === `bank-approve-${b.id}` ? 'Aprobando…' : 'Aprobar'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border-red-200 text-xs px-2.5 py-1 h-auto"
                            disabled={actionLoading !== null}
                            onClick={() => handleRejectBank(b.id)}
                          >
                            {actionLoading === `bank-reject-${b.id}` ? 'Rechazando…' : 'Rechazar'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Queue: Pending Manual Payouts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-bold text-[var(--text-strong)] flex items-center gap-2">
              <ShieldAlert className="text-amber-500" size={18} />
              <span>Aprobación de Retiros Manuales ({pendingPayouts.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comercio / Destino</TableHead>
                  <TableHead>Monto Neto</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPayouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-xs text-[var(--muted-foreground)]">
                      No hay retiros manuales pendientes de aprobación.
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingPayouts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="align-top space-y-0.5">
                        <p className="font-semibold text-sm text-[var(--foreground)]">{p.merchant.businessName}</p>
                        <p className="text-[10px] text-[var(--muted-foreground)] font-mono truncate max-w-[180px]">
                          Ref: {p.reference.slice(0, 14)}…
                        </p>
                        {p.bankAccount ? (
                          <div className="text-[11px] text-[var(--text-muted)] pt-0.5">
                            <span className="font-semibold">{p.bankAccount.bankName}</span> · {p.bankAccount.accountNumber.slice(-4)}
                          </div>
                        ) : p.destinationAccountNumber ? (
                          <div className="text-[11px] text-[var(--text-muted)] pt-0.5">
                            <span className="font-semibold">{p.destinationBankName || 'Crypto/Otros'}</span> · {p.destinationAccountNumber.slice(-4)}
                          </div>
                        ) : p.destinationCryptoAddress ? (
                          <div className="text-[11px] text-[var(--text-muted)] pt-0.5">
                            <span className="font-semibold">Crypto (USDT)</span> · {p.destinationCryptoAddress.slice(-6)}
                          </div>
                        ) : (
                          <span className="text-xs text-red-500">Sin detalles de destino</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        <p className="font-bold font-mono text-sm text-[var(--foreground)]">
                          {p.netAmount ? formatMoney(p.netAmount, p.currency) : formatMoney(p.amount, p.currency)}
                        </p>
                        <p className="text-[10px] text-[var(--muted-foreground)]">
                          Bruto: {formatMoney(p.amount, p.currency)}
                        </p>
                        <p className="text-[10px] text-[var(--text-subtle)]">
                          {formatDate(p.createdAt)}
                        </p>
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800 border-green-200 text-xs px-2.5 py-1 h-auto"
                            disabled={actionLoading !== null || (!p.bankAccount && !p.destinationAccountNumber && !p.destinationCryptoAddress)}
                            onClick={() => handleApprovePayout(p.id)}
                          >
                            {actionLoading === `payout-approve-${p.id}` ? 'Procesando…' : 'Liquidar'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border-red-200 text-xs px-2.5 py-1 h-auto"
                            disabled={actionLoading !== null}
                            onClick={() => handleRejectPayout(p.id)}
                          >
                            {actionLoading === `payout-reject-${p.id}` ? 'Rechazando…' : 'Rechazar'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
