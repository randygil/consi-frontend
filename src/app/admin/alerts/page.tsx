'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import type { SystemAlert } from '@/lib/types';
import { AlertTriangle, Check, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function AlertsAdminPage() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadAlerts = useCallback(() => {
    setLoading(true);
    api.getAlerts()
      .then(setAlerts)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar las alertas'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleResolveAlert = async (id: string) => {
    setActionLoading(id);
    try {
      await api.resolveAlert(id);
      loadAlerts();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al resolver la alerta');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-strong)] flex items-center gap-2">
          <AlertTriangle className="text-amber-500" />
          <span>Alertas de Operaciones y Fondos</span>
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Supervise los avisos críticos de saldo bajo o fallos en las transacciones que requieren intervención inmediata.
        </p>
      </div>

      {error ? <p className="text-sm text-[var(--destructive)] bg-red-50 p-3 rounded-lg">{error}</p> : null}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo Alerta</TableHead>
                <TableHead>Detalle / Mensaje</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-sm text-[var(--text-muted)]">
                    {loading ? 'Cargando alertas...' : 'Excelente: No hay alertas pendientes en la plataforma.'}
                  </TableCell>
                </TableRow>
              ) : (
                alerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="align-middle text-xs font-mono text-[var(--text-muted)]">
                      {formatDate(alert.createdAt)}
                    </TableCell>
                    <TableCell className="align-middle">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        alert.type === 'INSUFFICIENT_BALANCE' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {alert.type === 'INSUFFICIENT_BALANCE' ? (
                          <>
                            <ShieldAlert size={12} /> Saldo Insuficiente
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={12} /> Saldo Bajo
                          </>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="align-middle text-sm font-semibold text-gray-800">
                      {alert.message}
                    </TableCell>
                    <TableCell className="text-right align-middle">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actionLoading !== null}
                        className="bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800 border-green-200 text-xs px-3 py-1 h-auto flex items-center gap-1 ml-auto"
                        onClick={() => handleResolveAlert(alert.id)}
                      >
                        <Check size={14} />
                        {actionLoading === alert.id ? 'Resolviendo...' : 'Marcar Resuelto'}
                      </Button>
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
