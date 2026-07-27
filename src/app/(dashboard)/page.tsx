'use client';

import { ArrowDown, ArrowUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CurrencyHero } from '@/components/dashboard/currency-hero';
import { WeeklyChart } from '@/components/dashboard/weekly-chart';
import { StatusBadge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Notice, PageHead } from '@/components/ui/page-head';
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

  const recent = transactions.slice(0, 4);

  return (
    <div className="flex flex-col gap-[var(--space-md)]">
      <PageHead
        title="Resumen"
        action={today ? <span className="label">{today}</span> : undefined}
      />

      {error ? <Notice kind="err">{error}</Notice> : null}

      <CurrencyHero
        usdAvailable={Number(usd?.available ?? 0)}
        vesAvailable={Number(ves?.available ?? 0)}
        totalUsd={totalUsd}
        rate={usdVesRate}
      />

      {/* Payment links are the headline capability — a typographic row, not a
          gradient promo card. The CTA names the destination. */}
      <Link
        href="/links"
        className="group flex items-center justify-between gap-[var(--space-sm)] rounded-[var(--radius-md)] border border-[var(--color-rule)] bg-[var(--color-surface)] p-[var(--space-sm)] transition-colors duration-[var(--dur-fast)] hover:border-[var(--color-accent)]"
      >
        <div className="min-w-0">
          <div className="text-[length:var(--text-base)] font-medium text-[var(--color-ink)]">
            Cobra con un link de pago
          </div>
          <div className="mt-0.5 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
            Pago Móvil, transferencia, USDT o tarjeta — sin que el cliente salga de tu web.
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[length:var(--text-sm)] font-medium text-[var(--color-accent)]">
          Crear link
          <ArrowRight
            size={14}
            className="transition-transform duration-[var(--dur-fast)] group-hover:translate-x-0.5"
          />
        </span>
      </Link>

      <div className="grid gap-[var(--space-md)] lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <WeeklyChart />

        <Card className="flex flex-col p-[var(--space-md)]">
          <h2 className="text-[length:var(--text-md)]">Actividad reciente</h2>
          {recent.length === 0 ? (
            <p className="py-[var(--space-lg)] text-center text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
              Sin movimientos todavía.
            </p>
          ) : (
            <ul className="mt-[var(--space-xs)] divide-y divide-[var(--color-rule)]">
              {recent.map((t) => {
                const isPayin = t.type === 'PAYIN';
                return (
                  <li key={t.id} className="flex items-center gap-2.5 py-2.5">
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-xs)] border border-[var(--color-rule)] text-[var(--color-ink-3)]"
                      aria-hidden
                    >
                      {isPayin ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[length:var(--text-sm)] text-[var(--color-ink)]">
                        {typeLabel(t.type)}
                      </div>
                      <div className="truncate text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
                        {t.customerName ?? t.description ?? t.reference.slice(0, 14)}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="num text-[length:var(--text-sm)] text-[var(--color-ink)]">
                        {formatMoney(t.amount, t.currency)}
                      </div>
                      <div className="mt-1">
                        <StatusBadge status={t.status} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-[var(--space-md)]">
        <h2 className="mb-[var(--space-sm)] text-[length:var(--text-md)]">Últimas transacciones</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">USD equiv.</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-[var(--space-lg)] text-center text-[var(--color-ink-3)]">
                  Sin transacciones.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-[var(--color-ink)]">{typeLabel(t.type)}</TableCell>
                  <TableCell className="num text-right text-[var(--color-ink)]">
                    {formatMoney(t.amount, t.currency)}
                  </TableCell>
                  <TableCell className="num text-right">
                    {t.usdEquivalent ? formatMoney(t.usdEquivalent, 'USD') : '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
                    {formatDate(t.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
