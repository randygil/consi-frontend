'use client';

import { ArrowDown, ArrowUp, Link2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CurrencyHero } from '@/components/dashboard/currency-hero';
import { WeeklyChart } from '@/components/dashboard/weekly-chart';
import { StatusBadge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api-client';
import { formatDate, formatMoney, typeLabel } from '@/lib/format';
import type { ExchangeRate, Transaction, Wallet } from '@/lib/types';

export default function DashboardPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [rate, setRate] = useState<ExchangeRate | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState('');

  useEffect(() => {
    setToday(
      new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'short', year: 'numeric' }).format(
        new Date(),
      ),
    );
    Promise.all([api.getBalances(), api.getLatestRate(), api.getTransactions({ take: '5' })])
      .then(([w, r, t]) => {
        setWallets(w);
        setRate(r);
        setTransactions(t);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'));
  }, []);

  const usd = wallets.find((w) => w.currency === 'USD');
  const ves = wallets.find((w) => w.currency === 'VES');
  const usdVesRate = rate ? Number(rate.rate) : 0;

  // Total available expressed in USD (VES converted at the live rate).
  const totalUsd =
    Number(usd?.available ?? 0) + (usdVesRate ? Number(ves?.available ?? 0) / usdVesRate : 0);

  const recent = transactions.slice(0, 3);

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-strong)]">Resumen</h1>
        <span className="text-[13px] text-[var(--text-subtle)]">{today ? `Hoy · ${today}` : ''}</span>
      </div>

      {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}

      <CurrencyHero
        usdAvailable={Number(usd?.available ?? 0)}
        vesAvailable={Number(ves?.available ?? 0)}
        totalUsd={totalUsd}
        rate={usdVesRate}
      />

      {/* Payment links CTA — surfaces the headline capability on the landing screen */}
      <Link
        href="/links"
        className="group flex items-center gap-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--blue-100)] p-5 transition-shadow hover:shadow-[var(--shadow-md)]"
        style={{ background: 'var(--gradient-brand-soft)' }}
      >
        <span
          className="flex size-11 flex-none items-center justify-center rounded-[12px] text-white"
          style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--glow-brand)' }}
        >
          <Link2 size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold text-[var(--text-strong)]">Cobra con un link de pago</div>
          <div className="text-[13px] text-[var(--text-muted)]">
            Compártelo o incrústalo en tu web — tus clientes pagan con Pago Móvil, transferencia, USDT o tarjeta.
          </div>
        </div>
        <span className="flex flex-none items-center gap-1.5 rounded-[var(--radius-pill)] bg-white px-4 py-2 text-[13px] font-bold text-[var(--blue-700)] shadow-[var(--shadow-xs)] transition-transform group-hover:translate-x-0.5">
          <Plus size={15} /> Crear link
        </span>
      </Link>

      {/* Chart + recent activity */}
      <div className="grid gap-[18px] lg:grid-cols-[1.9fr_1fr]">
        <WeeklyChart />

        <Card className="p-[22px]">
          <CardContent className="p-0">
            <div className="mb-4 text-[15px] font-bold text-[var(--text-strong)]">
              Actividad reciente
            </div>
            {recent.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">Sin movimientos</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {recent.map((t) => {
                  const isPayin = t.type === 'PAYIN';
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 rounded-[var(--radius-sm)] p-2.5 transition-colors hover:bg-[var(--ink-50)]"
                    >
                      <span
                        className={`flex size-[34px] flex-none items-center justify-center rounded-[10px] ${
                          isPayin
                            ? 'bg-[var(--blue-100)] text-[var(--blue-700)]'
                            : 'bg-[var(--violet-100)] text-[var(--violet-600)]'
                        }`}
                      >
                        {isPayin ? <ArrowDown size={17} /> : <ArrowUp size={17} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-bold text-[var(--text-strong)]">
                          {typeLabel(t.type)}
                        </div>
                        <div className="truncate text-xs text-[var(--text-subtle)]">
                          {t.customerName ?? t.description ?? t.reference.slice(0, 12)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-[13px] font-semibold text-[var(--text-strong)]">
                          {formatMoney(t.amount, t.currency)}
                        </div>
                        <div className="mt-1">
                          <StatusBadge status={t.status} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transactions table */}
      <Card className="p-[22px]">
        <CardContent className="p-0">
          <div className="mb-3.5 text-[15px] font-bold text-[var(--text-strong)]">
            Últimas transacciones
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>USD equiv.</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-bold text-[var(--text-strong)]">
                    {typeLabel(t.type)}
                  </TableCell>
                  <TableCell className="font-mono">{formatMoney(t.amount, t.currency)}</TableCell>
                  <TableCell className="font-mono text-[var(--text-muted)]">
                    {t.usdEquivalent ? formatMoney(t.usdEquivalent, 'USD') : '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                  </TableCell>
                  <TableCell className="text-right text-[var(--text-muted)]">
                    {formatDate(t.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
