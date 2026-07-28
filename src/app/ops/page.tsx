'use client';

/* Hallmark · genre: modern-minimal · macrostructure: 05 Workbench
 * design-system: design.md · theme: Cobalt (light + dark)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Column, DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Notice, PageHead } from '@/components/ui/page-head';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api-client';
import { formatDate, formatMoney } from '@/lib/format';
import type {
  AccountMovement,
  ConsiAccount,
  Currency,
  Environment,
  OpsNotification,
} from '@/lib/types';

const MOVEMENT_LABEL: Record<string, string> = {
  FUNDING: 'Fondeo',
  WITHDRAWAL: 'Retiro',
  ADJUSTMENT: 'Ajuste',
};

export default function OpsPage() {
  const [accounts, setAccounts] = useState<ConsiAccount[]>([]);
  const [alerts, setAlerts] = useState<OpsNotification[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [a, n] = await Promise.all([api.opsGetAccounts(), api.opsGetNotifications(false)]);
    setAccounts(a);
    setAlerts(n);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : 'Error'));
  }, [load]);

  return (
    <div className="flex flex-col gap-[var(--space-md)]">
      <PageHead
        title="Liquidez"
        lede="Cuentas Consi que respaldan a las pasarelas, su saldo y sus movimientos."
      />

      {error ? <Notice kind="err">{error}</Notice> : null}

      {alerts.length > 0 ? (
        <Card className="border-[var(--color-warn)] p-[var(--space-md)]">
          <h2 className="mb-[var(--space-sm)] flex items-center gap-2 text-[length:var(--text-md)] text-[var(--color-warn)]">
            <AlertTriangle size={17} aria-hidden />
            Alertas de saldo ({alerts.length})
          </h2>
          <ul className="flex flex-col gap-1.5">
            {alerts.map((n) => (
              <li
                key={n.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--color-rule)] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-[length:var(--text-sm)] text-[var(--color-ink)]">{n.message}</p>
                  <p className="text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
                    {n.type === 'INSUFFICIENT_BALANCE' ? 'Saldo insuficiente' : 'Saldo bajo'} ·{' '}
                    {formatDate(n.createdAt)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => api.opsResolveNotification(n.id).then(load)}
                >
                  Resolver
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="grid gap-[var(--space-md)] xl:grid-cols-2">
        {accounts.map((a) => (
          <AccountCard key={a.id} account={a} onChanged={load} />
        ))}
      </div>

      <CreateAccountCard onCreated={load} />
    </div>
  );
}

function AccountCard({
  account,
  onChanged,
}: {
  account: ConsiAccount;
  onChanged: () => Promise<void>;
}) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movements, setMovements] = useState<AccountMovement[] | null>(null);

  const columns = useMemo<Column<AccountMovement>[]>(
    () => [
      {
        id: 'type',
        header: 'Tipo',
        value: (m) => m.type,
        text: (m) => MOVEMENT_LABEL[m.type] ?? m.type,
        cell: (m) => MOVEMENT_LABEL[m.type] ?? m.type,
      },
      {
        id: 'amount',
        header: 'Monto',
        num: true,
        value: (m) => Number(m.amount),
        text: (m) => formatMoney(m.amount, account.currency),
        cell: (m) => (
          <span className="text-[var(--color-ink)]">{formatMoney(m.amount, account.currency)}</span>
        ),
      },
      {
        id: 'balanceAfter',
        header: 'Saldo',
        num: true,
        value: (m) => Number(m.balanceAfter),
        text: (m) => formatMoney(m.balanceAfter, account.currency),
      },
      {
        id: 'note',
        header: 'Nota',
        value: (m) => m.note ?? '',
        cell: (m) => (
          <span className="block max-w-[20ch] truncate text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
            {m.note ?? '—'}
          </span>
        ),
      },
      {
        id: 'createdAt',
        header: 'Fecha',
        num: true,
        value: (m) => m.createdAt,
        text: (m) => formatDate(m.createdAt),
        cell: (m) => (
          <span className="whitespace-nowrap text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
            {formatDate(m.createdAt)}
          </span>
        ),
      },
    ],
    [account.currency],
  );

  async function act(kind: 'fund' | 'adjust') {
    setBusy(true);
    setError(null);
    try {
      if (kind === 'fund') await api.opsFundAccount(account.id, amount, note || undefined);
      else await api.opsAdjustAccount(account.id, amount, note || undefined);
      setAmount('');
      setNote('');
      await onChanged();
      if (movements) setMovements(await api.opsGetMovements(account.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function toggleMovements() {
    if (movements) {
      setMovements(null);
      return;
    }
    setMovements(await api.opsGetMovements(account.id));
  }

  return (
    <Card
      className={`flex flex-col gap-[var(--space-sm)] p-[var(--space-md)] ${account.lowBalance ? 'border-[var(--color-warn)]' : ''}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[length:var(--text-md)]">{account.label}</h2>
        <span className="label">
          {account.currency} · {account.environment === 'LIVE' ? 'Real' : 'Prueba'}
        </span>
      </div>

      <dl className="flex items-end justify-between gap-3">
        <div>
          <dt className="label">Saldo</dt>
          <dd className="num mt-0.5 text-[length:var(--text-lg)] text-[var(--color-ink)]">
            {formatMoney(account.balance, account.currency)}
          </dd>
        </div>
        <div className="text-right">
          <dt className="label">Mínimo</dt>
          <dd className="num mt-0.5 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
            {formatMoney(account.minBalance, account.currency)}
          </dd>
        </div>
      </dl>

      {account.lowBalance ? (
        <Notice kind="warn">El saldo está por debajo del mínimo configurado.</Notice>
      ) : null}

      <div className="grid gap-[var(--space-sm)] sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`amount-${account.id}`}>Monto</Label>
          <Input
            id={`amount-${account.id}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            inputMode="decimal"
            className="num"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`note-${account.id}`}>Nota (opcional)</Label>
          <Input
            id={`note-${account.id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      {error ? <Notice kind="err">{error}</Notice> : null}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy || !amount} onClick={() => act('fund')}>
          Fondear
        </Button>
        <Button size="sm" variant="outline" disabled={busy || !amount} onClick={() => act('adjust')}>
          Ajustar (±)
        </Button>
        <Button size="sm" variant="outline" onClick={toggleMovements}>
          {movements ? 'Ocultar movimientos' : 'Ver movimientos'}
        </Button>
      </div>
      <p className="text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
        Ajustar acepta montos negativos (por ejemplo <span className="num">-100</span>) para corregir
        el saldo.
      </p>

      {movements ? (
        <DataTable
          id={`ops-movements-${account.currency}`}
          caption={`Movimientos de ${account.label}`}
          columns={columns}
          rows={movements}
          rowKey={(m) => m.id}
          empty="Sin movimientos."
          searchPlaceholder="Buscar por nota o tipo…"
          defaultSort={{ id: 'createdAt', dir: 'desc' }}
          pageSize={10}
          exportFilename={`movimientos_${account.label.toLowerCase().replace(/\s+/g, '_')}`}
        />
      ) : null}
    </Card>
  );
}

function CreateAccountCard({ onCreated }: { onCreated: () => Promise<void> }) {
  const [form, setForm] = useState({
    label: '',
    currency: 'VES' as Currency,
    environment: 'TEST' as Environment,
    balance: '0',
    minBalance: '0',
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api.opsCreateAccount(form);
      setForm({ label: '', currency: 'VES', environment: 'TEST', balance: '0', minBalance: '0' });
      await onCreated();
      setMsg({ kind: 'ok', text: 'Cuenta creada.' });
    } catch (err) {
      setMsg({ kind: 'err', text: err instanceof Error ? err.message : 'Error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-[var(--space-md)]">
      <h2 className="mb-[var(--space-sm)] text-[length:var(--text-md)]">Nueva cuenta Consi</h2>
      <form onSubmit={submit} className="flex flex-col gap-[var(--space-sm)]">
        <div className="grid gap-[var(--space-sm)] sm:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col gap-1.5 lg:col-span-2">
            <Label htmlFor="acc-label">Etiqueta</Label>
            <Input
              id="acc-label"
              value={form.label}
              onChange={(e) => set('label', e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acc-currency">Moneda</Label>
            <Select
              id="acc-currency"
              value={form.currency}
              onChange={(e) => set('currency', e.target.value as Currency)}
            >
              <option value="VES">VES</option>
              <option value="USD">USD</option>
              <option value="USDT">USDT</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acc-balance">Saldo inicial</Label>
            <Input
              id="acc-balance"
              value={form.balance}
              onChange={(e) => set('balance', e.target.value)}
              inputMode="decimal"
              className="num"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acc-min">Saldo mínimo</Label>
            <Input
              id="acc-min"
              value={form.minBalance}
              onChange={(e) => set('minBalance', e.target.value)}
              inputMode="decimal"
              className="num"
            />
          </div>
        </div>
        {msg ? <Notice kind={msg.kind}>{msg.text}</Notice> : null}
        <div>
          <Button type="submit" disabled={busy}>
            {busy ? 'Creando…' : 'Crear cuenta'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
