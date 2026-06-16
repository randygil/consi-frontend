'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api-client';
import { formatDate, formatMoney } from '@/lib/format';
import type { Transaction } from '@/lib/types';

export default function SettlementsPage() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ released: number; evaluated: number } | null>(null);

  const load = useCallback(() => {
    api
      .getSettlementsPending()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function onRun() {
    setRunning(true);
    setError(null);
    try {
      const res = await api.runSettlement();
      setResult(res);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Liquidaciones (Settlements)</h1>
        <Button onClick={onRun} disabled={running}>
          {running ? 'Procesando…' : 'Liberar fondos vencidos'}
        </Button>
      </div>

      {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}
      {result ? (
        <p className="text-sm text-green-600">
          Liberados: {result.released} · Evaluados: {result.evaluated}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-[var(--foreground)]">
            Fondos retenidos pendientes de liberación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referencia</TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead>Neto</TableHead>
                <TableHead>Liberación tras</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell className="text-[var(--muted-foreground)]">Sin fondos pendientes</TableCell>
                </TableRow>
              ) : (
                rows.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.reference.slice(0, 14)}</TableCell>
                    <TableCell>{t.currency}</TableCell>
                    <TableCell>
                      {t.netAmount ? formatMoney(t.netAmount, t.currency) : formatMoney(t.amount, t.currency)}
                    </TableCell>
                    <TableCell className="text-[var(--muted-foreground)]">
                      {t.afterRetentionDate ? formatDate(t.afterRetentionDate) : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
