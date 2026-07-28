'use client';

/* Hallmark · genre: modern-minimal · theme: Cobalt (light + dark) · design-system: design.md
 * The terminal's books. Settled and pending are two separate readouts, never one figure —
 * pending money is not earned, and a single number would say it was.
 */

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Column, DataTable } from '@/components/ui/data-table';
import { Notice, PageHead } from '@/components/ui/page-head';
import { api } from '@/lib/api-client';
import { formatDate, formatMoney } from '@/lib/format';
import { METHOD_CATEGORIES } from '@/lib/payment-methods';
import type { PaymentMethod, TerminalDetail, Transaction } from '@/lib/types';
import { CHANNEL_ICON, CHANNEL_LABEL, TotalsList } from '../page';

const METHOD_LABEL: Partial<Record<PaymentMethod, string>> = Object.fromEntries(
  METHOD_CATEGORIES.flatMap((c) => c.methods).map((m) => [m.key, m.label]),
);

const TX_COLUMNS: Column<Transaction>[] = [
  {
    id: 'reference',
    header: 'Referencia',
    num: true,
    align: 'left',
    value: (t) => t.reference,
  },
  {
    id: 'type',
    header: 'Tipo',
    value: (t) => t.type,
    text: (t) => (t.type === 'PAYIN' ? 'Cobro' : 'Retiro'),
  },
  {
    id: 'method',
    header: 'Vía',
    value: (t) => t.method ?? '',
    text: (t) => (t.method ? METHOD_LABEL[t.method] ?? t.method : '—'),
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
    id: 'netAmount',
    header: 'Neto',
    num: true,
    value: (t) => Number(t.netAmount ?? 0),
    text: (t) => (t.netAmount ? formatMoney(t.netAmount, t.currency) : '—'),
  },
  {
    id: 'status',
    header: 'Estado',
    value: (t) => t.status,
    cell: (t) => <StatusBadge status={t.status} />,
  },
  {
    id: 'createdAt',
    header: 'Fecha',
    num: true,
    value: (t) => t.createdAt,
    text: (t) => formatDate(t.createdAt),
  },
];

export default function TerminalDetailPage() {
  const id = String(useParams().id);
  const [terminal, setTerminal] = useState<TerminalDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getTerminal(id)
      .then(setTerminal)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'));
  }, [id]);

  if (error) {
    return (
      <div className="flex flex-col gap-[var(--space-md)]">
        <BackLink />
        <Notice kind="err">{error}</Notice>
      </div>
    );
  }
  if (!terminal) {
    return (
      <div className="flex flex-col gap-[var(--space-md)]">
        <BackLink />
        <p className="label">Cargando terminal…</p>
      </div>
    );
  }

  const Icon = CHANNEL_ICON[terminal.channel];

  return (
    <div className="flex flex-col gap-[var(--space-md)]">
      <BackLink />

      <PageHead
        title={terminal.name}
        lede={[
          terminal.fullCode,
          CHANNEL_LABEL[terminal.channel],
          terminal.defaultCurrency ? `cotiza en ${terminal.defaultCurrency}` : null,
          terminal.active ? null : 'inactiva',
        ]
          .filter(Boolean)
          .join(' · ')}
        action={
          <span aria-hidden className="text-[var(--color-ink-4)]">
            <Icon size={22} />
          </span>
        }
      />

      {/* Two books side by side. Settled is money earned; pending is money promised. */}
      <div className="grid gap-[var(--space-sm)] md:grid-cols-2">
        <Card className="p-[var(--space-md)]">
          <p className="label">Liquidado</p>
          <p className="mt-0.5 text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
            Cobros completados. Esto es lo que este canal realmente ingresó.
          </p>
          <TotalsList totals={terminal.settled} />
        </Card>

        <Card className="p-[var(--space-md)]">
          <p className="label">Pendiente</p>
          <p className="mt-0.5 text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
            Cobros abiertos o autorizados. No se suma a lo liquidado.
          </p>
          <TotalsList totals={terminal.pending} />
        </Card>
      </div>

      <Card className="p-[var(--space-md)]">
        <p className="label">Configuración</p>
        <dl className="mt-[var(--space-2xs)] border-t border-[var(--color-rule)]">
          <ConfigRow
            label="Métodos aceptados"
            value={
              terminal.methods.length === 0
                ? 'Ninguno configurado'
                : terminal.methods.map((m) => METHOD_LABEL[m] ?? m).join(' · ')
            }
          />
          <ConfigRow label="Redirección al pagar" value={terminal.successUrl ?? '—'} />
          <ConfigRow label="Sesiones abiertas" value={String(terminal._count.checkoutSessions)} num />
          <ConfigRow label="Cobros registrados" value={String(terminal._count.transactions)} num />
        </dl>
      </Card>

      <Card className="p-[var(--space-md)]">
        <DataTable
          id={`terminal-${terminal.id}-tx`}
          caption={`Cobros de ${terminal.name}`}
          columns={TX_COLUMNS}
          rows={terminal.transactions}
          rowKey={(t) => t.id}
          empty="Esta terminal aún no tiene cobros."
          searchPlaceholder="Buscar por referencia…"
          defaultSort={{ id: 'createdAt', dir: 'desc' }}
          exportFilename={`terminal_${terminal.fullCode}_cobros`}
        />
      </Card>

      <p className="text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
        Mostrando los 50 cobros más recientes.{' '}
        <Link
          href={`/transactions?terminalId=${terminal.id}`}
          className="text-[var(--color-accent)] underline-offset-4 hover:underline"
        >
          Ver todos en Cobros
        </Link>
      </p>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/terminals"
      className="inline-flex w-fit items-center gap-1.5 text-[length:var(--text-sm)] text-[var(--color-ink-3)] underline-offset-4 transition-colors duration-[var(--dur-fast)] hover:text-[var(--color-accent)] hover:underline"
    >
      <ArrowLeft size={14} aria-hidden />
      Terminales
    </Link>
  );
}

function ConfigRow({ label, value, num }: { label: string; value: string; num?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-[var(--space-sm)] border-b border-[var(--color-rule)] py-[var(--space-2xs)]">
      <dt className="label shrink-0">{label}</dt>
      <dd
        className={`min-w-0 text-right text-[length:var(--text-sm)] text-[var(--color-ink-2)] ${num ? 'num' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}
