'use client';

/* Hallmark · genre: modern-minimal · macrostructure: 05 Workbench
 * design-system: design.md · theme: Cobalt (light + dark)
 * The reference DataTable surface: server filters in the toolbar, client sort,
 * search, column visibility and export over the loaded set.
 */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Column, DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Notice, PageHead } from '@/components/ui/page-head';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api-client';
import { formatDate, formatMoney, statusLabel } from '@/lib/format';
import type { Terminal, Transaction } from '@/lib/types';

const EMPTY_FILTERS = { status: '', currency: '', terminalId: '', from: '', to: '' };

/** Server-side filters travel as query params; the DataTable filters on top of the result. */
function toParams(filters: typeof EMPTY_FILTERS, extra: Record<string, string> = {}) {
  const params: Record<string, string> = { type: 'PAYIN', ...extra };
  if (filters.status) params.status = filters.status;
  if (filters.currency) params.currency = filters.currency;
  if (filters.terminalId) params.terminalId = filters.terminalId;
  if (filters.from) params.from = new Date(filters.from).toISOString();
  if (filters.to) params.to = new Date(filters.to).toISOString();
  return params;
}

function sumBy(rows: Transaction[], currency: string): number {
  return rows
    .filter((t) => t.currency === currency)
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);
}

export default function TransactionsPage() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Deep-linkable from a terminal's page ("ver todos en Cobros"), so the filter starts
  // from the URL rather than resetting the moment the merchant navigates here.
  const initialTerminalId = useSearchParams().get('terminalId') ?? '';
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, terminalId: initialTerminalId });
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refunding, setRefunding] = useState<Transaction | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .getTransactions(toParams(filters))
      .then((data) => {
        setRows(data);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api
      .getTerminals()
      .then(setTerminals)
      .catch(() => setTerminals([]));
  }, []);

  const set =
    (k: keyof typeof filters) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
      setFilters((f) => ({ ...f, [k]: e.target.value }));

  const runAction = useCallback(
    async (id: string, action: (id: string) => Promise<Transaction>, confirmMsg: string) => {
      if (!window.confirm(confirmMsg)) return;
      setBusyId(id);
      setError(null);
      try {
        await action(id);
        load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error');
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  const columns = useMemo<Column<Transaction>[]>(
    () => [
      {
        id: 'reference',
        header: 'Referencia',
        num: true,
        align: 'left',
        value: (t) => t.reference,
        cell: (t) => (
          <span className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
            {t.reference.slice(0, 14)}
          </span>
        ),
      },
      {
        id: 'customer',
        header: 'Cliente',
        value: (t) => t.customerName ?? '',
        cell: (t) =>
          t.customerId ? (
            <Link
              href={`/customers/${t.customerId}`}
              className="text-[var(--color-accent)] underline-offset-4 hover:underline"
            >
              {t.customerName ?? 'Ver cliente'}
            </Link>
          ) : (
            <span className="text-[var(--color-ink-3)]">{t.customerName ?? '—'}</span>
          ),
      },
      {
        id: 'terminal',
        header: 'Terminal',
        // The accounting dimension, so it is visible by default and exported: the whole
        // point is telling POS income from app income without inferring it from `method`.
        value: (t) => t.terminal?.name ?? '',
        text: (t) => (t.terminal ? `${t.terminal.code} · ${t.terminal.name}` : '—'),
        cell: (t) =>
          t.terminal ? (
            <Link
              href={`/terminals/${t.terminalId}`}
              className="text-[var(--color-ink-2)] underline-offset-4 hover:text-[var(--color-accent)] hover:underline"
            >
              <span className="num text-[var(--color-ink-4)]">{t.terminal.code}</span>{' '}
              {t.terminal.name}
            </Link>
          ) : (
            <span className="text-[var(--color-ink-4)]">—</span>
          ),
      },
      {
        id: 'provider',
        header: 'Pasarela',
        value: (t) => t.provider ?? '',
        cell: (t) => <span className="text-[var(--color-ink-3)]">{t.provider ?? '—'}</span>,
      },
      { id: 'currency', header: 'Moneda', num: true, align: 'left', value: (t) => t.currency },
      {
        id: 'amount',
        header: 'Monto',
        num: true,
        value: (t) => Number(t.amount),
        text: (t) => formatMoney(t.amount, t.currency),
        cell: (t) => (
          <span className="text-[var(--color-ink)]">{formatMoney(t.amount, t.currency)}</span>
        ),
      },
      {
        id: 'fee',
        header: 'Comisión',
        num: true,
        value: (t) => (t.feeAmount ? Number(t.feeAmount) : null),
        text: (t) => (t.feeAmount ? formatMoney(t.feeAmount, t.currency) : '—'),
        cell: (t) => (
          <span className="text-[var(--color-ink-3)]">
            {t.feeAmount ? formatMoney(t.feeAmount, t.currency) : '—'}
          </span>
        ),
      },
      {
        id: 'net',
        header: 'Neto',
        num: true,
        value: (t) => (t.netAmount ? Number(t.netAmount) : null),
        text: (t) => (t.netAmount ? formatMoney(t.netAmount, t.currency) : '—'),
      },
      {
        id: 'refunded',
        header: 'Reembolsado',
        num: true,
        defaultHidden: true,
        value: (t) => (t.refundedAmount ? Number(t.refundedAmount) : null),
        text: (t) => (t.refundedAmount ? formatMoney(t.refundedAmount, t.currency) : '—'),
        cell: (t) =>
          t.refundedAmount && Number(t.refundedAmount) > 0 ? (
            <span className="text-[var(--color-bad)]">
              {formatMoney(t.refundedAmount, t.currency)}
            </span>
          ) : (
            '—'
          ),
      },
      {
        id: 'usd',
        header: 'USD equiv.',
        num: true,
        defaultHidden: true,
        value: (t) => (t.usdEquivalent ? Number(t.usdEquivalent) : null),
        text: (t) => (t.usdEquivalent ? formatMoney(t.usdEquivalent, 'USD') : '—'),
      },
      {
        id: 'status',
        header: 'Estado',
        value: (t) => t.status,
        text: (t) => statusLabel(t.status),
        cell: (t) => <StatusBadge status={t.status} />,
      },
      {
        id: 'createdAt',
        header: 'Fecha',
        num: true,
        value: (t) => t.createdAt,
        text: (t) => formatDate(t.createdAt),
        cell: (t) => (
          <span className="whitespace-nowrap text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
            {formatDate(t.createdAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Acciones',
        align: 'right',
        pinned: true,
        sortable: false,
        searchable: false,
        exportable: false,
        cell: (t) => (
          <div className="flex justify-end gap-1.5">
            {/* Pending pay-ins are settled by the gateway webhook, not the merchant. */}
            {t.status === 'AUTHORIZED' ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === t.id}
                  onClick={() =>
                    runAction(t.id, api.captureTransaction, '¿Capturar los fondos de esta transacción?')
                  }
                >
                  Capturar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busyId === t.id}
                  onClick={() =>
                    runAction(t.id, api.voidTransaction, '¿Anular la autorización de esta transacción?')
                  }
                >
                  Anular
                </Button>
              </>
            ) : null}
            {t.status === 'COMPLETED' && t.type === 'PAYIN' ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === t.id}
                  onClick={() => setRefunding(t)}
                >
                  Reembolsar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busyId === t.id}
                  onClick={() =>
                    runAction(
                      t.id,
                      api.chargebackTransaction,
                      '¿Registrar contracargo de esta transacción?',
                    )
                  }
                >
                  Contracargo
                </Button>
              </>
            ) : null}
          </div>
        ),
      },
    ],
    [busyId, runAction],
  );

  return (
    <div className="flex flex-col gap-[var(--space-md)]">
      <PageHead
        title="Transacciones"
        lede="Cada pago entrante, con su comisión, su neto y las acciones que aún admite."
      />

      <Card className="p-[var(--space-md)]">
        <DataTable
          id="transactions"
          caption="Transacciones"
          columns={columns}
          rows={rows}
          rowKey={(t) => t.id}
          loading={loading}
          error={error}
          empty="Sin transacciones para estos filtros."
          searchPlaceholder="Buscar por referencia, cliente o pasarela…"
          defaultSort={{ id: 'createdAt', dir: 'desc' }}
          exportFilename="transacciones_consi"
          // The list endpoint is capped; an export should not be.
          exportAll={() => api.getTransactions(toParams(filters, { take: '5000' }))}
          exportSummary={(data) => [
            `Bruto USD ${formatMoney(sumBy(data, 'USD'), 'USD')}`,
            `Bruto VES ${formatMoney(sumBy(data, 'VES'), 'VES')}`,
          ]}
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <Select
                aria-label="Filtrar por estado"
                value={filters.status}
                onChange={set('status')}
                className="h-9 w-auto"
              >
                <option value="">Todos los estados</option>
                <option value="PENDING">Pendiente</option>
                <option value="AUTHORIZED">Autorizado</option>
                <option value="COMPLETED">Completado</option>
                <option value="FAILED">Fallido</option>
                <option value="REFUNDED">Reembolsado</option>
              </Select>
              <Select
                aria-label="Filtrar por moneda"
                value={filters.currency}
                onChange={set('currency')}
                className="h-9 w-auto"
              >
                <option value="">Todas las monedas</option>
                <option value="USD">USD</option>
                <option value="VES">VES</option>
                <option value="USDT">USDT</option>
              </Select>
              <Select
                aria-label="Filtrar por terminal"
                value={filters.terminalId}
                onChange={set('terminalId')}
                className="h-9 w-auto"
              >
                <option value="">Todas las terminales</option>
                {terminals.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} · {t.name}
                  </option>
                ))}
              </Select>
              <Input
                type="date"
                aria-label="Desde"
                title="Desde"
                value={filters.from}
                onChange={set('from')}
                className="w-auto"
              />
              <Input
                type="date"
                aria-label="Hasta"
                title="Hasta"
                value={filters.to}
                onChange={set('to')}
                className="w-auto"
              />
            </div>
          }
        />
      </Card>

      {refunding ? (
        <RefundDialog
          transaction={refunding}
          onClose={() => setRefunding(null)}
          onDone={() => {
            setRefunding(null);
            load();
          }}
        />
      ) : null}
    </div>
  );
}

function RefundDialog({
  transaction,
  onClose,
  onDone,
}: {
  transaction: Transaction;
  onClose: () => void;
  onDone: () => void;
}) {
  const [partial, setPartial] = useState(false);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const net = Number(transaction.netAmount ?? transaction.amount);
  const refunded = Number(transaction.refundedAmount ?? 0);
  const remaining = net - refunded;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (partial) {
        const value = Number(amount);
        if (!Number.isFinite(value) || value <= 0) throw new Error('Monto inválido');
        if (value > remaining) throw new Error('El monto supera el disponible para reembolsar');
      }
      await api.refundTransaction(transaction.id, partial ? amount : undefined);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el reembolso');
    } finally {
      setSubmitting(false);
    }
  }

  const figures = [
    { label: 'Neto original', value: net },
    { label: 'Reembolsado', value: refunded },
    { label: 'Restante', value: remaining },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-scrim)] p-[var(--space-sm)]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby="refund-title"
        className="w-full max-w-md p-[var(--space-md)]"
      >
        <h2 id="refund-title" className="text-[length:var(--text-md)]">
          Reembolsar transacción
        </h2>
        <p className="num mt-1 text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
          {transaction.reference}
        </p>

        <dl className="mt-[var(--space-sm)] grid grid-cols-3 gap-px overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-rule)]">
          {figures.map((f) => (
            <div key={f.label} className="bg-[var(--color-surface)] p-2.5 text-center">
              <dt className="label">{f.label}</dt>
              <dd className="num mt-1 text-[length:var(--text-sm)] text-[var(--color-ink)]">
                {formatMoney(f.value, transaction.currency)}
              </dd>
            </div>
          ))}
        </dl>

        <form onSubmit={submit} className="mt-[var(--space-sm)] flex flex-col gap-[var(--space-sm)]">
          <fieldset className="flex flex-col gap-1.5">
            <legend className="label mb-1.5">Tipo de reembolso</legend>
            <div className="flex flex-wrap gap-4">
              {[
                { on: false, text: `Total (${formatMoney(remaining, transaction.currency)})` },
                { on: true, text: 'Parcial' },
              ].map((opt) => (
                <label
                  key={String(opt.on)}
                  className="flex cursor-pointer items-center gap-2 text-[length:var(--text-sm)] text-[var(--color-ink-2)]"
                >
                  <input
                    type="radio"
                    name="refundType"
                    checked={partial === opt.on}
                    onChange={() => setPartial(opt.on)}
                    className="size-4 accent-[var(--color-accent)]"
                  />
                  {opt.text}
                </label>
              ))}
            </div>
          </fieldset>

          {partial ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="refund-amount">Monto a reembolsar ({transaction.currency})</Label>
              <Input
                id="refund-amount"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="num"
              />
            </div>
          ) : null}

          {error ? <Notice kind="err">{error}</Notice> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={submitting} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Procesando…' : 'Reembolsar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
