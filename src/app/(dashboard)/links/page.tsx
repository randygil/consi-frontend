'use client';

import { Check, Copy, ExternalLink, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';
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
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-strong)]">
            Links de pago
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--text-subtle)]">
            Crea un link y compártelo, o incrústalo en tu web. Tus clientes pagan sin salir.
          </p>
        </div>
        <Button onClick={() => setCreating((v) => !v)}>
          <Plus size={16} /> Crear link
        </Button>
      </div>

      {creating && (
        <Card className="p-[22px]">
          <CardContent className="p-0">
            <form onSubmit={create} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="amount">Monto</Label>
                  <Input
                    id="amount"
                    required
                    inputMode="decimal"
                    placeholder="25.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Moneda</Label>
                  <div className="flex gap-2">
                    {CURRENCIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCurrency(c)}
                        className={
                          currency === c
                            ? 'flex-1 rounded-[var(--radius-sm)] border border-[var(--blue-400)] bg-[var(--blue-50)] py-2.5 text-sm font-bold text-[var(--blue-700)]'
                            : 'flex-1 rounded-[var(--radius-sm)] border border-[var(--ink-150)] py-2.5 text-sm font-semibold text-[var(--text-muted)] hover:border-[var(--blue-300)]'
                        }
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Input
                  id="description"
                  placeholder="Suscripción mensual — Plan Pro"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Métodos de pago</Label>
                <div className="flex flex-wrap gap-2">
                  {METHODS.map((m) => {
                    const on = methods.includes(m.value);
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => toggleMethod(m.value)}
                        className={
                          on
                            ? 'inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--blue-400)] bg-[var(--blue-50)] px-3.5 py-1.5 text-[13px] font-bold text-[var(--blue-700)]'
                            : 'inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--ink-150)] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--text-muted)] hover:border-[var(--blue-300)]'
                        }
                      >
                        {on ? <Check size={13} /> : null}
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error ? <p className="text-sm text-[var(--danger-600)]">{error}</p> : null}

              <div className="flex gap-2">
                <Button type="submit" disabled={busy || methods.length === 0}>
                  {busy ? 'Creando…' : 'Crear link'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setCreating(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="p-[22px]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.length === 0 ? (
                <TableRow>
                  <TableCell className="text-[var(--text-muted)]">
                    Aún no has creado links de pago.
                  </TableCell>
                </TableRow>
              ) : (
                links.map((l) => (
                  <TableRow key={l.token}>
                    <TableCell className="font-semibold text-[var(--text-strong)]">
                      {l.description ?? '—'}
                    </TableCell>
                    <TableCell className="font-mono">{formatMoney(l.amount, l.currency)}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}

function LinkStatusBadge({ status }: { status: string }) {
  const tone =
    status === 'PAID'
      ? 'bg-[var(--success-100)] text-[var(--success-600)]'
      : status === 'ACTIVE'
        ? 'bg-[var(--blue-100)] text-[var(--blue-700)]'
        : 'bg-[var(--ink-100)] text-[var(--text-muted)]';
  return (
    <span
      className={`inline-flex items-center rounded-[var(--radius-pill)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] ${tone}`}
    >
      {LINK_STATUS_LABEL[status] ?? status}
    </span>
  );
}

function LinkActions({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${url}` : url;
  const iconBtn =
    'flex size-9 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--ink-150)] text-[var(--text-muted)] transition-colors hover:border-[var(--blue-300)] hover:text-[var(--blue-700)]';
  return (
    <div className="flex justify-end gap-1.5">
      <button
        type="button"
        aria-label="Copiar URL"
        className={iconBtn}
        onClick={() => {
          navigator.clipboard.writeText(fullUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
      >
        {copied ? <Check size={15} className="text-[var(--success-600)]" /> : <Copy size={15} />}
      </button>
      <a href={url} target="_blank" rel="noreferrer" aria-label="Abrir checkout" className={iconBtn}>
        <ExternalLink size={15} />
      </a>
    </div>
  );
}
