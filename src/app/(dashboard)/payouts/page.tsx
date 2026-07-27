'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Notice, PageHead } from '@/components/ui/page-head';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';
import { GATEWAYS, type BankAccount, type Currency, type Gateway, type Wallet } from '@/lib/types';

const ACCOUNT_STATUS: Record<BankAccount['status'], { label: string; tone: string }> = {
  APPROVED: { label: 'Aprobada', tone: 'text-[var(--color-ok)] bg-[var(--color-ok-soft)]' },
  PENDING: { label: 'Pendiente', tone: 'text-[var(--color-warn)] bg-[var(--color-warn-soft)]' },
  REJECTED: { label: 'Rechazada', tone: 'text-[var(--color-bad)] bg-[var(--color-bad-soft)]' },
};

export default function PayoutsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);

  const [bankAccountId, setBankAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [gateway, setGateway] = useState<Gateway | ''>('');
  const [payoutMode, setPayoutMode] = useState<'INSTANT' | 'MANUAL'>('INSTANT');
  const [description, setDescription] = useState('');
  const [payoutMessage, setPayoutMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);

  const [regBankName, setRegBankName] = useState('');
  const [regAccountNumber, setRegAccountNumber] = useState('');
  const [regAccountHolder, setRegAccountHolder] = useState('');
  const [regCurrency, setRegCurrency] = useState<Currency>('USD');
  const [regIsDefault, setRegIsDefault] = useState(false);
  const [regMessage, setRegMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [regLoading, setRegLoading] = useState(false);

  const refresh = () =>
    Promise.all([api.getBankAccounts(), api.getBalances()]).then(([a, w]) => {
      setAccounts(a);
      setWallets(w);

      // Auto-select first APPROVED bank account in the payout form
      const approvedAccounts = a.filter((acc) => acc.status === 'APPROVED');
      if (approvedAccounts.length > 0) {
        setBankAccountId((id) => {
          const stillExists = approvedAccounts.some((acc) => acc.id === id);
          return stillExists ? id : approvedAccounts[0].id;
        });
      } else {
        setBankAccountId('');
      }
    });

  useEffect(() => {
    refresh();
  }, []);

  const approvedAccounts = accounts.filter((a) => a.status === 'APPROVED');
  const selected = approvedAccounts.find((a) => a.id === bankAccountId);
  const currency: Currency | undefined = selected?.currency;
  const wallet = wallets.find((w) => w.currency === currency);

  async function onSubmitPayout(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !currency) return;
    setPayoutMessage(null);
    setPayoutLoading(true);
    try {
      const trx = await api.createPayout({
        currency,
        amount,
        bankAccountId,
        gateway: gateway || undefined,
        description: description || undefined,
        payoutMode,
      } as any);

      setPayoutMessage({
        kind: 'ok',
        text: `Retiro ${trx.reference.slice(0, 12)}… creado — ${trx.status}${
          payoutMode === 'MANUAL' ? ', pendiente de aprobación' : ''
        }.`,
      });
      setAmount('');
      setDescription('');
      await refresh();
    } catch (err) {
      setPayoutMessage({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Error al solicitar el retiro',
      });
    } finally {
      setPayoutLoading(false);
    }
  }

  async function onSubmitRegisterBank(e: React.FormEvent) {
    e.preventDefault();
    setRegMessage(null);
    setRegLoading(true);
    try {
      await api.addBankAccount({
        bankName: regBankName,
        accountNumber: regAccountNumber,
        accountHolder: regAccountHolder,
        currency: regCurrency,
        isDefault: regIsDefault,
      });
      setRegMessage({
        kind: 'ok',
        text: 'Cuenta registrada. Queda pendiente de aprobación del administrador.',
      });
      setRegBankName('');
      setRegAccountNumber('');
      setRegAccountHolder('');
      setRegIsDefault(false);
      await refresh();
    } catch (err) {
      setRegMessage({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Error al registrar la cuenta bancaria',
      });
    } finally {
      setRegLoading(false);
    }
  }

  async function onSetDefaultAccount(id: string) {
    try {
      await api.setDefaultBankAccount(id);
      await refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al establecer cuenta como principal');
    }
  }

  return (
    <div className="flex flex-col gap-[var(--space-md)]">
      <PageHead
        title="Retiros"
        lede="Envía tu saldo disponible a una cuenta bancaria aprobada."
      />

      {/* Balances lead — you decide how much to withdraw by reading them first. */}
      <div className="grid gap-[var(--space-sm)] sm:grid-cols-2">
        {wallets.map((w) => (
          <Card key={w.id} className="flex items-baseline justify-between p-[var(--space-sm)]">
            <span className="label">Disponible · {w.currency}</span>
            <span className="num text-[length:var(--text-lg)] font-medium text-[var(--color-ink)]">
              {formatMoney(w.available, w.currency)}
            </span>
          </Card>
        ))}
      </div>

      <div className="grid gap-[var(--space-md)] lg:grid-cols-2">
        <div className="flex flex-col gap-[var(--space-md)]">
          <Card>
            <CardHeader>
              <CardTitle>Solicitar retiro</CardTitle>
            </CardHeader>
            <CardContent>
              {approvedAccounts.length === 0 ? (
                <p className="rounded-[var(--radius-sm)] border border-dashed border-[var(--color-rule-2)] p-[var(--space-sm)] text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                  Registra una cuenta bancaria y espera su aprobación antes de solicitar retiros.
                </p>
              ) : (
                <form onSubmit={onSubmitPayout} className="flex flex-col gap-[var(--space-sm)]">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="dest">Cuenta destino</Label>
                    <Select
                      id="dest"
                      value={bankAccountId}
                      onChange={(e) => setBankAccountId(e.target.value)}
                      required
                    >
                      {approvedAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.bankName} · {a.currency} · {a.accountNumber}
                          {a.isDefault ? ' (Principal)' : ''}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="payout-amount">Monto {currency ? `· ${currency}` : ''}</Label>
                    <Input
                      id="payout-amount"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className="num"
                    />
                    {wallet ? (
                      <p className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                        Disponible{' '}
                        <span className="num text-[var(--color-ink)]">
                          {formatMoney(wallet.available, wallet.currency)}
                        </span>
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-[var(--space-sm)] sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="mode">Modo</Label>
                      <Select
                        id="mode"
                        value={payoutMode}
                        onChange={(e) => setPayoutMode(e.target.value as 'INSTANT' | 'MANUAL')}
                      >
                        <option value="INSTANT">Instantáneo</option>
                        <option value="MANUAL">Manual — aprobación</option>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="gw">Pasarela</Label>
                      <Select
                        id="gw"
                        value={gateway}
                        onChange={(e) => setGateway(e.target.value as Gateway | '')}
                      >
                        <option value="">Por defecto</option>
                        {GATEWAYS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="payout-desc">Descripción (opcional)</Label>
                    <Input
                      id="payout-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Retiro de caja chica"
                    />
                  </div>

                  {payoutMessage ? (
                    <Notice kind={payoutMessage.kind}>{payoutMessage.text}</Notice>
                  ) : null}

                  <Button type="submit" disabled={payoutLoading || !selected}>
                    {payoutLoading ? 'Procesando…' : 'Solicitar retiro'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Registrar cuenta bancaria</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmitRegisterBank} className="flex flex-col gap-[var(--space-sm)]">
                <div className="grid gap-[var(--space-sm)] sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="reg-cur">Moneda</Label>
                    <Select
                      id="reg-cur"
                      value={regCurrency}
                      onChange={(e) => setRegCurrency(e.target.value as Currency)}
                    >
                      <option value="USD">USD</option>
                      <option value="VES">VES</option>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="reg-bank">Banco</Label>
                    <Input
                      id="reg-bank"
                      type="text"
                      placeholder="Bancamiga, Banesco…"
                      value={regBankName}
                      onChange={(e) => setRegBankName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reg-holder">Titular</Label>
                  <Input
                    id="reg-holder"
                    type="text"
                    placeholder="Nombre o razón social"
                    value={regAccountHolder}
                    onChange={(e) => setRegAccountHolder(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reg-num">Número de cuenta · 20 dígitos</Label>
                  <Input
                    id="reg-num"
                    type="text"
                    inputMode="numeric"
                    placeholder="0172…"
                    value={regAccountNumber}
                    onChange={(e) => setRegAccountNumber(e.target.value)}
                    required
                    className="num"
                  />
                </div>

                <label
                  htmlFor="regIsDefault"
                  className="flex cursor-pointer items-center gap-2.5 text-[length:var(--text-sm)] text-[var(--color-ink-2)]"
                >
                  <input
                    type="checkbox"
                    id="regIsDefault"
                    checked={regIsDefault}
                    onChange={(e) => setRegIsDefault(e.target.checked)}
                    className="size-4 shrink-0 accent-[var(--color-accent)]"
                  />
                  Usar como cuenta principal de esta moneda
                </label>

                {regMessage ? <Notice kind={regMessage.kind}>{regMessage.text}</Notice> : null}

                <Button type="submit" disabled={regLoading}>
                  {regLoading ? 'Registrando…' : 'Registrar cuenta'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Mis cuentas</CardTitle>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                No tienes cuentas bancarias registradas.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-rule)]">
                {accounts.map((a) => {
                  const s = ACCOUNT_STATUS[a.status];
                  return (
                    <li
                      key={a.id}
                      className="flex items-start justify-between gap-[var(--space-sm)] py-[var(--space-xs)] first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[length:var(--text-sm)] font-medium text-[var(--color-ink)]">
                            {a.bankName}
                          </span>
                          <span className="label">{a.currency}</span>
                          {a.isDefault ? (
                            <span className="rounded-[var(--radius-xs)] bg-[var(--color-accent-soft)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] uppercase tracking-[var(--tracking-mono-label)] text-[var(--color-accent)]">
                              Principal
                            </span>
                          ) : null}
                        </div>
                        <p className="num mt-1 truncate text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                          {a.accountNumber}
                        </p>
                        <p className="truncate text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
                          {a.accountHolder}
                        </p>
                        <span
                          className={`mt-1.5 inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] font-medium uppercase tracking-[var(--tracking-mono-label)] ${s.tone}`}
                        >
                          <span className="size-1.5 rounded-full bg-current" aria-hidden />
                          {s.label}
                        </span>
                      </div>

                      {!a.isDefault && a.status === 'APPROVED' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSetDefaultAccount(a.id)}
                          className="shrink-0"
                        >
                          Hacer principal
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
