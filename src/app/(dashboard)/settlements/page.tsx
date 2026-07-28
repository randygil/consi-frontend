'use client';

/* Hallmark · genre: modern-minimal · macrostructure: 05 Workbench
 * design-system: design.md · theme: Cobalt (light + dark)
 *
 * RETENCIONES — no "liquidaciones". Aquí no se mueve dinero a ningún lado: es el
 * dinero que YA ES DEL COMERCIO pero todavía no es retirable. Se libera solo, por
 * fecha. Sacarlo al banco es otra cosa y vive en /payouts.
 */

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Column, DataTable } from '@/components/ui/data-table';
import { Notice, PageHead } from '@/components/ui/page-head';
import { api } from '@/lib/api-client';
import { formatDate, formatMoney } from '@/lib/format';
import {
  heldAmount as held,
  holdReason as reasonOf,
  holdReleaseDate as releaseDate,
  type HoldReason,
} from '@/lib/money-state';
import type { Currency, Transaction } from '@/lib/types';

const REASON_COPY: Record<HoldReason, { label: string; tone: string }> = {
  RETENCION: {
    label: 'Retención',
    tone: 'text-[var(--color-warn)] bg-[var(--color-warn-soft)]',
  },
  RESERVA: {
    label: 'Reserva',
    tone: 'text-[var(--color-accent)] bg-[var(--color-accent-soft)]',
  },
};

const COLUMNS: Column<Transaction>[] = [
  {
    id: 'reference',
    header: 'Referencia',
    num: true,
    align: 'left',
    value: (t) => t.reference,
    // Whole reference: "CNS-0001-01-000123" is 18 chars and the trailing counter is
    // the only part that differs — truncating to 14 made every row read the same.
    cell: (t) => (
      <span className="whitespace-nowrap text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
        {t.reference}
      </span>
    ),
  },
  {
    id: 'reason',
    header: 'Motivo',
    value: (t) => reasonOf(t),
    text: (t) => REASON_COPY[reasonOf(t)].label,
    cell: (t) => (
      <span
        className={`rounded-[var(--radius-xs)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] font-medium uppercase tracking-[var(--tracking-mono-label)] ${REASON_COPY[reasonOf(t)].tone}`}
      >
        {REASON_COPY[reasonOf(t)].label}
      </span>
    ),
  },
  {
    id: 'currency',
    header: 'Moneda',
    num: true,
    align: 'left',
    value: (t) => t.currency,
    cell: (t) => <span className="text-[var(--color-ink-3)]">{t.currency}</span>,
  },
  {
    id: 'held',
    header: 'Retenido',
    num: true,
    value: held,
    text: (t) => formatMoney(held(t), t.currency),
    cell: (t) => (
      <span className="text-[var(--color-ink)]">{formatMoney(held(t), t.currency)}</span>
    ),
  },
  {
    id: 'releaseDate',
    header: 'Se libera',
    num: true,
    value: (t) => releaseDate(t) ?? '',
    text: (t) => {
      const d = releaseDate(t);
      return d ? formatDate(d) : '—';
    },
    cell: (t) => {
      const d = releaseDate(t);
      return (
        <span className="whitespace-nowrap text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
          {d ? formatDate(d) : '—'}
        </span>
      );
    },
  },
];

export default function RetentionsPage() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getRetentions()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }, []);

  /** Totals per currency — the number the merchant actually came here for. */
  const totals = useMemo(() => {
    const acc = new Map<Currency, number>();
    for (const t of rows) acc.set(t.currency, (acc.get(t.currency) ?? 0) + held(t));
    return [...acc].filter(([, v]) => v > 0);
  }, [rows]);

  return (
    <div className="flex flex-col gap-[var(--space-md)]">
      <PageHead
        title="Retenciones"
        lede="Ya es tuyo. Todavía no es retirable. Este dinero se libera solo en la fecha indicada y pasa a tu saldo disponible — no tienes que hacer nada."
      />

      {error ? <Notice kind="err">{error}</Notice> : null}

      {totals.length > 0 ? (
        <div className="grid gap-[var(--space-sm)] sm:grid-cols-3">
          {totals.map(([currency, amount]) => (
            <Card key={currency} className="p-[var(--space-sm)]">
              <div className="font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] uppercase tracking-[var(--tracking-mono-label)] text-[var(--color-ink-3)]">
                Retenido en {currency}
              </div>
              <div className="num mt-1.5 truncate text-[length:var(--text-xl)] font-medium text-[var(--color-ink)]">
                {formatMoney(amount, currency)}
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <Card className="p-[var(--space-md)]">
        <div className="mb-[var(--space-sm)] flex items-baseline justify-between gap-[var(--space-sm)]">
          <h2 className="text-[length:var(--text-md)]">Cobros con fondos retenidos</h2>
          <span className="label">
            {rows.length} {rows.length === 1 ? 'cobro' : 'cobros'}
          </span>
        </div>
        <DataTable
          id="retentions"
          caption="Cobros con fondos retenidos"
          columns={COLUMNS}
          rows={rows}
          rowKey={(t) => t.id}
          loading={loading}
          empty="No tienes fondos retenidos: todo lo que has cobrado ya está disponible para retirar."
          searchPlaceholder="Buscar por referencia…"
          defaultSort={{ id: 'releaseDate', dir: 'asc' }}
          exportFilename="retenciones_consi"
        />
      </Card>

      <Card className="p-[var(--space-md)]">
        <h2 className="text-[length:var(--text-md)]">Por qué retenemos</h2>
        <div className="mt-2 grid gap-[var(--space-sm)] text-[length:var(--text-sm)] text-[var(--color-ink-3)] sm:grid-cols-2">
          <p>
            <strong className="font-medium text-[var(--color-ink)]">Retención.</strong> Entre que
            tu cliente paga y que ese dinero es irreversiblemente nuestro pasa un tiempo: el banco
            tiene que confirmarlo y el pago todavía puede revertirse. Durante esa ventana el dinero
            es tuyo, pero no sale.
          </p>
          <p>
            <strong className="font-medium text-[var(--color-ink)]">Reserva.</strong> Si tu cuenta
            tiene reserva configurada, un porcentaje de cada cobro queda apartado más tiempo para
            cubrir contracargos posteriores. Se libera igual, solo que en su propia fecha.
          </p>
        </div>
        <p className="mt-[var(--space-sm)] border-t border-[var(--color-rule)] pt-[var(--space-sm)] text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
          Liberar no es retirar. Cuando un monto se libera aparece como disponible en{' '}
          <strong className="font-medium text-[var(--color-ink-3)]">Retiros</strong>, y desde ahí lo
          mandas a tu banco.
        </p>
      </Card>
    </div>
  );
}
