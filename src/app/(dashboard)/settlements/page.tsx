'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Notice, PageHead } from '@/components/ui/page-head';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api-client';
import { formatDate, formatMoney } from '@/lib/format';
import type { Transaction } from '@/lib/types';

export default function SettlementsPage() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ released: number; evaluated: number } | null>(null);

  const [autoSettle, setAutoSettle] = useState(false);
  const [payoutMode, setPayoutMode] = useState<'INSTANT' | 'MANUAL'>('INSTANT');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(
    null,
  );

  const load = useCallback(() => {
    api
      .getSettlementsPending()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'));
  }, []);

  const loadSettings = useCallback(() => {
    api
      .getProfile()
      .then((p) => {
        setAutoSettle(p.autoSettle);
        setPayoutMode(p.payoutMode);
      })
      .catch((e) => console.error('Failed to load merchant settings', e));
  }, []);

  useEffect(() => {
    load();
    loadSettings();
  }, [load, loadSettings]);

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

  async function onSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsMessage(null);
    try {
      await api.updateSettings({ autoSettle, payoutMode });
      setSettingsMessage({ kind: 'ok', text: 'Configuración guardada.' });
      setTimeout(() => setSettingsMessage(null), 3000);
    } catch (err) {
      setSettingsMessage({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Error al guardar la configuración',
      });
    } finally {
      setSettingsSaving(false);
    }
  }

  const heldTotal = rows.length;

  return (
    <div className="flex flex-col gap-[var(--space-md)]">
      <PageHead
        title="Liquidaciones"
        lede="Fondos retenidos por el período de retención y cómo se dispersan al liberarse."
        action={
          <Button onClick={onRun} disabled={running}>
            {running ? 'Procesando…' : 'Liberar fondos vencidos'}
          </Button>
        }
      />

      {error ? <Notice kind="err">{error}</Notice> : null}
      {result ? (
        <Notice kind="ok">
          Liberados {result.released} de {result.evaluated} evaluados.
        </Notice>
      ) : null}

      <div className="grid gap-[var(--space-md)] lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="p-[var(--space-md)]">
          <div className="mb-[var(--space-sm)] flex items-baseline justify-between gap-[var(--space-sm)]">
            <h2 className="text-[length:var(--text-md)]">Pendientes de liberación</h2>
            <span className="label">
              {heldTotal} {heldTotal === 1 ? 'retención' : 'retenciones'}
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referencia</TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead className="text-right">Neto</TableHead>
                <TableHead className="text-right">Se libera</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-[var(--space-lg)] text-center text-[var(--color-ink-3)]">
                    No hay fondos retenidos.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="num text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                      {t.reference.slice(0, 14)}
                    </TableCell>
                    <TableCell className="num text-[var(--color-ink-3)]">{t.currency}</TableCell>
                    <TableCell className="num text-right text-[var(--color-ink)]">
                      {t.netAmount
                        ? formatMoney(t.netAmount, t.currency)
                        : formatMoney(t.amount, t.currency)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
                      {t.afterRetentionDate ? formatDate(t.afterRetentionDate) : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuración</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSaveSettings} className="flex flex-col gap-[var(--space-sm)]">
              {/* Native checkbox, accent-tinted via accent-color — no re-drawn control. */}
              <label
                htmlFor="autoSettle"
                className="flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-sm)] border border-[var(--color-rule)] p-2.5 transition-colors duration-[var(--dur-fast)] hover:border-[var(--color-rule-2)]"
              >
                <input
                  type="checkbox"
                  id="autoSettle"
                  checked={autoSettle}
                  onChange={(e) => setAutoSettle(e.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent)]"
                />
                <span>
                  <span className="block text-[length:var(--text-sm)] font-medium text-[var(--color-ink)]">
                    Dispersión automática
                  </span>
                  <span className="mt-0.5 block text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                    Transfiere el saldo disponible a tu cuenta principal cada vez que se liberen
                    fondos.
                  </span>
                </span>
              </label>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="payoutMode">Modo de retiro por defecto</Label>
                <Select
                  id="payoutMode"
                  value={payoutMode}
                  onChange={(e) => setPayoutMode(e.target.value as 'INSTANT' | 'MANUAL')}
                >
                  <option value="INSTANT">Instantáneo</option>
                  <option value="MANUAL">Manual — requiere aprobación</option>
                </Select>
                <p className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                  Define si los retiros se envían al banco de inmediato o quedan en cola de
                  aprobación.
                </p>
              </div>

              {settingsMessage ? (
                <Notice kind={settingsMessage.kind}>{settingsMessage.text}</Notice>
              ) : null}

              <Button type="submit" disabled={settingsSaving} className="w-full">
                {settingsSaving ? 'Guardando…' : 'Guardar configuración'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
