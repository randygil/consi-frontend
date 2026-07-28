'use client';

/* Hallmark · genre: modern-minimal · macrostructure: 05 Workbench
 * design-system: design.md · theme: Cobalt (light + dark)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Column, DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Notice, PageHead } from '@/components/ui/page-head';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api-client';
import { formatDate, formatMoney, statusLabel } from '@/lib/format';
import type { BankAccount, Currency, Transaction, Wallet } from '@/lib/types';

const ACCOUNT_STATUS: Record<BankAccount['status'], { text: string; tone: string }> = {
  APPROVED: { text: 'Aprobada', tone: 'text-[var(--color-ok)] bg-[var(--color-ok-soft)]' },
  PENDING: { text: 'Pendiente', tone: 'text-[var(--color-warn)] bg-[var(--color-warn-soft)]' },
  REJECTED: { text: 'Rechazada', tone: 'text-[var(--color-bad)] bg-[var(--color-bad-soft)]' },
};

const COLUMNS: Column<Transaction>[] = [
  {
    id: 'reference',
    header: 'Referencia',
    num: true,
    align: 'left',
    value: (t) => t.reference,
    cell: (t) => (
      <span className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
        {t.reference.slice(0, 14)}
      </span>
    ),
  },
  { id: 'currency', header: 'Moneda', num: true, align: 'left', value: (t) => t.currency },
  {
    id: 'amount',
    header: 'Monto',
    num: true,
    value: (t) => Number(t.amount),
    text: (t) => formatMoney(t.amount, t.currency),
    cell: (t) => <span className="text-[var(--color-ink)]">{formatMoney(t.amount, t.currency)}</span>,
  },
  {
    id: 'fee',
    header: 'Comisión',
    num: true,
    value: (t) => (t.feeAmount ? Number(t.feeAmount) : null),
    text: (t) => (t.feeAmount ? formatMoney(t.feeAmount, t.currency) : '—'),
  },
  {
    id: 'net',
    header: 'Neto transferido',
    num: true,
    value: (t) => (t.netAmount ? Number(t.netAmount) : null),
    text: (t) => (t.netAmount ? formatMoney(t.netAmount, t.currency) : '—'),
  },
  {
    id: 'description',
    header: 'Destino',
    value: (t) => t.description ?? 'Retiro directo',
    cell: (t) => (
      <span className="block max-w-[24ch] truncate text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
        {t.description ?? 'Retiro directo'}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Estado',
    value: (t) => t.status,
    text: (t) => statusLabel(t.status),
    cell: (t) => <StatusBadge status={t.status} />,
  },
  {
    id: 'createdAt',
    header: 'Fecha',
    num: true,
    value: (t) => t.createdAt,
    text: (t) => formatDate(t.createdAt),
    cell: (t) => (
      <span className="whitespace-nowrap text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
        {formatDate(t.createdAt)}
      </span>
    ),
  },
];

export default function PayoutsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [payouts, setPayouts] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', currency: '' });

  const [bankAccountId, setBankAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [payoutMsg, setPayoutMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [payoutBusy, setPayoutBusy] = useState(false);

  const [reg, setReg] = useState({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    currency: 'USD' as Currency,
    isDefault: false,
  });
  const [regMsg, setRegMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [regBusy, setRegBusy] = useState(false);

  const params = useMemo(() => {
    const p: Record<string, string> = { type: 'PAYOUT' };
    if (filters.status) p.status = filters.status;
    if (filters.currency) p.currency = filters.currency;
    return p;
  }, [filters]);

  const refresh = useCallback(async () => {
    const [a, w] = await Promise.all([api.getBankAccounts(), api.getBalances()]);
    setAccounts(a);
    setWallets(w);
    const approved = a.filter((acc) => acc.status === 'APPROVED');
    setBankAccountId((id) =>
      approved.some((acc) => acc.id === id) ? id : (approved[0]?.id ?? ''),
    );
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  useEffect(() => {
    setLoading(true);
    api
      .getTransactions(params)
      .then(setPayouts)
      .catch(() => setPayouts([]))
      .finally(() => setLoading(false));
  }, [params]);

  const approved = accounts.filter((a) => a.status === 'APPROVED');
  const selected = approved.find((a) => a.id === bankAccountId);
  const wallet = wallets.find((w) => w.currency === selected?.currency);

  async function submitPayout(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setPayoutMsg(null);
    setPayoutBusy(true);
    try {
      const trx = await api.createPayout({
        currency: selected.currency,
        amount,
        bankAccountId,
        description: description || undefined,
      } as Parameters<typeof api.createPayout>[0]);
      setPayoutMsg({
        kind: 'ok',
        text: `Retiro ${trx.reference.slice(0, 12)}… creado · ${statusLabel(trx.status)}`,
      });
      setAmount('');
      setDescription('');
      await refresh();
      setPayouts(await api.getTransactions(params));
    } catch (err) {
      setPayoutMsg({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Error al solicitar el retiro',
      });
    } finally {
      setPayoutBusy(false);
    }
  }

  async function submitBank(e: React.FormEvent) {
    e.preventDefault();
    setRegMsg(null);
    setRegBusy(true);
    try {
      await api.addBankAccount(reg);
      setRegMsg({
        kind: 'ok',
        text: 'Cuenta registrada. Un administrador debe aprobarla antes de usarla.',
      });
      setReg({
        bankName: '',
        accountNumber: '',
        accountHolder: '',
        currency: 'USD',
        isDefault: false,
      });
      await refresh();
    } catch (err) {
      setRegMsg({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Error al registrar la cuenta',
      });
    } finally {
      setRegBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-[var(--space-md)]">
      <PageHead
        title="Retiros"
        lede="Solicita transferencias a tus cuentas aprobadas y revisa el histórico de dispersiones."
      />

      <div className="grid gap-[var(--space-md)] lg:grid-cols-2">
        <div className="flex flex-col gap-[var(--space-md)]">
          <Card className="p-[var(--space-md)]">
            <h2 className="mb-[var(--space-sm)] text-[length:var(--text-md)]">Solicitar retiro</h2>
            {approved.length === 0 ? (
              <p className="rounded-[var(--radius-sm)] border border-dashed border-[var(--color-rule)] p-[var(--space-md)] text-center text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                Registra una cuenta bancaria y espera su aprobación antes de solicitar retiros.
              </p>
            ) : (
              <form onSubmit={submitPayout} className="flex flex-col gap-[var(--space-sm)]">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="dest">Cuenta destino</Label>
                  <Select
                    id="dest"
                    value={bankAccountId}
                    onChange={(e) => setBankAccountId(e.target.value)}
                    required
                  >
                    {approved.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.bankName} · {a.currency} · {a.accountNumber}
                        {a.isDefault ? ' (principal)' : ''}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="payout-amount">Monto ({selected?.currency ?? '—'})</Label>
                  <Input
                    id="payout-amount"
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
                      <span className="num">{formatMoney(wallet.available, wallet.currency)}</span>
                    </p>
                  ) : null}
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
                {payoutMsg ? <Notice kind={payoutMsg.kind}>{payoutMsg.text}</Notice> : null}
                <div>
                  <Button type="submit" disabled={payoutBusy || !selected}>
                    {payoutBusy ? 'Procesando…' : 'Solicitar retiro'}
                  </Button>
                </div>
              </form>
            )}
          </Card>

          <Card className="p-[var(--space-md)]">
            <h2 className="mb-[var(--space-sm)] text-[length:var(--text-md)]">
              Registrar cuenta bancaria
            </h2>
            <form onSubmit={submitBank} className="flex flex-col gap-[var(--space-sm)]">
              <div className="grid gap-[var(--space-sm)] sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reg-currency">Moneda</Label>
                  <Select
                    id="reg-currency"
                    value={reg.currency}
                    onChange={(e) => setReg((r) => ({ ...r, currency: e.target.value as Currency }))}
                  >
                    <option value="USD">USD</option>
                    <option value="VES">VES</option>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reg-bank">Banco</Label>
                  <Input
                    id="reg-bank"
                    value={reg.bankName}
                    onChange={(e) => setReg((r) => ({ ...r, bankName: e.target.value }))}
                    placeholder="Bancamiga, Banesco…"
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reg-holder">Titular</Label>
                <Input
                  id="reg-holder"
                  value={reg.accountHolder}
                  onChange={(e) => setReg((r) => ({ ...r, accountHolder: e.target.value }))}
                  placeholder="Nombre o razón social"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reg-number">Número de cuenta (20 dígitos)</Label>
                <Input
                  id="reg-number"
                  inputMode="numeric"
                  value={reg.accountNumber}
                  onChange={(e) => setReg((r) => ({ ...r, accountNumber: e.target.value }))}
                  placeholder="0172…"
                  required
                  className="num"
                />
              </div>
              <label
                htmlFor="reg-default"
                className="flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-sm)] border border-[var(--color-rule)] p-2.5 transition-colors duration-[var(--dur-fast)] hover:border-[var(--color-rule-2)]"
              >
                <input
                  type="checkbox"
                  id="reg-default"
                  checked={reg.isDefault}
                  onChange={(e) => setReg((r) => ({ ...r, isDefault: e.target.checked }))}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent)]"
                />
                <span className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
                  Cuenta principal para esta moneda
                </span>
              </label>
              {regMsg ? <Notice kind={regMsg.kind}>{regMsg.text}</Notice> : null}
              <div>
                <Button type="submit" disabled={regBusy}>
                  {regBusy ? 'Registrando…' : 'Registrar cuenta'}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <div className="flex flex-col gap-[var(--space-md)]">
          <Card className="p-[var(--space-md)]">
            <h2 className="mb-[var(--space-sm)] text-[length:var(--text-md)]">Saldos disponibles</h2>
            <dl className="flex flex-col gap-1.5">
              {wallets.length === 0 ? (
                <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">Sin saldos.</p>
              ) : (
                wallets.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--color-rule)] px-3 py-2.5"
                  >
                    <dt className="num text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                      {w.currency}
                    </dt>
                    <dd className="num text-[length:var(--text-sm)] text-[var(--color-ink)]">
                      {formatMoney(w.available, w.currency)}
                    </dd>
                  </div>
                ))
              )}
            </dl>
          </Card>

          <Card className="p-[var(--space-md)]">
            <h2 className="mb-[var(--space-sm)] text-[length:var(--text-md)]">Mis cuentas</h2>
            {accounts.length === 0 ? (
              <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                No tienes cuentas registradas.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-rule)]">
                {accounts.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-1.5 text-[length:var(--text-sm)] font-medium text-[var(--color-ink)]">
                        {a.bankName}
                        <span className="label">{a.currency}</span>
                        {a.isDefault ? (
                          <span className="rounded-[var(--radius-xs)] bg-[var(--color-accent-soft)] px-1.5 py-px font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] uppercase tracking-[var(--tracking-mono-label)] text-[var(--color-accent)]">
                            Principal
                          </span>
                        ) : null}
                      </p>
                      <p className="num truncate text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                        {a.accountNumber}
                      </p>
                      <p className="truncate text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
                        {a.accountHolder}
                      </p>
                      <span
                        className={`mt-1 inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] font-medium uppercase tracking-[var(--tracking-mono-label)] ${ACCOUNT_STATUS[a.status].tone}`}
                      >
                        <span className="size-1.5 rounded-full bg-current" aria-hidden />
                        {ACCOUNT_STATUS[a.status].text}
                      </span>
                    </div>
                    {!a.isDefault && a.status === 'APPROVED' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => api.setDefaultBankAccount(a.id).then(refresh)}
                      >
                        Hacer principal
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card className="p-[var(--space-md)]">
        <h2 className="mb-[var(--space-sm)] text-[length:var(--text-md)]">Historial de retiros</h2>
        <DataTable
          id="payouts"
          caption="Historial de retiros"
          columns={COLUMNS}
          rows={payouts}
          rowKey={(t) => t.id}
          loading={loading}
          empty="No hay retiros registrados."
          searchPlaceholder="Buscar por referencia o destino…"
          defaultSort={{ id: 'createdAt', dir: 'desc' }}
          exportFilename="retiros_consi"
          exportAll={() => api.getTransactions({ ...params, take: '5000' })}
          exportSummary={(data) => [
            `Retirado USD ${formatMoney(
              data.filter((t) => t.currency === 'USD').reduce((s, t) => s + Number(t.amount || 0), 0),
              'USD',
            )}`,
            `Retirado VES ${formatMoney(
              data.filter((t) => t.currency === 'VES').reduce((s, t) => s + Number(t.amount || 0), 0),
              'VES',
            )}`,
          ]}
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <Select
                aria-label="Filtrar por estado"
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                className="h-9 w-auto"
              >
                <option value="">Todos los estados</option>
                <option value="PENDING">Pendiente</option>
                <option value="COMPLETED">Completado</option>
                <option value="FAILED">Fallido</option>
              </Select>
              <Select
                aria-label="Filtrar por moneda"
                value={filters.currency}
                onChange={(e) => setFilters((f) => ({ ...f, currency: e.target.value }))}
                className="h-9 w-auto"
              >
                <option value="">Todas las monedas</option>
                <option value="USD">USD</option>
                <option value="VES">VES</option>
              </Select>
            </div>
          }
        />
      </Card>
    </div>
  );
}
