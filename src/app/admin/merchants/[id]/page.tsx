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
