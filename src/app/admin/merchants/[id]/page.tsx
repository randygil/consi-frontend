'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
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
import { api } from '@/lib/api-client';
import { formatDate, formatMoney, typeLabel } from '@/lib/format';
import type { AdminMerchantDetail, MerchantGatewayConfig } from '@/lib/types';

export default function AdminMerchantDetailPage() {
  const params = useParams<{ id: string }>();
  const [merchant, setMerchant] = useState<AdminMerchantDetail | null>(null);
  const [merchantGateways, setMerchantGateways] = useState<MerchantGatewayConfig[]>([]);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadGateways = useCallback(() => {
    if (!params.id) return;
    api.getMerchantGateways(params.id)
      .then(setMerchantGateways)
      .catch(console.error);
  }, [params.id]);

  useEffect(() => {
    if (!params.id) return;
    api
      .adminGetMerchant(params.id)
      .then(setMerchant)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'));
    
    loadGateways();
  }, [params.id, loadGateways]);

  const handleToggleGateway = async (gateway: string, enabled: boolean) => {
    if (!params.id) return;
    setToggleLoading(gateway);
    try {
      await api.toggleMerchantGateway(params.id, gateway, enabled);
      loadGateways();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al cambiar la pasarela');
    } finally {
      setToggleLoading(null);
    }
  };

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
        {merchant.email} · Retención {merchant.retentionDays} días · Pasarela{' '}
        {merchant.defaultGateway ?? '—'}
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

      {/* Merchant Gateways Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Pasarelas de Pago Habilitadas</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {['MOCK_BANGENTE', 'MOCK_BANCARIBE', 'MOCK_CRYPTO', 'STRIPE', 'MANUAL'].map((gw) => {
              const config = merchantGateways.find((g) => g.gateway === gw);
              const isEnabled = config ? config.enabled : false;
              return (
                <label key={gw} className="flex items-center gap-3 border rounded-lg p-4 cursor-pointer hover:bg-gray-50 border-gray-100 select-none">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    disabled={toggleLoading === gw}
                    onChange={(e) => handleToggleGateway(gw, e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 size-4"
                  />
                  <div>
                    <p className="text-xs font-bold text-gray-900">{gw.replace('MOCK_', '')}</p>
                    <span className="text-[10px] font-semibold text-gray-400">
                      {gw.includes('CRYPTO') || gw === 'STRIPE' ? 'Moneda: USD' : 'Moneda: VES'}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

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
