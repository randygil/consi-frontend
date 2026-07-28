'use client';

/* Hallmark · genre: modern-minimal · macrostructure: 05 Workbench
 * design-system: design.md · theme: Cobalt (light + dark)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Column, DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Notice, PageHead } from '@/components/ui/page-head';
import { Select } from '@/components/ui/select';
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

const pct = (v: string, digits = 2) => `${(Number(v) * 100).toFixed(digits)}%`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default function AdminGatewaysPage() {
  const [gateways, setGateways] = useState<AdminGateway[]>([]);
  const [accounts, setAccounts] = useState<ConsiAccount[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    const [g, a] = await Promise.all([api.adminGetGateways(), api.opsGetAccounts()]);
    setGateways(g);
    setAccounts(a);
    setLoading(false);
    return a;
  }, []);

  useEffect(() => {
    load()
      .then((a) => setForm((f) => (f.consiAccountId ? f : { ...f, consiAccountId: a[0]?.id ?? '' })))
      .catch((e) => {
        setLoading(false);
        setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Error' });
      });
  }, [load]);

  const startEdit = useCallback((g: AdminGateway) => {
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const toggleEnabled = useCallback(
    async (g: AdminGateway) => {
      await api.adminUpdateGateway(g.id, { enabled: !g.enabled });
      await load();
    },
    [load],
  );

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
      const { destinationSchemaText: _text, ...rest } = form;
      const payload = { ...rest, destinationSchema };
      if (editingId) {
        // key/currency/environment are immutable after creation (unique constraint).
        const { key: _k, currency: _c, environment: _e, ...patch } = payload;
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

  const columns = useMemo<Column<AdminGateway>[]>(
    () => [
      {
        id: 'name',
        header: 'Pasarela',
        value: (g) => `${g.displayName} ${g.key}`,
        text: (g) => g.displayName,
        cell: (g) => (
          <span>
            <span className="font-medium text-[var(--color-ink)]">{g.displayName}</span>
            <span className="num ml-1.5 text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
              {g.key}
            </span>
          </span>
        ),
      },
      { id: 'currency', header: 'Moneda', num: true, align: 'left', value: (g) => g.currency },
      {
        id: 'environment',
        header: 'Entorno',
        value: (g) => g.environment,
        text: (g) => (g.environment === 'LIVE' ? 'Real' : 'Prueba'),
        cell: (g) => <Badge>{g.environment === 'LIVE' ? 'Real' : 'Prueba'}</Badge>,
      },
      {
        id: 'payoutMode',
        header: 'Modo',
        value: (g) => g.payoutMode,
        text: (g) => (g.payoutMode === 'INSTANT' ? 'Instantánea' : 'Manual'),
        cell: (g) => <Badge>{g.payoutMode === 'INSTANT' ? 'Instantánea' : 'Manual'}</Badge>,
      },
      {
        id: 'rate',
        header: 'Comisión',
        num: true,
        value: (g) => Number(g.percentageRate),
        text: (g) => pct(g.percentageRate),
        cell: (g) => (
          <span className="whitespace-nowrap text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
            {pct(g.percentageRate)} · IVA {pct(g.taxRate, 0)}
          </span>
        ),
      },
      {
        id: 'account',
        header: 'Cuenta Consi',
        value: (g) => g.consiAccount?.label ?? g.consiAccountId,
        cell: (g) => (
          <span className="text-[length:var(--text-xs)]">
            {g.consiAccount?.label ?? g.consiAccountId}
          </span>
        ),
      },
      {
        id: 'enabled',
        header: 'Estado',
        value: (g) => (g.enabled ? 'Activa' : 'Inactiva'),
        cell: (g) => (
          <span
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-xs)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] font-medium uppercase tracking-[var(--tracking-mono-label)] ${
              g.enabled
                ? 'text-[var(--color-ok)] bg-[var(--color-ok-soft)]'
                : 'text-[var(--color-ink-3)] bg-[var(--color-paper-3)]'
            }`}
          >
            <span className="size-1.5 rounded-full bg-current" aria-hidden />
            {g.enabled ? 'Activa' : 'Inactiva'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Acciones',
        align: 'right',
        pinned: true,
        sortable: false,
        searchable: false,
        exportable: false,
        cell: (g) => (
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="outline" onClick={() => startEdit(g)}>
              Editar
            </Button>
            <Button size="sm" variant="outline" onClick={() => toggleEnabled(g)}>
              {g.enabled ? 'Desactivar' : 'Activar'}
            </Button>
          </div>
        ),
      },
    ],
    [startEdit, toggleEnabled],
  );

  return (
    <div className="flex flex-col gap-[var(--space-md)]">
      <PageHead
        title="Pasarelas"
        lede="Adaptadores de cobro y retiro, su comisión y la cuenta Consi que los respalda."
      />

      <Card className="p-[var(--space-md)]">
        <h2 className="mb-[var(--space-sm)] text-[length:var(--text-md)]">
          {editingId ? 'Editar pasarela' : 'Nueva pasarela'}
        </h2>
        <form onSubmit={submit} className="flex flex-col gap-[var(--space-sm)]">
          <div className="grid gap-[var(--space-sm)] sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Clave interna">
              <Input
                value={form.key}
                onChange={(e) => set('key', e.target.value)}
                disabled={!!editingId}
                required
                className="num"
              />
            </Field>
            <Field label="Nombre visible">
              <Input
                value={form.displayName}
                onChange={(e) => set('displayName', e.target.value)}
                required
              />
            </Field>
            <Field label="Provider (adaptador)">
              <Input
                value={form.providerKey}
                onChange={(e) => set('providerKey', e.target.value)}
                required
                className="num"
              />
            </Field>
            <Field label="Moneda">
              <Select
                value={form.currency}
                onChange={(e) => set('currency', e.target.value as Currency)}
                disabled={!!editingId}
              >
                <option value="VES">VES</option>
                <option value="USD">USD</option>
                <option value="USDT">USDT</option>
              </Select>
            </Field>
            <Field label="Entorno">
              <Select
                value={form.environment}
                onChange={(e) => set('environment', e.target.value as Environment)}
                disabled={!!editingId}
              >
                <option value="TEST">Prueba</option>
                <option value="LIVE">Real</option>
              </Select>
            </Field>
            <Field label="Modo de retiro">
              <Select
                value={form.payoutMode}
                onChange={(e) => set('payoutMode', e.target.value as PayoutMode)}
              >
                <option value="INSTANT">Instantáneo</option>
                <option value="MANUAL">Manual (aprobación)</option>
              </Select>
            </Field>
            <Field label="Cuenta Consi (rail)">
              <Select
                value={form.consiAccountId}
                onChange={(e) => set('consiAccountId', e.target.value)}
                required
              >
                <option value="">—</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} · {a.currency}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Comisión % (0.01 = 1%)">
              <Input
                value={form.percentageRate}
                onChange={(e) => set('percentageRate', e.target.value)}
                inputMode="decimal"
                className="num"
              />
            </Field>
            <Field label="IVA (0.16 = 16%)">
              <Input
                value={form.taxRate}
                onChange={(e) => set('taxRate', e.target.value)}
                inputMode="decimal"
                className="num"
              />
            </Field>
            <Field label="Comisión fija">
              <Input
                value={form.fixedFee}
                onChange={(e) => set('fixedFee', e.target.value)}
                inputMode="decimal"
                className="num"
              />
            </Field>
            <Field label="Comisión mínima">
              <Input
                value={form.minFee}
                onChange={(e) => set('minFee', e.target.value)}
                inputMode="decimal"
                className="num"
              />
            </Field>
            <Field label="Comisión máxima (0 = sin tope)">
              <Input
                value={form.maxFee}
                onChange={(e) => set('maxFee', e.target.value)}
                inputMode="decimal"
                className="num"
              />
            </Field>
          </div>

          <Field label="Campos de destino del cliente (JSON)">
            <textarea
              value={form.destinationSchemaText}
              onChange={(e) => set('destinationSchemaText', e.target.value)}
              rows={5}
              spellCheck={false}
              placeholder='[{"key":"document","label":"Cédula/RIF","required":true}]'
              className="num w-full rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-surface)] px-2.5 py-2 text-[length:var(--text-xs)] text-[var(--color-ink)] transition-colors duration-[var(--dur-fast)] placeholder:text-[var(--color-ink-4)] hover:border-[var(--color-rule-2)] focus-visible:border-[var(--color-accent)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-focus)]"
            />
            <p className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
              El retiro del cliente valida su objeto <span className="num">destination</span> contra
              estos campos. Vacío = sólo retiro a la cuenta bancaria del comercio.
            </p>
          </Field>

          {msg ? <Notice kind={msg.kind}>{msg.text}</Notice> : null}

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
      </Card>

      <Card className="p-[var(--space-md)]">
        <h2 className="mb-[var(--space-sm)] text-[length:var(--text-md)]">Pasarelas configuradas</h2>
        <DataTable
          id="admin-gateways"
          caption="Pasarelas configuradas"
          columns={columns}
          rows={gateways}
          rowKey={(g) => g.id}
          loading={loading}
          empty="Sin pasarelas."
          searchPlaceholder="Buscar por nombre, clave o cuenta…"
          defaultSort={{ id: 'name', dir: 'asc' }}
          exportFilename="pasarelas_consi"
        />
      </Card>
    </div>
  );
}
