'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';
import { GATEWAYS, type BankAccount, type Currency, type Gateway, type Wallet } from '@/lib/types';

export default function PayoutsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [bankAccountId, setBankAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [gateway, setGateway] = useState<Gateway | ''>('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = () =>
    Promise.all([api.getBankAccounts(), api.getBalances()]).then(([a, w]) => {
      setAccounts(a);
      setWallets(w);
      if (a[0]) setBankAccountId((id) => id || a[0].id);
    });

  useEffect(() => { refresh(); }, []);

  const selected = accounts.find((a) => a.id === bankAccountId);
  const currency: Currency | undefined = selected?.currency;
  const wallet = wallets.find((w) => w.currency === currency);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !currency) return;
    setMessage(null);
    setLoading(true);
    try {
      const trx = await api.createPayout({
        currency,
        amount,
        bankAccountId,
        gateway: gateway || undefined,
        description: description || undefined,
      });
      setMessage({ kind: 'ok', text: `Payout creado (${trx.reference.slice(0, 12)}…) — estado ${trx.status}` });
      setAmount('');
      setDescription('');
      await refresh();
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Retiros (Payouts)</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base font-semibold text-[var(--foreground)]">Solicitar retiro</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Cuenta bancaria destino</Label>
                <Select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} required>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.bankName} · {a.currency} · {a.accountNumber}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Monto ({currency ?? '—'})</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
                {wallet ? (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Disponible: {formatMoney(wallet.available, wallet.currency)}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label>Gateway</Label>
                <Select value={gateway} onChange={(e) => setGateway(e.target.value as Gateway | '')}>
                  <option value="">Default</option>
                  {GATEWAYS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Descripción (opcional)</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              {message ? (
                <p className={message.kind === 'ok' ? 'text-sm text-green-600' : 'text-sm text-[var(--destructive)]'}>
                  {message.text}
                </p>
              ) : null}
              <Button type="submit" disabled={loading || !selected}>
                {loading ? 'Procesando…' : 'Solicitar retiro'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base font-semibold text-[var(--foreground)]">Saldos disponibles</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {wallets.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-md border border-[var(--border)] p-3">
                <span className="font-medium">{w.currency}</span>
                <span>{formatMoney(w.available, w.currency)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
