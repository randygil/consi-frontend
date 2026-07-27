'use client';

import { Check, Copy, ExternalLink, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Notice, PageHead } from '@/components/ui/page-head';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Currency, PaymentLinkSummary, PaymentMethod } from '@/lib/types';

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'PAGO_MOVIL', label: 'Pago Móvil' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'USDT', label: 'USDT' },
  { value: 'CARD', label: 'Tarjeta' },
];
const CURRENCIES: Currency[] = ['USD', 'VES'];

const LINK_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activo',
  PAID: 'Pagado',
  EXPIRED: 'Expirado',
  CANCELLED: 'Cancelado',
};

/** Shared voice for the selectable chips: hairline off, accent-tinted on. */
const chip = (on: boolean) =>
  cn(
    'inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-3 py-1.5 text-[length:var(--text-sm)]',
    'transition-colors duration-[var(--dur-fast)]',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]',
    on
      ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent)]'
      : 'border-[var(--color-rule)] text-[var(--color-ink-3)] hover:border-[var(--color-rule-2)] hover:text-[var(--color-ink)]',
  );

export default function LinksPage() {
  const [links, setLinks] = useState<PaymentLinkSummary[]>([]);
  const [creating, setCreating] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [description, setDescription] = useState('');
  const [methods, setMethods] = useState<PaymentMethod[]>(['PAGO_MOVIL', 'TRANSFER', 'USDT', 'CARD']);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.getPaymentLinks().then(setLinks).catch(() => setLinks([]));
  useEffect(() => {
    load();
  }, []);

  function toggleMethod(m: PaymentMethod) {
    setMethods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.createPaymentLink({
        amount,
        currency,
        description: description || undefined,
        methods,
      });
      setAmount('');
      setDescription('');
      setCreating(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-[var(--space-md)]">
      <PageHead
        title="Links de pago"
        lede="Crea un link y compártelo, o incrústalo en tu web. Tus clientes pagan sin salir."
        action={
          <Button onClick={() => setCreating((v) => !v)}>
            <Plus size={15} /> Crear link
          </Button>
        }
      />

      {creating && (
        <Card className="p-[var(--space-md)]">
          <form onSubmit={create} className="flex flex-col gap-[var(--space-sm)]">
            <div className="grid gap-[var(--space-sm)] sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="amount">Monto</Label>
                <Input
                  id="amount"
                  required
                  inputMode="decimal"
                  placeholder="25.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="num"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Moneda</Label>
                <div className="flex gap-2">
                  {CURRENCIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={currency === c}
                      onClick={() => setCurrency(c)}
                      className={cn(chip(currency === c), 'num flex-1 justify-center')}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Input
                id="description"
                placeholder="Suscripción mensual — Plan Pro"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Métodos de pago</Label>
              <div className="flex flex-wrap gap-2">
                {METHODS.map((m) => {
                  const on = methods.includes(m.value);
                  return (
                    <button
                      key={m.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleMethod(m.value)}
                      className={chip(on)}
                    >
                      {on ? <Check size={13} /> : null}
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {error ? <Notice kind="err">{error}</Notice> : null}

            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={busy || methods.length === 0}>
                {busy ? 'Creando…' : 'Crear link'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setCreating(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-[var(--space-md)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-[var(--space-lg)] text-center text-[var(--color-ink-3)]">
                  Aún no has creado links de pago.
                </TableCell>
              </TableRow>
            ) : (
              links.map((l) => (
                <TableRow key={l.token}>
                  <TableCell className="text-[var(--color-ink)]">{l.description ?? '—'}</TableCell>
                  <TableCell className="num text-right text-[var(--color-ink)]">
                    {formatMoney(l.amount, l.currency)}
                  </TableCell>
                  <TableCell>
                    <LinkStatusBadge status={l.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <LinkActions url={l.url} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function LinkStatusBadge({ status }: { status: string }) {
  const tone =
    status === 'PAID'
      ? 'bg-[var(--color-ok-soft)] text-[var(--color-ok)]'
      : status === 'ACTIVE'
        ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
        : 'bg-[var(--color-paper-3)] text-[var(--color-ink-3)]';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] font-medium uppercase tracking-[var(--tracking-mono-label)] ${tone}`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {LINK_STATUS_LABEL[status] ?? status}
    </span>
  );
}

function LinkActions({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${url}` : url;
  const iconBtn =
    'flex size-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-rule)] text-[var(--color-ink-3)] transition-colors duration-[var(--dur-fast)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]';
  return (
    <div className="flex justify-end gap-1.5">
      <button
        type="button"
        aria-label="Copiar URL del link"
        className={iconBtn}
        onClick={() => {
          navigator.clipboard.writeText(fullUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
      >
        {copied ? <Check size={14} className="text-[var(--color-ok)]" /> : <Copy size={14} />}
      </button>
      <a href={url} target="_blank" rel="noreferrer" aria-label="Abrir checkout" className={iconBtn}>
        <ExternalLink size={14} />
      </a>
    </div>
  );
}
