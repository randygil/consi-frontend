'use client';

import { useCallback, useEffect, useState } from 'react';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Notice, PageHead } from '@/components/ui/page-head';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api-client';
import { formatDate, formatMoney, typeLabel } from '@/lib/format';
import type { Transaction } from '@/lib/types';

const EMPTY = { status: '', currency: '', type: '', from: '', to: '' };

export default function TransactionsPage() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(EMPTY);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    const params: Record<string, string> = {};
    if (filters.status) params.status = filters.status;
    if (filters.currency) params.currency = filters.currency;
    if (filters.type) params.type = filters.type;
    if (filters.from) params.from = new Date(filters.from).toISOString();
    if (filters.to) params.to = new Date(filters.to).toISOString();
    api
      .getTransactions(params)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const set =
    (k: keyof typeof filters) =>
    (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
      setFilters((f) => ({ ...f, [k]: e.target.value }));

  const active = Object.values(filters).some(Boolean);

  const runAction = useCallback(
    async (id: string, action: (id: string) => Promise<Transaction>, confirmMsg?: string) => {
      if (confirmMsg && !window.confirm(confirmMsg)) return;
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

  return (
    <div className="flex flex-col gap-[var(--space-md)]">
      <PageHead
        title="Transacciones"
        lede="Todos los movimientos del comercio, entrantes y salientes."
        action={
          <span className="label">
            {rows.length} {rows.length === 1 ? 'resultado' : 'resultados'}
          </span>
        }
      />

      {/* Filters read as an instrument row, not a titled card. */}
      <Card className="p-[var(--space-sm)]">
        <div className="grid gap-[var(--space-xs)] sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Estado">
            <Select value={filters.status} onChange={set('status')}>
              <option value="">Todos</option>
              <option value="PENDING">Pendiente</option>
              <option value="COMPLETED">Completado</option>
              <option value="FAILED">Fallido</option>
              <option value="REFUNDED">Reembolsado</option>
            </Select>
          </Field>
          <Field label="Moneda">
            <Select value={filters.currency} onChange={set('currency')}>
              <option value="">Todas</option>
              <option value="USD">USD</option>
              <option value="VES">VES</option>
            </Select>
          </Field>
          <Field label="Tipo">
            <Select value={filters.type} onChange={set('type')}>
              <option value="">Todos</option>
              <option value="PAYIN">Pago entrante</option>
              <option value="PAYOUT">Retiro</option>
            </Select>
          </Field>
          <Field label="Desde">
            <Input type="date" value={filters.from} onChange={set('from')} />
          </Field>
          <Field label="Hasta">
            <Input type="date" value={filters.to} onChange={set('to')} />
          </Field>
        </div>
        {active ? (
          <button
            type="button"
            onClick={() => setFilters(EMPTY)}
            className="mt-[var(--space-xs)] text-[length:var(--text-sm)] text-[var(--color-accent)] underline-offset-4 hover:underline"
          >
            Limpiar filtros
          </button>
        ) : null}
      </Card>

      {error ? <Notice kind="err">{error}</Notice> : null}

      <Card className="p-[var(--space-md)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Referencia</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Pasarela</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Comisión</TableHead>
              <TableHead className="text-right">Neto</TableHead>
              <TableHead className="text-right">USD equiv.</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Fecha</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-[var(--space-lg)] text-center text-[var(--color-ink-3)]">
                  Sin resultados para estos filtros.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="num text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                    {t.reference.slice(0, 14)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-[var(--color-ink)]">
                    {typeLabel(t.type)}
                  </TableCell>
                  <TableCell className="text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
                    {t.provider ?? '—'}
                  </TableCell>
                  <TableCell className="num text-right text-[var(--color-ink)]">
                    {formatMoney(t.amount, t.currency)}
                  </TableCell>
                  <TableCell className="num text-right text-[var(--color-ink-4)]">
                    {t.feeAmount ? formatMoney(t.feeAmount, t.currency) : '—'}
                  </TableCell>
                  <TableCell className="num text-right">
                    {t.netAmount ? formatMoney(t.netAmount, t.currency) : '—'}
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
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      {t.status === 'PENDING' ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === t.id}
                            onClick={() => runAction(t.id, api.confirmTransaction)}
                          >
                            Confirmar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={busyId === t.id}
                            onClick={() =>
                              runAction(t.id, api.rejectTransaction, '¿Rechazar esta transacción?')
                            }
                          >
                            Rechazar
                          </Button>
                        </>
                      ) : null}
                      {t.status === 'COMPLETED' && t.type === 'PAYIN' ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === t.id}
                            onClick={() =>
                              runAction(t.id, api.refundTransaction, '¿Reembolsar esta transacción?')
                            }
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
