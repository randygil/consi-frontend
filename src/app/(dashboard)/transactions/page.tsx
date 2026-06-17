'use client';

import { useCallback, useEffect, useState } from 'react';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api-client';
import { formatDate, formatMoney } from '@/lib/format';
import type { Transaction } from '@/lib/types';

export default function TransactionsPage() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ status: '', currency: '', type: '', from: '', to: '' });

  const [refundingTx, setRefundingTx] = useState<Transaction | null>(null);
  const [customRefundAmount, setCustomRefundAmount] = useState<string>('');
  const [isPartial, setIsPartial] = useState<boolean>(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundSubmitting, setRefundSubmitting] = useState<boolean>(false);

  const load = useCallback(() => {
    const params: Record<string, string> = {};
    if (filters.status) params.status = filters.status;
    if (filters.currency) params.currency = filters.currency;
    if (filters.type) params.type = filters.type;
    if (filters.from) params.from = new Date(filters.from).toISOString();
    if (filters.to) params.to = new Date(filters.to).toISOString();
    api.getTransactions(params).then(setRows).catch((e) =>
      setError(e instanceof Error ? e.message : 'Error'),
    );
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const set = (k: keyof typeof filters) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
    setFilters((f) => ({ ...f, [k]: e.target.value }));

  const [busyId, setBusyId] = useState<string | null>(null);

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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Transacciones</h1>

      <Card>
        <CardHeader><CardTitle className="text-base font-semibold text-[var(--foreground)]">Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={filters.status} onChange={set('status')}>
                <option value="">Todos</option>
                <option value="PENDING">Pendiente</option>
                <option value="COMPLETED">Completado</option>
                <option value="FAILED">Fallido</option>
                <option value="REFUNDED">Reembolsado</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Select value={filters.currency} onChange={set('currency')}>
                <option value="">Todas</option>
                <option value="USD">USD</option>
                <option value="VES">VES</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={filters.type} onChange={set('type')}>
                <option value="">Todos</option>
                <option value="PAYIN">Payin</option>
                <option value="PAYOUT">Payout</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Desde</Label>
              <Input type="date" value={filters.from} onChange={set('from')} />
            </div>
            <div className="space-y-1.5">
              <Label>Hasta</Label>
              <Input type="date" value={filters.to} onChange={set('to')} />
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referencia</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Gateway</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Comisión</TableHead>
                <TableHead>Neto</TableHead>
                <TableHead>Reembolsado</TableHead>
                <TableHead>USD equiv.</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell className="text-[var(--muted-foreground)]">Sin resultados</TableCell></TableRow>
              ) : rows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.reference.slice(0, 14)}</TableCell>
                  <TableCell className="font-medium">{t.type}</TableCell>
                  <TableCell className="text-[var(--muted-foreground)]">{t.provider ?? '—'}</TableCell>
                  <TableCell>{formatMoney(t.amount, t.currency)}</TableCell>
                  <TableCell className="text-[var(--muted-foreground)]">
                    {t.feeAmount ? formatMoney(t.feeAmount, t.currency) : '—'}
                  </TableCell>
                  <TableCell>{t.netAmount ? formatMoney(t.netAmount, t.currency) : '—'}</TableCell>
                  <TableCell className="text-[var(--destructive)]">
                    {t.refundedAmount && Number(t.refundedAmount) > 0 ? formatMoney(t.refundedAmount, t.currency) : '—'}
                  </TableCell>
                  <TableCell>{t.usdEquivalent ? formatMoney(t.usdEquivalent, 'USD') : '—'}</TableCell>
                  <TableCell><StatusBadge status={t.status} /></TableCell>
                  <TableCell className="text-[var(--muted-foreground)]">{formatDate(t.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
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
                            onClick={() => {
                              setRefundingTx(t);
                              setCustomRefundAmount('');
                              setIsPartial(false);
                              setRefundError(null);
                            }}
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Reembolsos */}
      {refundingTx && (() => {
        const net = Number(refundingTx.netAmount ?? refundingTx.amount);
        const refunded = Number(refundingTx.refundedAmount ?? 0);
        const remaining = net - refunded;

        const handleRefundSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          setRefundError(null);
          setRefundSubmitting(true);
          try {
            const amountToSend = isPartial ? customRefundAmount : undefined;
            if (isPartial) {
              const numAmount = Number(customRefundAmount);
              if (isNaN(numAmount) || numAmount <= 0) {
                throw new Error('Monto inválido');
              }
              if (numAmount > remaining) {
                throw new Error('El monto supera el disponible restante para reembolsar');
              }
            }
            await api.refundTransaction(refundingTx.id, amountToSend);
            setRefundingTx(null);
            load();
          } catch (err) {
            setRefundError(err instanceof Error ? err.message : 'Error al procesar el reembolso');
          } finally {
            setRefundSubmitting(false);
          }
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <Card className="w-full max-w-md p-6 bg-white border border-[var(--border)] shadow-[var(--shadow-lg)]">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="text-lg font-bold text-[var(--text-strong)]">Reembolsar Transacción</CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                <p className="text-xs text-[var(--text-muted)] font-mono mb-2">
                  Ref: {refundingTx.reference}
                </p>

                <div className="grid grid-cols-3 gap-2 bg-[var(--ink-50)] p-3 rounded-md text-xs font-semibold text-center">
                  <div>
                    <div className="text-[var(--text-subtle)] text-[10px] uppercase">Neto Original</div>
                    <div className="text-[var(--text-strong)] mt-0.5">{formatMoney(net.toString(), refundingTx.currency)}</div>
                  </div>
                  <div>
                    <div className="text-[var(--text-subtle)] text-[10px] uppercase">Reembolsado</div>
                    <div className="text-[var(--text-strong)] mt-0.5">{formatMoney(refunded.toString(), refundingTx.currency)}</div>
                  </div>
                  <div>
                    <div className="text-[var(--text-subtle)] text-[10px] uppercase">Restante</div>
                    <div className="text-[var(--text-strong)] mt-0.5">{formatMoney(remaining.toString(), refundingTx.currency)}</div>
                  </div>
                </div>

                <form onSubmit={handleRefundSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Tipo de Reembolso</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm text-[var(--text-body)] cursor-pointer">
                        <input
                          type="radio"
                          name="refundType"
                          checked={!isPartial}
                          onChange={() => setIsPartial(false)}
                          className="accent-[var(--primary)]"
                        />
                        <span>Total ({formatMoney(remaining.toString(), refundingTx.currency)})</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm text-[var(--text-body)] cursor-pointer">
                        <input
                          type="radio"
                          name="refundType"
                          checked={isPartial}
                          onChange={() => setIsPartial(true)}
                          className="accent-[var(--primary)]"
                        />
                        <span>Parcial</span>
                      </label>
                    </div>
                  </div>

                  {isPartial && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Monto a Reembolsar ({refundingTx.currency})</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={customRefundAmount}
                        onChange={(e) => setCustomRefundAmount(e.target.value)}
                        required
                        className="w-full"
                      />
                    </div>
                  )}

                  {refundError && (
                    <p className="text-xs text-[var(--destructive)] font-medium bg-[var(--danger-100)] p-2 rounded-md">
                      {refundError}
                    </p>
                  )}

                  <div className="flex justify-end gap-3.5 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={refundSubmitting}
                      onClick={() => setRefundingTx(null)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={refundSubmitting}>
                      {refundSubmitting ? 'Procesando…' : 'Reembolsar'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        );
      })()}
    </div>
  );
}
