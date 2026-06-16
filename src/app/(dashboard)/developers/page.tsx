'use client';

import { Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
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
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      aria-label={`Copiar ${label}`}
    >
      <Copy size={16} />
      {copied ? <span className="sr-only">Copiado</span> : null}
    </Button>
  );
}

function SecretRow({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const display = secret && !revealed ? '•'.repeat(Math.min(value.length, 32)) : value;
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={display} className="font-mono text-xs" />
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

const SIGNING_SNIPPET = `import crypto from 'crypto';

const apiKey = process.env.CONSI_API_KEY;
const secret = process.env.CONSI_API_SECRET;
const order = 'order-123';
const amount = '100.00';
const currency = 'USD';

const payload = [apiKey, order, amount, currency].join('|');
const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

await fetch('http://localhost:4000/api/payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'x-signature': signature,
  },
  body: JSON.stringify({ order, amount, currency }),
});`;

const EMBED_SNIPPET = `<!-- 1. Carga el script de Consi (una vez) -->
<script src="http://localhost:3000/consi.js"></script>

<!-- 2. Abre el checkout incrustado con el token de tu link de pago -->
<button onclick="Consi.checkout({ token: 'demo-link', onSuccess: () => location.reload() })">
  Pagar con Consi
</button>`;

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
  }

  async function saveWebhook(e: React.FormEvent) {
    e.preventDefault();
    await api.updateWebhook(webhookUrl);
    setStatus('Webhook URL actualizada');
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Desarrolladores / API</h1>

      <Card>
        <CardHeader><CardTitle className="text-base font-semibold text-[var(--foreground)]">Claves API</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {keys ? (
            <>
              <SecretRow label="API Key (Test)" value={keys.apiKeyTest} />
              <SecretRow label="API Secret (Test)" value={keys.apiSecretTest} secret />
              <SecretRow label="API Key (Live)" value={keys.apiKeyLive} />
              <SecretRow label="API Secret (Live)" value={keys.apiSecretLive} secret />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => regenerate('TEST')}>
                  <RefreshCw size={14} /> Regenerar Test
                </Button>
                <Button variant="outline" size="sm" onClick={() => regenerate('LIVE')}>
                  <RefreshCw size={14} /> Regenerar Live
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">Cargando…</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base font-semibold text-[var(--foreground)]">Firmar peticiones de pago</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--muted-foreground)]">
            Llama a <code className="font-mono">POST /api/payment</code> con las cabeceras{' '}
            <code className="font-mono">x-api-key</code> y{' '}
            <code className="font-mono">x-signature</code>. La firma es el HMAC-SHA256 (hex) del secreto
            sobre la cadena <code className="font-mono">apiKey|order|amount|currency</code>.
          </p>
          <div className="relative">
            <pre className="overflow-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--muted)] p-4 font-mono text-xs">
              {SIGNING_SNIPPET}
            </pre>
            <div className="absolute right-2 top-2">
              <CopyButton value={SIGNING_SNIPPET} label="snippet" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base font-semibold text-[var(--foreground)]">Checkout incrustado (drop-in)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--muted-foreground)]">
            Crea un link de pago y abre su checkout dentro de tu web con dos líneas, sin redirigir al
            cliente. El <code className="font-mono">token</code> es el del link (lo ves en{' '}
            <span className="font-semibold">Links de pago</span>).
          </p>
          <div className="relative">
            <pre className="overflow-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--muted)] p-4 font-mono text-xs">
              {EMBED_SNIPPET}
            </pre>
            <div className="absolute right-2 top-2">
              <CopyButton value={EMBED_SNIPPET} label="snippet de incrustación" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base font-semibold text-[var(--foreground)]">Webhook</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveWebhook} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="webhook">URL de notificaciones</Label>
              <Input
                id="webhook"
                type="url"
                placeholder="https://tu-servidor.com/webhooks"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-[var(--muted-foreground)]">
                El banco notificará confirmaciones de pago a esta URL.
              </p>
            </div>
            <Button type="submit">Guardar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base font-semibold text-[var(--foreground)]">Entregas de webhook</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Intentos</TableHead>
                <TableHead>Último error</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.length === 0 ? (
                <TableRow>
                  <TableCell className="text-[var(--muted-foreground)]">Sin entregas</TableCell>
                </TableRow>
              ) : (
                deliveries.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.event}</TableCell>
                    <TableCell>
                      <span
                        className={
                          d.status === 'DELIVERED'
                            ? 'inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--success-100)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--success-600)]'
                            : d.status === 'FAILED'
                              ? 'inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--danger-100)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--danger-600)]'
                              : 'inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--warning-100)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--warning-600)]'
                        }
                      >
                        {d.status}
                      </span>
                    </TableCell>
                    <TableCell>{d.attempts}/{d.maxAttempts}</TableCell>
                    <TableCell className="max-w-xs truncate text-[var(--muted-foreground)]">
                      {d.lastError ?? '—'}
                    </TableCell>
                    <TableCell className="text-[var(--muted-foreground)]">{formatDate(d.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {status ? <p className="text-sm text-green-600">{status}</p> : null}
    </div>
  );
}
