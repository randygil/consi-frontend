'use client';

/* Hallmark · genre: modern-minimal · macrostructure: 21 Component Playground
 * design-system: design.md · designed-as-app · theme: Cobalt (light + dark)
 * The credentials half of the docs family: keys, webhook endpoint, delivery log.
 */

import { ArrowRight, Eye, EyeOff, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CopyButton } from '@/components/developers/copy-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Notice, PageHead } from '@/components/ui/page-head';
import { Column, DataTable } from '@/components/ui/data-table';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ApiKeys, WebhookDelivery } from '@/lib/types';

/** A key is a value you read, copy, and occasionally hide — not a form field. */
function SecretRow({
  label,
  value,
  secret = false,
}: {
  label: string;
  value: string;
  secret?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const masked = secret && !revealed;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex gap-[var(--space-2xs)]">
        <Input
          readOnly
          value={masked ? '•'.repeat(Math.min(value.length, 32)) : value}
          className="num text-[length:var(--text-sm)]"
        />
        {secret ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 shrink-0"
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? `Ocultar ${label}` : `Mostrar ${label}`}
          >
            {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </Button>
        ) : null}
        <CopyButton value={value} label={label} />
      </div>
    </div>
  );
}

const DELIVERY_TONE: Record<string, string> = {
  DELIVERED: 'text-[var(--color-ok)] bg-[var(--color-ok-soft)]',
  FAILED: 'text-[var(--color-bad)] bg-[var(--color-bad-soft)]',
};
const DELIVERY_LABEL: Record<string, string> = {
  DELIVERED: 'Entregado',
  FAILED: 'Fallido',
};

const DELIVERY_COLUMNS: Column<WebhookDelivery>[] = [
  {
    id: 'event',
    header: 'Evento',
    num: true,
    align: 'left',
    value: (d) => d.event,
    cell: (d) => <span className="whitespace-nowrap text-[var(--color-ink)]">{d.event}</span>,
  },
  {
    id: 'status',
    header: 'Estado',
    value: (d) => d.status,
    text: (d) => DELIVERY_LABEL[d.status] ?? 'Pendiente',
    cell: (d) => (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-xs)] px-1.5 py-0.5',
          'font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] font-medium uppercase tracking-[var(--tracking-mono-label)]',
          DELIVERY_TONE[d.status] ?? 'text-[var(--color-warn)] bg-[var(--color-warn-soft)]',
        )}
      >
        <span className="size-1.5 rounded-full bg-current" aria-hidden />
        {DELIVERY_LABEL[d.status] ?? 'Pendiente'}
      </span>
    ),
  },
  {
    id: 'attempts',
    header: 'Intentos',
    num: true,
    value: (d) => d.attempts,
    text: (d) => `${d.attempts}/${d.maxAttempts}`,
    cell: (d) => (
      <span className="whitespace-nowrap">
        {d.attempts}/{d.maxAttempts}
      </span>
    ),
  },
  {
    id: 'lastError',
    header: 'Último error',
    num: true,
    align: 'left',
    value: (d) => d.lastError ?? '',
    cell: (d) => (
      <span className="block max-w-xs truncate text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
        {d.lastError ?? '—'}
      </span>
    ),
  },
  {
    id: 'createdAt',
    header: 'Fecha',
    num: true,
    value: (d) => d.createdAt,
    text: (d) => formatDate(d.createdAt),
    cell: (d) => (
      <span className="whitespace-nowrap text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
        {formatDate(d.createdAt)}
      </span>
    ),
  },
];

export default function DevelopersPage() {
  const [keys, setKeys] = useState<ApiKeys | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [saving, setSaving] = useState(false);

  const load = () =>
    api.getApiKeys().then((k) => {
      setKeys(k);
      setWebhookUrl(k.webhookUrl ?? '');
    });

  useEffect(() => {
    load();
    api
      .getWebhookDeliveries()
      .then(setDeliveries)
      .catch(() => setDeliveries([]));
  }, []);

  function flash(message: string) {
    setStatus(message);
    setTimeout(() => setStatus(null), 3000);
  }

  async function regenerate(environment: 'TEST' | 'LIVE') {
    if (!window.confirm(`Regenerar la clave ${environment} invalida la actual. ¿Continuar?`)) return;
    const updated = await api.regenerateApiKey(environment);
    setKeys((prev) => (prev ? { ...prev, ...updated } : prev));
    flash(`Clave ${environment} regenerada`);
  }

  async function saveWebhook(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateWebhook(webhookUrl);
      flash('Endpoint de webhook actualizado');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-[var(--space-md)]">
      <PageHead
        title="Desarrolladores"
        lede="Tus credenciales de API y el endpoint donde Consi te notifica cada cambio de estado."
        action={
          <Link href="/docs" className="text-[length:var(--text-sm)] text-[var(--color-accent)] hover:underline">
            Ver documentación →
          </Link>
        }
      />

      {status ? <Notice kind="ok">{status}</Notice> : null}

      <Card>
        <CardHeader>
          <CardTitle>Credenciales</CardTitle>
          <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
            La <span className="num">key</span> identifica al comercio; el{' '}
            <span className="num">secret</span> firma las peticiones y no debe salir de tu
            servidor.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-[var(--space-sm)]">
          {keys ? (
            <>
              <div className="grid gap-[var(--space-sm)] md:grid-cols-2">
                <SecretRow label="API Key · Test" value={keys.apiKeyTest} />
                <SecretRow label="API Secret · Test" value={keys.apiSecretTest} secret />
                <SecretRow label="API Key · Live" value={keys.apiKeyLive} />
                <SecretRow label="API Secret · Live" value={keys.apiSecretLive} secret />
              </div>
              <div className="flex flex-wrap gap-[var(--space-2xs)]">
                <Button variant="outline" size="sm" onClick={() => regenerate('TEST')}>
                  <RefreshCw size={14} /> Regenerar Test
                </Button>
                <Button variant="destructive" size="sm" onClick={() => regenerate('LIVE')}>
                  <RefreshCw size={14} /> Regenerar Live
                </Button>
              </div>
            </>
          ) : (
            <p className="label">Cargando credenciales</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endpoint de webhook</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveWebhook} className="flex flex-col gap-[var(--space-xs)]">
            <div className="flex max-w-xl flex-col gap-1.5">
              <Label htmlFor="webhook">URL de tu servidor</Label>
              <Input
                id="webhook"
                type="url"
                placeholder="https://tu-servidor.com/webhooks/consi"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="num text-[length:var(--text-sm)]"
              />
              <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                Consi enviará un <span className="num">POST</span> firmado con cada cambio de
                estado —{' '}
                <Link href="/docs#webhooks" className="text-[var(--color-accent)] hover:underline">
                  cómo verificar la firma
                </Link>
                .
              </p>
            </div>
            <div>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar endpoint'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entregas recientes</CardTitle>
          <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
            Cada intento de notificación, con su último error si lo hubo.
          </p>
        </CardHeader>
        <CardContent>
          <DataTable
            id="webhook-deliveries"
            caption="Entregas de webhook"
            columns={DELIVERY_COLUMNS}
            rows={deliveries}
            rowKey={(d) => d.id}
            empty="Sin notificaciones enviadas aún."
            searchPlaceholder="Buscar por evento o error…"
            defaultSort={{ id: 'createdAt', dir: 'desc' }}
            exportFilename="webhooks_consi"
          />
        </CardContent>
      </Card>

      <p className="flex items-center gap-1.5 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
        <ArrowRight size={14} className="text-[var(--color-accent)]" />
        ¿Primera integración? Empieza por{' '}
        <Link href="/docs#intro" className="text-[var(--color-accent)] hover:underline">
          la documentación
        </Link>
        .
      </p>
    </div>
  );
}
