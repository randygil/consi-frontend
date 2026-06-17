'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api-client';
import { formatDate, formatMoney, typeLabel } from '@/lib/format';
import type { AdminMerchantDetail, MerchantGatewayLink } from '@/lib/types';

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

  if (error) return <p className="text-sm text-[var(--destructive)]">{error}</p>;
  if (!merchant) return <p className="text-[var(--text-muted)]">Cargando…</p>;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/merchants"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-strong)]"
      >
        <ArrowLeft size={16} /> Comercios
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-[var(--text-strong)]">{merchant.businessName}</h1>
        <Badge>{merchant.environment === 'LIVE' ? 'Real' : 'Prueba'}</Badge>
      </div>
      <p className="-mt-4 text-sm text-[var(--text-muted)]">
        {merchant.email} · Retención {merchant.retentionDays} días
      </p>

      {/* Wallets */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {merchant.wallets.map((w) => (
          <Card key={w.id}>
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-[var(--text-muted)]">Saldo {w.currency}</p>
              <p className="text-lg font-bold text-[var(--text-strong)]">
                {formatMoney(w.balance, w.currency)}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Disponible {formatMoney(w.available, w.currency)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gateway enablement (selección de pasarela por prioridad) */}
      <GatewayEnablement merchant={merchant} onSaved={setMerchant} />

      {/* Users */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {merchant.users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge>{u.role}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-[var(--text-muted)]">
                    {formatDate(u.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Transacciones recientes</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {merchant.transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{typeLabel(t.type)}</TableCell>
                  <TableCell>{formatMoney(t.amount, t.currency)}</TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                  </TableCell>
                  <TableCell className="text-sm text-[var(--text-muted)]">
                    {formatDate(t.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
              {merchant.transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-[var(--text-muted)]">
                    Sin transacciones.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/** Edit which gateways are enabled for a merchant and their selection priority. */
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

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const updated = await api.adminSetMerchantGateways(
        merchant.id,
        rows.map((r) => ({
          gatewayId: r.gatewayId,
          enabled: r.enabled,
          priority: r.priority,
        })),
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
    <Card>
      <CardHeader>
        <CardTitle>Pasarelas habilitadas</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <p className="text-xs text-[var(--text-muted)]">
          Menor prioridad = preferida. El orquestador elige la primera habilitada con saldo
          suficiente en su cuenta Consi. La comisión mostrada es la de la pasarela.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pasarela</TableHead>
              <TableHead>Moneda</TableHead>
              <TableHead>Modo</TableHead>
              <TableHead>Comisión</TableHead>
              <TableHead>Habilitada</TableHead>
              <TableHead>Prioridad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-[var(--text-muted)]">
                  Sin pasarelas para este entorno.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.gatewayId}>
                  <TableCell className="font-medium">
                    {r.gateway.displayName}
                    <span className="ml-1 font-mono text-xs text-[var(--text-muted)]">
                      {r.gateway.key}
                    </span>
                  </TableCell>
                  <TableCell>{r.gateway.currency}</TableCell>
                  <TableCell>
                    <Badge>{r.gateway.payoutMode === 'INSTANT' ? 'Instantánea' : 'Manual'}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-[var(--text-muted)]">
                    {(Number(r.gateway.percentageRate) * 100).toFixed(2)}% · IVA{' '}
                    {(Number(r.gateway.taxRate) * 100).toFixed(0)}%
                  </TableCell>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={r.enabled}
                      onChange={(e) => update(r.gatewayId, { enabled: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={String(r.priority)}
                      onChange={(e) => update(r.gatewayId, { priority: Number(e.target.value) })}
                      className="w-20"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {msg ? (
          <p className={msg.kind === 'ok' ? 'text-sm text-green-600' : 'text-sm text-[var(--destructive)]'}>
            {msg.text}
          </p>
        ) : null}
        <Button onClick={save} disabled={saving || rows.length === 0}>
          {saving ? 'Guardando…' : 'Guardar pasarelas'}
        </Button>
      </CardContent>
    </Card>
  );
}
