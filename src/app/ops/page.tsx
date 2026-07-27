'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

  const load = () =>
    Promise.all([api.opsGetAccounts(), api.opsGetNotifications(false)]).then(([a, n]) => {
      setAccounts(a);
      setAlerts(n);
    });

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : 'Error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-[var(--text-strong)]">Cuentas Consi (liquidez)</h1>
      {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}

      {alerts.length > 0 ? (
        <Card className="border-[var(--warning-600)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--warning-600)]">
              <AlertTriangle size={18} /> Alertas de saldo ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {alerts.map((n) => (
              <div key={n.id} className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] p-3">
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">{n.message}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {n.type === 'INSUFFICIENT_BALANCE' ? 'Saldo insuficiente' : 'Saldo bajo'} ·{' '}
                    {formatDate(n.createdAt)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await api.opsResolveNotification(n.id);
                    await load();
                  }}
                >
                  Resolver
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {accounts.map((a) => (
          <AccountCard key={a.id} account={a} onChanged={load} />
        ))}
      </div>

      <CreateAccountCard onCreated={load} />
    </div>
  );
}

function AccountCard({ account, onChanged }: { account: ConsiAccount; onChanged: () => Promise<void> }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [movements, setMovements] = useState<AccountMovement[] | null>(null);

  async function act(kind: 'fund' | 'adjust') {
    setBusy(true);
    setErr(null);
    try {
      if (kind === 'fund') await api.opsFundAccount(account.id, amount, note || undefined);
      else await api.opsAdjustAccount(account.id, amount, note || undefined);
      setAmount('');
      setNote('');
      await onChanged();
      if (movements) setMovements(await api.opsGetMovements(account.id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
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
    <Card className={account.lowBalance ? 'border-[var(--warning-600)]' : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{account.label}</span>
          <span className="text-xs font-normal text-[var(--text-muted)]">
            {account.currency} · {account.environment === 'LIVE' ? 'Real' : 'Prueba'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-[var(--text-muted)]">Saldo</p>
            <p className="text-lg font-bold text-[var(--foreground)]">
              {formatMoney(account.balance, account.currency)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--text-muted)]">Mínimo</p>
            <p className="text-sm">{formatMoney(account.minBalance, account.currency)}</p>
          </div>
        </div>
        {account.lowBalance ? (
          <p className="text-xs font-medium text-[var(--warning-600)]">Saldo por debajo del mínimo</p>
        ) : null}

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Monto</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" inputMode="decimal" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nota (opcional)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          {err ? <p className="text-xs text-[var(--destructive)]">{err}</p> : null}
          <div className="flex gap-2">
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
          <p className="text-xs text-[var(--text-muted)]">
            Ajuste acepta montos negativos (ej. -100) para corregir el saldo.
          </p>
        </div>

        {movements ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-4 text-center text-[var(--text-muted)]">
                    Sin movimientos.
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{MOVEMENT_LABEL[m.type] ?? m.type}</TableCell>
                    <TableCell>{formatMoney(m.amount, account.currency)}</TableCell>
                    <TableCell>{formatMoney(m.balanceAfter, account.currency)}</TableCell>
                    <TableCell className="text-xs text-[var(--text-muted)]">{formatDate(m.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
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
      await api.opsCreateAccount({
        label: form.label,
        currency: form.currency,
        environment: form.environment,
        balance: form.balance,
        minBalance: form.minBalance,
      });
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
    <Card>
      <CardHeader>
        <CardTitle>Nueva cuenta Consi</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-5">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Etiqueta</Label>
            <Input value={form.label} onChange={(e) => set('label', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Moneda</Label>
            <Select value={form.currency} onChange={(e) => set('currency', e.target.value as Currency)}>
              <option value="VES">VES</option>
              <option value="USD">USD</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Saldo inicial</Label>
            <Input value={form.balance} onChange={(e) => set('balance', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Saldo mínimo</Label>
            <Input value={form.minBalance} onChange={(e) => set('minBalance', e.target.value)} />
          </div>
          <div className="sm:col-span-5 flex items-center gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? 'Creando…' : 'Crear cuenta'}
            </Button>
            {msg ? (
              <span className={msg.kind === 'ok' ? 'text-sm text-green-600' : 'text-sm text-[var(--destructive)]'}>
                {msg.text}
              </span>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
