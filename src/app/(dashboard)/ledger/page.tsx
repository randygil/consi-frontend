'use client';

/* Hallmark · genre: modern-minimal · macrostructure: 05 Workbench
 * design-system: design.md · theme: Cobalt (light + dark)
 *
 * Libro mayor del comercio: los asientos inmutables de doble entrada sobre su
 * cuenta de fondos. Cada crédito/débito es un hecho contable — el saldo del
 * panel es solo la suma materializada de esto.
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Column, DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Notice, PageHead } from '@/components/ui/page-head';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api-client';
import { formatDate, formatMoney } from '@/lib/format';
import type { Currency, LedgerEntry } from '@/lib/types';

const EVENT_LABELS: Record<string, string> = {
  'payin.settled': 'Cobro liquidado',
  'payout.completed': 'Retiro completado',
  'payin.refunded': 'Reembolso',
  'payin.chargeback': 'Contracargo',
  'fx.converted': 'Conversión de saldo',
};

const eventLabel = (e: string) => EVENT_LABELS[e] ?? e;

const COLUMNS: Column<LedgerEntry>[] = [
  {
    id: 'createdAt',
    header: 'Fecha',
    num: true,
    value: (l) => l.createdAt,
    text: (l) => formatDate(l.createdAt),
    cell: (l) => (
      <span className="whitespace-nowrap text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
        {formatDate(l.createdAt)}
      </span>
    ),
  },
  {
    id: 'event',
    header: 'Evento',
    value: (l) => l.event,
    text: (l) => eventLabel(l.event),
    cell: (l) => <span className="text-[var(--color-ink)]">{eventLabel(l.event)}</span>,
  },
  {
    id: 'direction',
    header: 'Tipo',
    value: (l) => l.direction,
    text: (l) => (l.direction === 'CREDIT' ? 'Abono' : 'Cargo'),
    cell: (l) => (
      <span
        className={`rounded-[var(--radius-xs)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] font-medium uppercase tracking-[var(--tracking-mono-label)] ${
          l.direction === 'CREDIT'
            ? 'bg-[var(--color-ok-soft)] text-[var(--color-ok)]'
            : 'bg-[var(--color-bad-soft)] text-[var(--color-bad)]'
        }`}
      >
        {l.direction === 'CREDIT' ? 'Abono' : 'Cargo'}
      </span>
    ),
  },
  { id: 'currency', header: 'Moneda', num: true, align: 'left', value: (l) => l.currency },
  {
    id: 'amount',
    header: 'Monto',
    num: true,
    value: (l) => Number(l.amount) * (l.direction === 'CREDIT' ? 1 : -1),
    text: (l) =>
      `${l.direction === 'CREDIT' ? '+' : '−'}${formatMoney(l.amount, l.currency)}`,
    cell: (l) => (
      <span
        className={`num ${l.direction === 'CREDIT' ? 'text-[var(--color-ok)]' : 'text-[var(--color-ink)]'}`}
      >
        {l.direction === 'CREDIT' ? '+' : '−'}
        {formatMoney(l.amount, l.currency)}
      </span>
    ),
  },
  {
    id: 'memo',
    header: 'Detalle',
    value: (l) => l.memo ?? '',
    cell: (l) => (
      <span className="block max-w-[28ch] truncate text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
        {l.memo ?? '—'}
      </span>
    ),
  },
];

export default function LedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [currency, setCurrency] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getLedger({ currency: currency || undefined, take: 200 })
      .then(setEntries)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }, [currency]);

  return (
    <div className="flex flex-col gap-[var(--space-md)]">
      <PageHead
        title="Movimientos"
        lede="El libro mayor de tu cuenta: cada abono y cargo como asiento contable inmutable, por moneda. Tus saldos son la suma de esto."
      />

      {error ? <Notice kind="err">{error}</Notice> : null}

      <Card className="p-[var(--space-md)]">
        <DataTable
          id="ledger"
          caption="Libro mayor"
          columns={COLUMNS}
          rows={entries}
          rowKey={(l) => l.id}
          loading={loading}
          empty="Sin movimientos registrados."
          searchPlaceholder="Buscar por evento o detalle…"
          defaultSort={{ id: 'createdAt', dir: 'desc' }}
          exportFilename="movimientos_consi"
          toolbar={
            <Select
              aria-label="Filtrar por moneda"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="h-9 w-auto"
            >
              <option value="">Todas las monedas</option>
              {(['USD', 'VES', 'USDT'] as Currency[]).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          }
        />
      </Card>

      <ReportDownload />
    </div>
  );
}

/**
 * Reporte de movimientos (CSV): bruto, comisión, IVA y neto por transacción del
 * período. Vive aquí y no en Retenciones: es un reporte contable de TODO lo que se
 * movió (cobros y retiros), no de lo que está retenido.
 */
function ReportDownload() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [currency, setCurrency] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const blob = await api.downloadMovementsReport({
        from: from ? new Date(from).toISOString() : undefined,
        // Include the whole end day.
        to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
        currency: currency || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `movimientos_consi_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar el reporte');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-[var(--space-md)]">
      <h2 className="text-[length:var(--text-md)]">Reporte para contabilidad</h2>
      <p className="mb-[var(--space-sm)] mt-1 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
        CSV con bruto, comisión, IVA y neto de cada cobro y cada retiro del período — por moneda y
        rail, listo para conciliar contra tu estado de cuenta.
      </p>
      <form onSubmit={download} className="flex flex-wrap items-end gap-[var(--space-sm)]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rep-from">Desde</Label>
          <Input
            id="rep-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="num"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rep-to">Hasta</Label>
          <Input
            id="rep-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="num"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rep-currency">Moneda</Label>
          <Select
            id="rep-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="h-9 w-auto"
          >
            <option value="">Todas</option>
            <option value="USD">USD</option>
            <option value="VES">VES</option>
            <option value="USDT">USDT</option>
          </Select>
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? 'Generando…' : 'Descargar CSV'}
        </Button>
      </form>
      {error ? (
        <p className="mt-2 text-[length:var(--text-xs)] text-[var(--color-bad)]">{error}</p>
      ) : null}
    </Card>
  );
}
