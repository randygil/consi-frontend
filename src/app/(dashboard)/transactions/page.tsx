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
  const [filters, setFilters] = useState({ status: '', currency: '', from: '', to: '' });

  const load = useCallback(() => {
    const params: Record<string, string> = { type: 'PAYIN' };
    if (filters.status) params.status = filters.status;
    if (filters.currency) params.currency = filters.currency;
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
          <div className="grid gap-4 md:grid-cols-4">
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
                <TableHead>Gateway</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Comisión</TableHead>
                <TableHead>Neto</TableHead>
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
                  <TableCell className="text-[var(--muted-foreground)]">{t.provider ?? '—'}</TableCell>
                  <TableCell>{formatMoney(t.amount, t.currency)}</TableCell>
                  <TableCell className="text-[var(--muted-foreground)]">
                    {t.feeAmount ? formatMoney(t.feeAmount, t.currency) : '—'}
                  </TableCell>
                  <TableCell>{t.netAmount ? formatMoney(t.netAmount, t.currency) : '—'}</TableCell>
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
                      {t.status === 'COMPLETED' ? (
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
