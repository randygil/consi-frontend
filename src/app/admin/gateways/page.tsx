'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api-client';
import type {
  AdminGateway,
  ConsiAccount,
  Currency,
  DestinationField,
  Environment,
  PayoutMode,
} from '@/lib/types';

const EMPTY = {
  key: '',
  displayName: '',
  providerKey: 'MOCK_BANGENTE',
  currency: 'VES' as Currency,
  environment: 'TEST' as Environment,
  payoutMode: 'INSTANT' as PayoutMode,
  consiAccountId: '',
  percentageRate: '0',
  fixedFee: '0',
  minFee: '0',
  maxFee: '0',
  taxRate: '0',
  // JSON text of the gateway's customer-destination contract (validated on submit).
  destinationSchemaText: '[]',
};

export default function AdminGatewaysPage() {
  const [gateways, setGateways] = useState<AdminGateway[]>([]);
  const [accounts, setAccounts] = useState<ConsiAccount[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const load = () =>
    Promise.all([api.adminGetGateways(), api.opsGetAccounts()]).then(([g, a]) => {
      setGateways(g);
      setAccounts(a);
      if (!editingId && !form.consiAccountId && a[0]) set('consiAccountId', a[0].id);
    });

  useEffect(() => {
    load().catch((e) => setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startEdit(g: AdminGateway) {
    setEditingId(g.id);
    setForm({
      key: g.key,
      displayName: g.displayName,
      providerKey: g.providerKey,
      currency: g.currency,
      environment: g.environment,
      payoutMode: g.payoutMode,
      consiAccountId: g.consiAccountId,
      percentageRate: g.percentageRate,
      fixedFee: g.fixedFee,
      minFee: g.minFee,
      maxFee: g.maxFee,
      taxRate: g.taxRate,
      destinationSchemaText: JSON.stringify(g.destinationSchema ?? [], null, 2),
    });
    setMsg(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...EMPTY, consiAccountId: accounts[0]?.id ?? '' });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      let destinationSchema: DestinationField[];
      try {
        destinationSchema = JSON.parse(form.destinationSchemaText || '[]');
      } catch {
        throw new Error('Campos de destino: JSON inválido');
      }
      const { destinationSchemaText, ...rest } = form;
      const payload = { ...rest, destinationSchema };
      if (editingId) {
        // key/currency/environment are immutable after creation (unique constraint).
        const { key, currency, environment, ...patch } = payload;
        await api.adminUpdateGateway(editingId, patch);
      } else {
        await api.adminCreateGateway(payload);
      }
      await load();
      resetForm();
      setMsg({ kind: 'ok', text: 'Pasarela guardada.' });
    } catch (err) {
      setMsg({ kind: 'err', text: err instanceof Error ? err.message : 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(g: AdminGateway) {
    await api.adminUpdateGateway(g.id, { enabled: !g.enabled });
    await load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-[var(--text-strong)]">Pasarelas (Gateways)</h1>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Editar pasarela' : 'Nueva pasarela'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Clave interna (key)">
                <Input value={form.key} onChange={(e) => set('key', e.target.value)} disabled={!!editingId} required />
              </Field>
              <Field label="Nombre visible (admin)">
                <Input value={form.displayName} onChange={(e) => set('displayName', e.target.value)} required />
              </Field>
              <Field label="Provider (adaptador)">
                <Input value={form.providerKey} onChange={(e) => set('providerKey', e.target.value)} required />
              </Field>
              <Field label="Moneda">
                <Select value={form.currency} onChange={(e) => set('currency', e.target.value as Currency)} disabled={!!editingId}>
                  <option value="VES">VES</option>
                  <option value="USD">USD</option>
                </Select>
              </Field>
              <Field label="Entorno">
                <Select value={form.environment} onChange={(e) => set('environment', e.target.value as Environment)} disabled={!!editingId}>
                  <option value="TEST">Prueba</option>
                  <option value="LIVE">Real</option>
                </Select>
              </Field>
              <Field label="Modo de retiro">
                <Select value={form.payoutMode} onChange={(e) => set('payoutMode', e.target.value as PayoutMode)}>
                  <option value="INSTANT">Instantáneo</option>
                  <option value="MANUAL">Manual (aprobación)</option>
                </Select>
              </Field>
              <Field label="Cuenta Consi (rail)">
                <Select value={form.consiAccountId} onChange={(e) => set('consiAccountId', e.target.value)} required>
                  <option value="">—</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} · {a.currency}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Comisión %  (0.01 = 1%)">
                <Input value={form.percentageRate} onChange={(e) => set('percentageRate', e.target.value)} />
              </Field>
              <Field label="IVA  (0.16 = 16%)">
                <Input value={form.taxRate} onChange={(e) => set('taxRate', e.target.value)} />
              </Field>
              <Field label="Comisión fija">
                <Input value={form.fixedFee} onChange={(e) => set('fixedFee', e.target.value)} />
              </Field>
              <Field label="Comisión mínima">
                <Input value={form.minFee} onChange={(e) => set('minFee', e.target.value)} />
              </Field>
              <Field label="Comisión máxima (0 = sin tope)">
                <Input value={form.maxFee} onChange={(e) => set('maxFee', e.target.value)} />
              </Field>
            </div>
            <Field label="Campos de destino del cliente (JSON) — contrato propio de esta pasarela">
              <textarea
                value={form.destinationSchemaText}
                onChange={(e) => set('destinationSchemaText', e.target.value)}
                rows={5}
                spellCheck={false}
                className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 font-mono text-xs"
                placeholder='[{"key":"document","label":"Cédula/RIF","required":true},{"key":"phone","label":"Teléfono","required":true}]'
              />
              <p className="text-xs text-[var(--text-muted)]">
                El retiro del cliente valida su objeto <code>destination</code> contra estos campos
                (los <code>required</code> deben venir). Vacío = sólo liquidación a cuenta bancaria.
              </p>
            </Field>
            {msg ? (
              <p className={msg.kind === 'ok' ? 'text-sm text-green-600' : 'text-sm text-[var(--destructive)]'}>
                {msg.text}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear pasarela'}
              </Button>
              {editingId ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pasarelas configuradas</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pasarela</TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead>Entorno</TableHead>
                <TableHead>Modo</TableHead>
                <TableHead>Comisión</TableHead>
                <TableHead>Cuenta Consi</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gateways.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-6 text-center text-[var(--text-muted)]">
                    Sin pasarelas.
                  </TableCell>
                </TableRow>
              ) : (
                gateways.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">
                      {g.displayName}
                      <span className="ml-1 font-mono text-xs text-[var(--text-muted)]">{g.key}</span>
                    </TableCell>
                    <TableCell>{g.currency}</TableCell>
                    <TableCell>{g.environment === 'LIVE' ? 'Real' : 'Prueba'}</TableCell>
                    <TableCell>
                      <Badge>{g.payoutMode === 'INSTANT' ? 'Instantánea' : 'Manual'}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-muted)]">
                      {(Number(g.percentageRate) * 100).toFixed(2)}% · IVA {(Number(g.taxRate) * 100).toFixed(0)}%
                    </TableCell>
                    <TableCell className="text-xs">{g.consiAccount?.label ?? g.consiAccountId}</TableCell>
                    <TableCell>
                      {g.enabled ? (
                        <span className="text-xs font-medium text-green-600">Activa</span>
                      ) : (
                        <span className="text-xs font-medium text-[var(--text-muted)]">Inactiva</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEdit(g)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => toggleEnabled(g)}>
                          {g.enabled ? 'Desactivar' : 'Activar'}
                        </Button>
                      </div>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
