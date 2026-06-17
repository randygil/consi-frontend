'use client';

import { Copy, Eye, EyeOff, RefreshCw, Key, Terminal, Code2, Check, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import type { ApiKeys, WebhookDelivery } from '@/lib/types';

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-8 rounded-md hover:bg-[var(--blue-50)] hover:text-[var(--blue-700)] transition-colors"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      aria-label={`Copiar ${label}`}
    >
      {copied ? <Check size={14} className="text-[var(--success-600)]" /> : <Copy size={14} />}
    </Button>
  );
}

function SecretRow({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const display = secret && !revealed ? '•'.repeat(Math.min(value.length, 32)) : value;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={display} className="font-mono text-xs bg-[var(--ink-50)] border-[var(--border)] focus:ring-1 focus:ring-[var(--blue-400)]" />
        {secret ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? `Ocultar ${label}` : `Mostrar ${label}`}
          >
            {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
          </Button>
        ) : null}
        <CopyButton value={value} label={label} />
      </div>
    </div>
  );
}

export default function DevelopersPage() {
  const [keys, setKeys] = useState<ApiKeys | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);

  const load = () =>
    api.getApiKeys().then((k) => {
      setKeys(k);
      setWebhookUrl(k.webhookUrl ?? '');
    });

  useEffect(() => {
    load();
    api.getWebhookDeliveries().then(setDeliveries).catch(() => setDeliveries([]));
  }, []);

  async function regenerate(environment: 'TEST' | 'LIVE') {
    const updated = await api.regenerateApiKey(environment);
    setKeys((prev) => (prev ? { ...prev, ...updated } : prev));
    setStatus(`Clave ${environment} regenerada`);
    setTimeout(() => setStatus(null), 3000);
  }

  async function saveWebhook(e: React.FormEvent) {
    e.preventDefault();
    await api.updateWebhook(webhookUrl);
    setStatus('Webhook URL actualizada');
    setTimeout(() => setStatus(null), 3000);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-strong)] flex items-center gap-2">
            <Code2 className="text-[var(--blue-500)]" />
            <span>Desarrolladores</span>
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Accede a tus credenciales de API y configura tus webhooks. ¿Cómo integrar?{' '}
            <Link href="/docs" className="font-bold text-[var(--blue-700)] hover:underline">Ver Documentación de API</Link>.
          </p>
        </div>
      </div>

      {status ? (
        <div className="p-3 rounded-lg bg-[var(--success-100)] text-[var(--success-600)] text-xs font-bold">
          {status}
        </div>
      ) : null}

      <div className="space-y-6">
        <Card className="border-[var(--border)] shadow-[var(--shadow-sm)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-[var(--text-strong)] flex items-center gap-2">
              <Key size={16} className="text-[var(--blue-500)]" />
              <span>Credenciales de API</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {keys ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SecretRow label="API Key (Test)" value={keys.apiKeyTest} />
                  <SecretRow label="API Secret (Test)" value={keys.apiSecretTest} secret />
                  <SecretRow label="API Key (Live)" value={keys.apiKeyLive} />
                  <SecretRow label="API Secret (Live)" value={keys.apiSecretLive} secret />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => regenerate('TEST')} className="text-xs">
                    <RefreshCw size={14} className="mr-1.5" /> Regenerar Test
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => regenerate('LIVE')} className="text-xs">
                    <RefreshCw size={14} className="mr-1.5" /> Regenerar Live
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">Cargando credenciales…</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-[var(--border)] shadow-[var(--shadow-sm)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-[var(--text-strong)] flex items-center gap-2">
              <Terminal size={16} className="text-[var(--blue-500)]" />
              <span>Configuración de Webhook</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveWebhook} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="webhook" className="text-xs font-bold text-[var(--text-strong)]">URL del Webhook de tu Servidor</Label>
                <Input
                  id="webhook"
                  type="url"
                  placeholder="https://tu-servidor.com/webhooks/consi"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="max-w-xl font-mono text-sm border-[var(--border)]"
                />
                <p className="text-xs text-[var(--text-subtle)]">
                  Consi enviará peticiones HTTP POST firmadas con eventos del estado de las transacciones (ej. <code className="bg-[var(--ink-100)] px-1 rounded">transaction.completed</code>) a este endpoint.
                </p>
              </div>
              <Button type="submit" className="text-xs font-bold px-4 py-2">Guardar Endpoint</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-[var(--border)] shadow-[var(--shadow-sm)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-[var(--text-strong)] flex items-center gap-2">
              <ArrowRight size={16} className="text-[var(--blue-500)]" />
              <span>Historial de Entregas de Webhook</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table className="border border-[var(--border)] rounded-xl overflow-hidden">
              <TableHeader className="bg-[var(--ink-50)]">
                <TableRow>
                  <TableHead className="font-bold text-[var(--text-strong)]">Evento</TableHead>
                  <TableHead className="font-bold text-[var(--text-strong)]">Estado</TableHead>
                  <TableHead className="font-bold text-[var(--text-strong)]">Intentos</TableHead>
                  <TableHead className="font-bold text-[var(--text-strong)]">Último error</TableHead>
                  <TableHead className="font-bold text-[var(--text-strong)]">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-[var(--text-subtle)] font-medium">
                      Sin notificaciones enviadas aún
                    </TableCell>
                  </TableRow>
                ) : (
                  deliveries.map((d) => (
                    <TableRow key={d.id} className="hover:bg-[var(--ink-50)] transition-colors">
                      <TableCell className="font-mono text-xs font-semibold">{d.event}</TableCell>
                      <TableCell>
                        <span
                          className={
                            d.status === 'DELIVERED'
                              ? 'inline-flex items-center rounded-full bg-[var(--success-100)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--success-600)]'
                              : d.status === 'FAILED'
                                ? 'inline-flex items-center rounded-full bg-[var(--danger-100)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--danger-600)]'
                                : 'inline-flex items-center rounded-full bg-[var(--warning-100)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--warning-600)]'
                          }
                        >
                          {d.status === 'DELIVERED' ? 'Completado' : d.status === 'FAILED' ? 'Fallido' : 'Pendiente'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-[var(--text-strong)]">{d.attempts}/{d.maxAttempts}</TableCell>
                      <TableCell className="max-w-xs truncate text-[var(--text-muted)] text-xs font-mono">
                        {d.lastError ?? '—'}
                      </TableCell>
                      <TableCell className="text-[var(--text-subtle)] text-xs">{formatDate(d.createdAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
