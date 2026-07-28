'use client';

/* Hallmark · genre: modern-minimal · theme: Cobalt (light + dark) · design-system: design.md
 * Terminals are an accounting surface, so the voice is the ledger's: hairline rows, mono
 * figures, money per currency and never a combined total.
 */

import { Building2, Plus, Smartphone, Store, Terminal as TerminalIcon, Globe } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Notice, PageHead } from '@/components/ui/page-head';
import { api } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';
import { METHOD_CATEGORIES } from '@/lib/payment-methods';
import { cn } from '@/lib/utils';
import type {
  Currency,
  PaymentMethod,
  Terminal,
  TerminalChannel,
  TerminalTotal,
} from '@/lib/types';

const CURRENCIES: Currency[] = ['USD', 'VES'];

export const CHANNEL_LABEL: Record<TerminalChannel, string> = {
  ECOMMERCE: 'Tienda web',
  POS: 'Punto de venta',
  MOBILE_APP: 'App móvil',
  LINK: 'Link de pago',
  API: 'API',
};

export const CHANNEL_ICON: Record<TerminalChannel, React.ComponentType<{ size?: number; className?: string }>> = {
  ECOMMERCE: Globe,
  POS: Store,
  MOBILE_APP: Smartphone,
  LINK: Building2,
  API: TerminalIcon,
};

const CHANNELS: TerminalChannel[] = ['ECOMMERCE', 'POS', 'MOBILE_APP', 'LINK', 'API'];

const chip = (on: boolean) =>
  cn(
    'inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-3 py-1.5 text-[length:var(--text-sm)]',
    'transition-colors duration-[var(--dur-fast)]',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]',
    on
      ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent)]'
      : 'border-[var(--color-rule)] text-[var(--color-ink-3)] hover:border-[var(--color-rule-2)] hover:text-[var(--color-ink)]',
  );

export default function TerminalsPage() {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = () =>
    api
      .getTerminals()
      .then(setTerminals)
      .catch(() => setTerminals([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex flex-col gap-[var(--space-md)]">
      <PageHead
        title="Terminales"
        lede="Cada terminal es un punto de venta: tu tienda web, tu app, tu caja física. Configuras los métodos una vez y separas la contabilidad por canal."
        action={
          <Button onClick={() => setCreating((v) => !v)}>
            <Plus size={15} /> Nueva terminal
          </Button>
        }
      />

      {creating ? (
        <TerminalForm
          onCancel={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false);
            await load();
          }}
        />
      ) : null}

      {loading ? (
        <p className="label">Cargando terminales…</p>
      ) : terminals.length === 0 ? (
        <Card className="p-[var(--space-md)]">
          <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
            Aún no tienes terminales.
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-[var(--space-sm)]">
          {terminals.map((t) => (
            <li key={t.id}>
              <TerminalCard terminal={t} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * One terminal as a readout: its reconciliation code, its channel, what it accepts, and
 * what it has actually taken in — one line per settlement asset.
 */
function TerminalCard({ terminal }: { terminal: Terminal }) {
  const Icon = CHANNEL_ICON[terminal.channel];
  return (
    <Card className="p-[var(--space-md)]">
      <div className="flex flex-wrap items-start justify-between gap-[var(--space-sm)]">
        <div className="flex min-w-0 items-start gap-[var(--space-xs)]">
          <span aria-hidden className="mt-0.5 flex shrink-0 text-[var(--color-ink-4)]">
            <Icon size={18} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/terminals/${terminal.id}`}
                className="text-[length:var(--text-md)] font-medium text-[var(--color-ink)] underline-offset-4 hover:underline"
              >
                {terminal.name}
              </Link>
              {terminal.active ? null : (
                <span className="rounded-[var(--radius-xs)] bg-[var(--color-paper-3)] px-1.5 py-px font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] uppercase tracking-[var(--tracking-mono-label)] text-[var(--color-ink-3)]">
                  Inactiva
                </span>
              )}
            </div>
            <p className="num mt-0.5 text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
              {terminal.fullCode} · {CHANNEL_LABEL[terminal.channel]}
              {terminal.defaultCurrency ? ` · ${terminal.defaultCurrency}` : ''}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-[var(--space-md)] text-right">
          <div>
            <p className="label">Cobros</p>
            <p className="num text-[length:var(--text-md)] text-[var(--color-ink)]">
              {terminal._count.transactions}
            </p>
          </div>
          <div>
            <p className="label">Sesiones</p>
            <p className="num text-[length:var(--text-md)] text-[var(--color-ink)]">
              {terminal._count.checkoutSessions}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-[var(--space-sm)] border-t border-[var(--color-rule)] pt-[var(--space-sm)]">
        <p className="label">Ingresos liquidados</p>
        <TotalsList totals={terminal.totals} />
      </div>

      <p className="mt-[var(--space-sm)] text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
        Acepta:{' '}
        {terminal.methods.length === 0
          ? 'ningún método configurado'
          : terminal.methods.map((m) => METHOD_LABEL[m] ?? m).join(' · ')}
      </p>
    </Card>
  );
}

const METHOD_LABEL: Partial<Record<PaymentMethod, string>> = Object.fromEntries(
  METHOD_CATEGORIES.flatMap((c) => c.methods).map((m) => [m.key, m.label]),
);

/**
 * Money per settlement asset. There is deliberately no grand total: USD, VES and USDT
 * are separate ledgers, and adding them would fabricate a rate.
 */
export function TotalsList({ totals }: { totals: TerminalTotal[] }) {
  if (totals.length === 0) {
    return (
      <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-ink-4)]">
        Sin cobros liquidados todavía.
      </p>
    );
  }
  return (
    <dl className="mt-1 flex flex-col">
      {totals.map((t) => (
        <div
          key={t.currency}
          className="flex flex-wrap items-baseline justify-between gap-x-[var(--space-sm)] border-b border-[var(--color-rule)] py-1.5 last:border-b-0"
        >
          <dt className="label shrink-0">{t.currency}</dt>
          <dd className="flex items-baseline gap-[var(--space-sm)]">
            <span className="num text-[length:var(--text-md)] font-medium text-[var(--color-ink)]">
              {formatMoney(t.gross, t.currency)}
            </span>
            {/* Net is what the merchant keeps — the figure that matters for their books. */}
            <span className="text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
              neto <span className="num">{formatMoney(t.net, t.currency)}</span> · {t.count}{' '}
              {t.count === 1 ? 'cobro' : 'cobros'}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Create a terminal. The code is not a field: the server allocates it. */
function TerminalForm({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<TerminalChannel>('ECOMMERCE');
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.createTerminal({
        name,
        channel,
        methods,
        defaultCurrency: defaultCurrency || undefined,
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-[var(--space-md)]">
      <form onSubmit={submit} className="flex flex-col gap-[var(--space-sm)]">
        <div className="grid gap-[var(--space-sm)] sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="terminal-name">Nombre</Label>
            <Input
              id="terminal-name"
              required
              placeholder="POS Sabana Grande"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Moneda por defecto (opcional)</Label>
            <div className="flex gap-2">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={defaultCurrency === c}
                  onClick={() => setDefaultCurrency((prev) => (prev === c ? '' : c))}
                  className={cn(chip(defaultCurrency === c), 'num flex-1 justify-center')}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Canal</Label>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((c) => {
              const Icon = CHANNEL_ICON[c];
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={channel === c}
                  onClick={() => setChannel(c)}
                  className={chip(channel === c)}
                >
                  <Icon size={14} />
                  {CHANNEL_LABEL[c]}
                </button>
              );
            })}
          </div>
          <p className="text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
            Sólo etiqueta cómo agrupar los ingresos. No cambia el comportamiento del cobro.
          </p>
        </div>

        <div className="flex flex-col gap-[var(--space-xs)]">
          <Label>Métodos que acepta esta terminal</Label>
          {METHOD_CATEGORIES.map(({ category, methods: catMethods }) => (
            <div key={category} className="flex flex-col gap-1.5">
              <p className="label">{category}</p>
              <div className="flex flex-wrap gap-2">
                {catMethods.map((m) => {
                  const on = methods.includes(m.key);
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setMethods((prev) =>
                          prev.includes(m.key)
                            ? prev.filter((x) => x !== m.key)
                            : [...prev, m.key],
                        )
                      }
                      className={chip(on)}
                    >
                      <Icon size={14} />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {error ? <Notice kind="err">{error}</Notice> : null}

        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={busy || !name.trim() || methods.length === 0}>
            {busy ? 'Creando…' : 'Crear terminal'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
