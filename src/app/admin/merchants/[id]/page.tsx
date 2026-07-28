'use client';

/* Hallmark · genre: modern-minimal · macrostructure: 05 Workbench
 * design-system: design.md · theme: Cobalt (light + dark)
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Column, DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Notice, PageHead } from '@/components/ui/page-head';
import { api } from '@/lib/api-client';
import { formatDate, formatMoney, roleLabel, statusLabel, typeLabel } from '@/lib/format';
import type {
  AdminMerchantDetail,
  AdminMerchantUser,
  MerchantGatewayLink,
  Transaction,
} from '@/lib/types';

const pct = (v: string, digits = 2) => `${(Number(v) * 100).toFixed(digits)}%`;

const USER_COLUMNS: Column<AdminMerchantUser>[] = [
  { id: 'email', header: 'Correo', value: (u) => u.email },
  {
    id: 'role',
    header: 'Rol',
    value: (u) => u.role,
    text: (u) => roleLabel(u.role),
    cell: (u) => <Badge>{roleLabel(u.role)}</Badge>,
  },
  {
    id: 'createdAt',
    header: 'Creado',
    num: true,
    value: (u) => u.createdAt,
    text: (u) => formatDate(u.createdAt),
    cell: (u) => (
      <span className="whitespace-nowrap text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
        {formatDate(u.createdAt)}
      </span>
    ),
  },
];

const TX_COLUMNS: Column<Transaction>[] = [
  {
    id: 'type',
    header: 'Tipo',
    value: (t) => t.type,
    text: (t) => typeLabel(t.type),
    cell: (t) => typeLabel(t.type),
  },
  { id: 'currency', header: 'Moneda', num: true, align: 'left', value: (t) => t.currency },
  {
    id: 'amount',
    header: 'Monto',
    num: true,
    value: (t) => Number(t.amount),
    text: (t) => formatMoney(t.amount, t.currency),
    cell: (t) => <span className="text-[var(--color-ink)]">{formatMoney(t.amount, t.currency)}</span>,
  },
  {
    id: 'status',
    header: 'Estado',
    value: (t) => t.status,
    text: (t) => statusLabel(t.status),
    cell: (t) => <StatusBadge status={t.status} />,
  },
  {
    id: 'createdAt',
    header: 'Fecha',
    num: true,
    value: (t) => t.createdAt,
    text: (t) => formatDate(t.createdAt),
    cell: (t) => (
      <span className="whitespace-nowrap text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
        {formatDate(t.createdAt)}
      </span>
    ),
  },
];

export default function AdminMerchantDetailPage() {
  const params = useParams<{ id: string }>();
  const [merchant, setMerchant] = useState<AdminMerchantDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    api
      .adminGetMerchant(params.id)
      .then(setMerchant)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'));
  }, [params.id]);

  if (error) return <Notice kind="err">{error}</Notice>;
  if (!merchant) {
    return <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">Cargando…</p>;
  }

  return (
    <div className="flex flex-col gap-[var(--space-md)]">
      <Link
        href="/admin/merchants"
        className="inline-flex w-fit items-center gap-1.5 text-[length:var(--text-sm)] text-[var(--color-ink-3)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--color-accent)]"
      >
        <ArrowLeft size={15} /> Comercios
      </Link>

      <PageHead
        title={merchant.businessName}
        lede={`${merchant.email} · retención ${merchant.retentionDays} días`}
        action={<Badge>{merchant.environment === 'LIVE' ? 'Real' : 'Prueba'}</Badge>}
      />

      <div className="grid gap-[var(--space-sm)] sm:grid-cols-2">
        {merchant.wallets.map((w) => (
          <Card key={w.id} className="p-[var(--space-md)]">
            <p className="label">Saldo {w.currency}</p>
            <p className="num mt-1 text-[length:var(--text-lg)] text-[var(--color-ink)]">
              {formatMoney(w.balance, w.currency)}
            </p>
            <p className="num mt-0.5 text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
              disponible {formatMoney(w.available, w.currency)}
            </p>
          </Card>
        ))}
      </div>

      <RiskPolicyCard merchant={merchant} onSaved={setMerchant} />

      <GatewayEnablement merchant={merchant} onSaved={setMerchant} />

      <Card className="p-[var(--space-md)]">
        <h2 className="mb-[var(--space-sm)] text-[length:var(--text-md)]">Usuarios</h2>
        <DataTable
          id="merchant-users"
          caption={`Usuarios de ${merchant.businessName}`}
          columns={USER_COLUMNS}
          rows={merchant.users}
          rowKey={(u) => u.id}
          empty="Sin usuarios."
          searchable={false}
          exportable={false}
          defaultSort={{ id: 'createdAt', dir: 'asc' }}
        />
      </Card>

      <Card className="p-[var(--space-md)]">
        <h2 className="mb-[var(--space-sm)] text-[length:var(--text-md)]">Transacciones recientes</h2>
        <DataTable
          id="merchant-transactions"
          caption={`Transacciones de ${merchant.businessName}`}
          columns={TX_COLUMNS}
          rows={merchant.transactions}
          rowKey={(t) => t.id}
          empty="Sin transacciones."
          searchPlaceholder="Buscar…"
          defaultSort={{ id: 'createdAt', dir: 'desc' }}
          exportFilename={`transacciones_${merchant.businessName.toLowerCase().replace(/\s+/g, '_')}`}
        />
      </Card>
    </div>
  );
}

/**
 * Risk & payout policy: retention, rolling reserve, maker-checker threshold,
 * daily cap and dispersion cadence. Thresholds are USD-equivalent so one knob
 * covers USD, VES and USDT alike.
 */
function RiskPolicyCard({
  merchant,
  onSaved,
}: {
  merchant: AdminMerchantDetail;
  onSaved: (m: AdminMerchantDetail) => void;
}) {
  const [form, setForm] = useState({
    retentionDays: String(merchant.retentionDays),
    reservePct: (Number(merchant.rollingReservePercent) * 100).toFixed(2),
    reserveDays: String(merchant.reserveDays),
    approvalUsd: merchant.payoutApprovalThresholdUsd,
    dailyLimitUsd: merchant.payoutDailyLimitUsd,
    dispersionMode: merchant.dispersionMode,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const updated = await api.adminUpdateMerchantPolicy(merchant.id, {
        retentionDays: Number(form.retentionDays),
        rollingReservePercent: (Number(form.reservePct) / 100).toFixed(4),
        reserveDays: Number(form.reserveDays),
        payoutApprovalThresholdUsd: Number(form.approvalUsd).toFixed(2),
        payoutDailyLimitUsd: Number(form.dailyLimitUsd).toFixed(2),
        dispersionMode: form.dispersionMode,
      });
      onSaved({ ...merchant, ...updated });
      setMsg({ kind: 'ok', text: 'Política actualizada.' });
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      setMsg({ kind: 'err', text: err instanceof Error ? err.message : 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  }

  const field = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    hint?: string,
  ) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
        {label}
      </label>
      <Input id={id} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className="num" />
      {hint ? <p className="text-[length:var(--text-2xs)] text-[var(--color-ink-4)]">{hint}</p> : null}
    </div>
  );

  return (
    <Card className="p-[var(--space-md)]">
      <h2 className="text-[length:var(--text-md)]">Política de riesgo y retiros</h2>
      <p className="mb-[var(--space-sm)] mt-1 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
        Umbrales en USD equivalentes: aplican por igual a USD, VES y USDT.
      </p>
      <form onSubmit={save} className="flex flex-col gap-[var(--space-sm)]">
        <div className="grid gap-[var(--space-sm)] sm:grid-cols-3">
          {field('pol-ret', 'Retención (días)', form.retentionDays, (v) =>
            setForm((f) => ({ ...f, retentionDays: v })),
          )}
          {field(
            'pol-res',
            'Reserva rodante (%)',
            form.reservePct,
            (v) => setForm((f) => ({ ...f, reservePct: v })),
            'Fracción de cada cobro retenida como garantía',
          )}
          {field('pol-resd', 'Días de reserva', form.reserveDays, (v) =>
            setForm((f) => ({ ...f, reserveDays: v })),
          )}
          {field(
            'pol-appr',
            'Umbral de aprobación (USD)',
            form.approvalUsd,
            (v) => setForm((f) => ({ ...f, approvalUsd: v })),
            'Retiros mayores requieren aprobación de un admin (0 = off)',
          )}
          {field(
            'pol-limit',
            'Límite diario (USD)',
            form.dailyLimitUsd,
            (v) => setForm((f) => ({ ...f, dailyLimitUsd: v })),
            'Tope de retiros por día (0 = sin límite)',
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pol-disp" className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
              Cadencia del retiro automático
            </label>
            <select
              id="pol-disp"
              value={form.dispersionMode}
              onChange={(e) =>
                setForm((f) => ({ ...f, dispersionMode: e.target.value as typeof f.dispersionMode }))
              }
              className="h-9 rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-surface)] px-2.5 text-[length:var(--text-sm)] text-[var(--color-ink)]"
            >
              <option value="IMMEDIATE">Inmediata (al liberar fondos)</option>
              <option value="DAILY_CUT">Corte diario (T+1, 01:00)</option>
            </select>
          </div>
        </div>
        {msg ? <Notice kind={msg.kind}>{msg.text}</Notice> : null}
        <div>
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar política'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** Which gateways a merchant may use, and in what order the orchestrator tries them. */
function GatewayEnablement({
  merchant,
  onSaved,
}: {
  merchant: AdminMerchantDetail;
  onSaved: (m: AdminMerchantDetail) => void;
}) {
  const [rows, setRows] = useState<MerchantGatewayLink[]>(merchant.merchantGateways);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const update = (gatewayId: string, patch: Partial<MerchantGatewayLink>) =>
    setRows((prev) => prev.map((r) => (r.gatewayId === gatewayId ? { ...r, ...patch } : r)));

  const columns = useMemo<Column<MerchantGatewayLink>[]>(
    () => [
      {
        id: 'name',
        header: 'Pasarela',
        value: (r) => r.gateway.displayName,
        cell: (r) => (
          <span>
            <span className="font-medium text-[var(--color-ink)]">{r.gateway.displayName}</span>
            <span className="num ml-1.5 text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
              {r.gateway.key}
            </span>
          </span>
        ),
      },
      {
        id: 'currency',
        header: 'Moneda',
        num: true,
        align: 'left',
        value: (r) => r.gateway.currency,
      },
      {
        id: 'mode',
        header: 'Modo',
        value: (r) => r.gateway.payoutMode,
        cell: (r) => <Badge>{r.gateway.payoutMode === 'INSTANT' ? 'Instantánea' : 'Manual'}</Badge>,
      },
      {
        id: 'rate',
        header: 'Comisión',
        num: true,
        value: (r) => Number(r.gateway.percentageRate),
        cell: (r) => (
          <span className="whitespace-nowrap text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
            {pct(r.gateway.percentageRate)} · IVA {pct(r.gateway.taxRate, 0)}
          </span>
        ),
      },
      {
        id: 'enabled',
        header: 'Habilitada',
        align: 'center',
        sortable: false,
        cell: (r) => (
          // Native checkbox, accent-tinted — no re-drawn control.
          <input
            type="checkbox"
            checked={r.enabled}
            aria-label={`Habilitar ${r.gateway.displayName}`}
            onChange={(e) => update(r.gatewayId, { enabled: e.target.checked })}
            className="size-4 accent-[var(--color-accent)]"
          />
        ),
      },
      {
        id: 'priority',
        header: 'Prioridad',
        num: true,
        value: (r) => r.priority,
        cell: (r) => (
          <Input
            type="number"
            value={String(r.priority)}
            aria-label={`Prioridad de ${r.gateway.displayName}`}
            onChange={(e) => update(r.gatewayId, { priority: Number(e.target.value) })}
            className="num ml-auto h-8 w-20 text-right"
          />
        ),
      },
    ],
    [],
  );

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const updated = await api.adminSetMerchantGateways(
        merchant.id,
        rows.map((r) => ({ gatewayId: r.gatewayId, enabled: r.enabled, priority: r.priority })),
      );
      onSaved(updated);
      setRows(updated.merchantGateways);
      setMsg({ kind: 'ok', text: 'Pasarelas actualizadas.' });
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-[var(--space-md)]">
      <h2 className="text-[length:var(--text-md)]">Pasarelas habilitadas</h2>
      <p className="mb-[var(--space-sm)] mt-1 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
        Menor prioridad = preferida. El orquestador elige la primera habilitada con saldo suficiente
        en su cuenta Consi.
      </p>

      {/* A configuration grid, not a report — no search field, nothing to export. */}
      <DataTable
        id="merchant-gateways"
        caption="Pasarelas habilitadas para este comercio"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.gatewayId}
        empty="Sin pasarelas para este entorno."
        searchable={false}
        exportable={false}
        defaultSort={{ id: 'priority', dir: 'asc' }}
      />

      <div className="mt-[var(--space-sm)] flex flex-col gap-[var(--space-xs)]">
        {msg ? <Notice kind={msg.kind}>{msg.text}</Notice> : null}
        <div>
          <Button onClick={save} disabled={saving || rows.length === 0}>
            {saving ? 'Guardando…' : 'Guardar pasarelas'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
