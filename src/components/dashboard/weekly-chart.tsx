'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';
import type { Transaction } from '@/lib/types';

const DAYS = 7;

interface Bucket {
  key: string;
  label: string;
  total: number;
}

/** Local-calendar day key, so a 23:00 payment lands on the day the merchant saw it. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Seven empty buckets, oldest first, ending today. */
function emptyWeek(): Bucket[] {
  const fmt = new Intl.DateTimeFormat('es-VE', { weekday: 'short' });
  return Array.from({ length: DAYS }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (DAYS - 1 - i));
    return { key: dayKey(d), label: fmt.format(d).replace('.', ''), total: 0 };
  });
}

/** USD value of a transaction — usdEquivalent when the backend computed one. */
function usdValue(t: Transaction): number {
  if (t.usdEquivalent) return Number(t.usdEquivalent);
  return t.currency === 'USD' ? Number(t.amount) : 0;
}

export function WeeklyChart() {
  const [buckets, setBuckets] = useState<Bucket[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - (DAYS - 1));

    // ponytail: derives the series client-side from the transaction list the API
    // already exposes. Ceiling is the endpoint's take=100 cap — a merchant doing
    // >100 pay-ins a week would see a partial week, which is why `truncated`
    // renders a warning rather than silently under-reporting. Upgrade path: a
    // GET /transactions/daily-volume aggregate on the backend.
    api
      .getTransactions({
        type: 'PAYIN',
        status: 'COMPLETED',
        from: from.toISOString(),
        take: '100',
      })
      .then((rows) => {
        setTruncated(rows.length >= 100);
        const week = emptyWeek();
        const byKey = new Map(week.map((b) => [b.key, b]));
        for (const t of rows) {
          const b = byKey.get(dayKey(new Date(t.createdAt)));
          if (b) b.total += usdValue(t);
        }
        setBuckets(week);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'));
  }, []);

  const total = buckets?.reduce((s, b) => s + b.total, 0) ?? 0;
  const max = Math.max(...(buckets?.map((b) => b.total) ?? [0]), 0);

  return (
    <Card className="flex flex-col p-[var(--space-md)]">
      <div className="mb-[var(--space-md)] flex items-start justify-between gap-[var(--space-sm)]">
        <div>
          <h2 className="text-[length:var(--text-md)]">Pagos recibidos</h2>
          <p className="label pt-1">USD · últimos {DAYS} días</p>
        </div>
        <div className="text-right">
          <div className="num text-[length:var(--text-lg)] font-medium text-[var(--color-ink)]">
            {buckets ? formatMoney(total, 'USD') : '—'}
          </div>
          <p className="label pt-1">Total cobrado</p>
        </div>
      </div>

      {error ? (
        <p className="py-[var(--space-lg)] text-center text-[length:var(--text-sm)] text-[var(--color-bad)]">
          {error}
        </p>
      ) : !buckets ? (
        <p className="py-[var(--space-lg)] text-center">
          <span className="label">Cargando</span>
        </p>
      ) : max === 0 ? (
        <p className="py-[var(--space-lg)] text-center text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
          Sin pagos completados en los últimos {DAYS} días.
        </p>
      ) : (
        <ul className="flex h-[168px] items-end gap-1.5" role="list">
          {buckets.map((b) => {
            const pct = max ? (b.total / max) * 100 : 0;
            return (
              <li key={b.key} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
                <div
                  className="w-full rounded-t-[var(--radius-xs)] bg-[var(--color-accent)]"
                  // Zero days keep a 2px stub so the axis stays legible.
                  style={{ height: `max(2px, ${pct}%)`, opacity: b.total ? 1 : 0.25 }}
                  role="img"
                  aria-label={`${b.label}: ${formatMoney(b.total, 'USD')}`}
                />
                <span className="label text-center">{b.label}</span>
              </li>
            );
          })}
        </ul>
      )}

      {truncated ? (
        <p className="mt-[var(--space-xs)] text-[length:var(--text-xs)] text-[var(--color-warn)]">
          Mostrando las primeras 100 transacciones del período — el total puede ser mayor.
        </p>
      ) : null}
    </Card>
  );
}
