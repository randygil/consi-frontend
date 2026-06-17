'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api-client';
import { formatDate, formatMoney } from '@/lib/format';
import type { Transaction, MerchantProfile } from '@/lib/types';

export default function SettlementsPage() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ released: number; evaluated: number } | null>(null);

  // Settings state
  const [autoSettle, setAutoSettle] = useState(false);
  const [payoutMode, setPayoutMode] = useState<'INSTANT' | 'MANUAL'>('INSTANT');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

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
      setSettingsMessage({ kind: 'ok', text: 'Configuración guardada correctamente.' });
      setTimeout(() => setSettingsMessage(null), 3000);
    } catch (err) {
      setSettingsMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Error al guardar la configuración' });
    } finally {
      setSettingsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Liquidaciones y Dispersiones</h1>
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main list of pending releases */}
        <div className="lg:col-span-2 space-y-6">
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
                      <TableCell colSpan={4} className="text-center py-6 text-[var(--muted-foreground)] font-medium">
                        Sin fondos retenidos pendientes de liberación
                      </TableCell>
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

        {/* Settings panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">
                Configuración de Liquidaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSaveSettings} className="space-y-4">
                <div className="flex items-start space-x-2.5 py-1">
                  <input
                    type="checkbox"
                    id="autoSettle"
                    checked={autoSettle}
                    onChange={(e) => setAutoSettle(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--ring)]"
                  />
                  <div className="space-y-1">
                    <label htmlFor="autoSettle" className="text-sm font-semibold text-[var(--foreground)]">
                      Dispersión automática (Sweep)
                    </label>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Transfiere automáticamente el saldo disponible a tu cuenta bancaria principal cada vez que se liberen fondos.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-sm font-medium text-[var(--foreground)]">Modo de retiro por defecto</label>
                  <Select value={payoutMode} onChange={(e) => setPayoutMode(e.target.value as 'INSTANT' | 'MANUAL')}>
                    <option value="INSTANT">Instantáneo (Inmediato)</option>
                    <option value="MANUAL">Manual (Requiere aprobación del administrador)</option>
                  </Select>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Establece si las dispersiones y retiros solicitados se envían inmediatamente al banco o quedan retenidos para aprobación.
                  </p>
                </div>

                {settingsMessage ? (
                  <p className={settingsMessage.kind === 'ok' ? 'text-sm text-green-600' : 'text-sm text-[var(--destructive)]'}>
                    {settingsMessage.text}
                  </p>
                ) : null}

                <Button type="submit" disabled={settingsSaving} className="w-full justify-center">
                  {settingsSaving ? 'Guardando…' : 'Guardar configuración'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
