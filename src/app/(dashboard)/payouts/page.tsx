'use client';

/* Hallmark · genre: modern-minimal · macrostructure: 05 Workbench
 * design-system: design.md · theme: Cobalt (light + dark)
 *
 * Cada moneda es un ledger independiente: lo que entra en USDT sale en USDT,
 * lo que entra en bolívares sale en bolívares. El flujo de retiro se elige
 * POR MONEDA (tarjeta de saldo → formulario acotado a esa moneda); nunca se
 * mezclan ni convierten saldos.
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
import type {
  BankAccount,
  Currency,
  FxQuote,
  PayoutQuote,
  Transaction,
  Wallet,
} from '@/lib/types';

const CURRENCIES: Currency[] = ['USD', 'VES', 'USDT'];

/** Human copy per settlement asset — the withdrawal destination differs by rail. */
const CURRENCY_COPY: Record<Currency, { title: string; destination: string }> = {
  USD: { title: 'Dólares (USD)', destination: 'cuenta bancaria en USD' },
  VES: { title: 'Bolívares (VES)', destination: 'cuenta bancaria en bolívares' },
  USDT: { title: 'Tether (USDT)', destination: 'billetera cripto' },
};

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

  // The whole request flow is scoped to ONE settlement asset at a time.
  const [currency, setCurrency] = useState<Currency>('USD');
  const [bankAccountId, setBankAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [payoutMsg, setPayoutMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [payoutBusy, setPayoutBusy] = useState(false);

  // Fee/net preview for the current amount (debounced) + idempotency key per intent:
  // same fields → same key, so an accidental double-submit can't create two payouts.
  const [quote, setQuote] = useState<PayoutQuote | null>(null);
  const [quoteErr, setQuoteErr] = useState<string | null>(null);
  const [idemKey, setIdemKey] = useState('');
  useEffect(() => {
    setIdemKey(crypto.randomUUID());
  }, [currency, amount, bankAccountId, description]);
  useEffect(() => {
    setQuote(null);
    setQuoteErr(null);
    if (!amount || Number(amount) <= 0) return;
    const t = setTimeout(() => {
      api
        .payoutQuote({ currency, amount })
        .then(setQuote)
        .catch((e) => setQuoteErr(e instanceof Error ? e.message : 'No se pudo cotizar'));
    }, 400);
    return () => clearTimeout(t);
  }, [amount, currency]);

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

  const walletFor = (c: Currency) => wallets.find((w) => w.currency === c);
  const approvedFor = (c: Currency) =>
    accounts.filter((a) => a.status === 'APPROVED' && a.currency === c);

  const approved = approvedFor(currency);
  const wallet = walletFor(currency);
  const available = Number(wallet?.available ?? 0);

  // Keep the destination account in sync with the selected currency (prefer default).
  useEffect(() => {
    const list = approvedFor(currency);
    setBankAccountId((id) =>
      list.some((a) => a.id === id) ? id : (list.find((a) => a.isDefault) ?? list[0])?.id ?? '',
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, accounts]);

  function pickCurrency(c: Currency) {
    setCurrency(c);
    setAmount('');
    setPayoutMsg(null);
  }

  async function submitPayout(e: React.FormEvent) {
    e.preventDefault();
    setPayoutMsg(null);
    setPayoutBusy(true);
    try {
      const trx = await api.createPayout(
        {
          currency,
          amount,
          bankAccountId,
          description: description || undefined,
        },
        idemKey,
      );
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
        currency: reg.currency,
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

  const regIsCrypto = reg.currency === 'USDT';

  return (
    <div className="flex flex-col gap-[var(--space-md)]">
      <PageHead
        title="Retiros"
        lede="Cada moneda es un saldo independiente: lo que recibes en USDT se retira en USDT y lo que recibes en bolívares se retira en bolívares. Sin conversiones."
      />

      {/* 1 · Saldos por moneda. Elegir una tarjeta acota todo el flujo a ese ledger. */}
      <div className="grid gap-[var(--space-sm)] sm:grid-cols-3">
        {CURRENCIES.map((c) => {
          const w = walletFor(c);
          const avail = Number(w?.available ?? 0);
          const held = Math.max(0, Number(w?.balance ?? 0) - avail);
          const active = c === currency;
          return (
            <button
              key={c}
              type="button"
              onClick={() => pickCurrency(c)}
              aria-pressed={active}
              className={`rounded-[var(--radius-md)] border p-[var(--space-sm)] text-left transition-colors duration-[var(--dur-fast)] ${
                active
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                  : 'border-[var(--color-rule)] bg-[var(--color-surface)] hover:border-[var(--color-rule-2)]'
              }`}
            >
              <div className="font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] uppercase tracking-[var(--tracking-mono-label)] text-[var(--color-ink-3)]">
                {CURRENCY_COPY[c].title}
              </div>
              <div className="num mt-1.5 truncate text-[length:var(--text-xl)] font-medium text-[var(--color-ink)]">
                {formatMoney(avail, c)}
              </div>
              <div className="mt-0.5 text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
                {held > 0 ? `${formatMoney(held, c)} en retención` : 'Disponible para retirar'}
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-[var(--space-md)] lg:grid-cols-2">
        {/* 2 · Solicitar retiro — acotado a la moneda elegida. */}
        <Card className="p-[var(--space-md)]">
          <h2 className="mb-[var(--space-sm)] text-[length:var(--text-md)]">
            Solicitar retiro · {currency}
          </h2>
          {approved.length === 0 ? (
            <p className="rounded-[var(--radius-sm)] border border-dashed border-[var(--color-rule)] p-[var(--space-md)] text-center text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
              Registra una {CURRENCY_COPY[currency].destination} y espera su aprobación para
              retirar tu saldo en {currency}.
            </p>
          ) : (
            <form onSubmit={submitPayout} className="flex flex-col gap-[var(--space-sm)]">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dest">Destino ({CURRENCY_COPY[currency].destination})</Label>
                <Select
                  id="dest"
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                  required
                >
                  {approved.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.bankName} · {a.accountNumber}
                      {a.isDefault ? ' (principal)' : ''}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="payout-amount">Monto ({currency})</Label>
                <div className="flex gap-2">
                  <Input
                    id="payout-amount"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="num"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={available <= 0}
                    onClick={() => setAmount(String(wallet?.available ?? '0'))}
                  >
                    Todo
                  </Button>
                </div>
                <p className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                  Disponible <span className="num">{formatMoney(available, currency)}</span>
                </p>
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

              {/* Fee/net preview: what actually lands, before committing. */}
              {quote ? (
                <div className="rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-2.5 text-[length:var(--text-xs)]">
                  <div className="flex justify-between text-[var(--color-ink-3)]">
                    <span>Comisión</span>
                    <span className="num">{formatMoney(quote.fee, currency)}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-[var(--color-ink-3)]">
                    <span>IVA</span>
                    <span className="num">{formatMoney(quote.tax, currency)}</span>
                  </div>
                  <div className="mt-1.5 flex justify-between border-t border-[var(--color-rule)] pt-1.5 font-medium text-[var(--color-ink)]">
                    <span>Recibirás</span>
                    <span className="num">{formatMoney(quote.net, currency)}</span>
                  </div>
                  {quote.requiresApproval ? (
                    <p className="mt-1.5 text-[var(--color-warn)]">
                      Monto sobre el umbral de seguridad: requerirá aprobación del administrador.
                    </p>
                  ) : null}
                </div>
              ) : quoteErr ? (
                <p className="text-[length:var(--text-xs)] text-[var(--color-bad)]">{quoteErr}</p>
              ) : null}

              {payoutMsg ? <Notice kind={payoutMsg.kind}>{payoutMsg.text}</Notice> : null}
              <div>
                <Button type="submit" disabled={payoutBusy || !bankAccountId}>
                  {payoutBusy ? 'Procesando…' : `Retirar ${currency}`}
                </Button>
              </div>
            </form>
          )}
        </Card>

        {/* 3 · Conversión explícita + cuentas de retiro (por moneda) + registro. */}
        <div className="flex flex-col gap-[var(--space-md)]">
          <FxConverter wallets={wallets} onDone={refresh} />

          <Card className="p-[var(--space-md)]">
            <h2 className="mb-[var(--space-sm)] text-[length:var(--text-md)]">Mis destinos de retiro</h2>
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

          <Card className="p-[var(--space-md)]">
            <h2 className="mb-[var(--space-sm)] text-[length:var(--text-md)]">
              Registrar destino de retiro
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
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reg-bank">{regIsCrypto ? 'Red' : 'Banco'}</Label>
                  <Input
                    id="reg-bank"
                    value={reg.bankName}
                    onChange={(e) => setReg((r) => ({ ...r, bankName: e.target.value }))}
                    placeholder={regIsCrypto ? 'TRON (TRC-20), Ethereum (ERC-20)…' : 'Bancamiga, Banesco…'}
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reg-holder">Titular / beneficiario</Label>
                <Input
                  id="reg-holder"
                  value={reg.accountHolder}
                  onChange={(e) => setReg((r) => ({ ...r, accountHolder: e.target.value }))}
                  placeholder="Nombre o razón social"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reg-number">
                  {regIsCrypto ? 'Dirección de billetera' : 'Número de cuenta (20 dígitos)'}
                </Label>
                <Input
                  id="reg-number"
                  inputMode={regIsCrypto ? 'text' : 'numeric'}
                  value={reg.accountNumber}
                  onChange={(e) => setReg((r) => ({ ...r, accountNumber: e.target.value }))}
                  placeholder={regIsCrypto ? 'TX4f…' : '0172…'}
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
                  Destino principal para esta moneda
                </span>
              </label>
              {regMsg ? <Notice kind={regMsg.kind}>{regMsg.text}</Notice> : null}
              <div>
                <Button type="submit" disabled={regBusy}>
                  {regBusy ? 'Registrando…' : 'Registrar destino'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>

      {/* 4 · Historial. */}
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
          exportSummary={(data) =>
            CURRENCIES.map(
              (c) =>
                `Retirado ${c} ${formatMoney(
                  data.filter((t) => t.currency === c).reduce((s, t) => s + Number(t.amount || 0), 0),
                  c,
                )}`,
            )
          }
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
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
          }
        />
      </Card>
    </div>
  );
}

/**
 * Conversión explícita entre los saldos del comercio: cotización con tasa de
 * mercado, spread declarado y expiración corta — el saldo solo se mueve al
 * aceptar. Nunca hay conversión automática.
 */
function FxConverter({ wallets, onDone }: { wallets: Wallet[]; onDone: () => Promise<void> }) {
  const [from, setFrom] = useState<Currency>('USDT');
  const [to, setTo] = useState<Currency>('VES');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<FxQuote | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Countdown to the quote's expiry; an expired quote disappears (re-quote needed).
  useEffect(() => {
    if (!quote) return;
    const tick = () => {
      const s = Math.max(
        0,
        Math.floor((new Date(quote.expiresAt).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(s);
      if (s <= 0) setQuote(null);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [quote]);

  const available = Number(wallets.find((w) => w.currency === from)?.available ?? 0);

  async function requestQuote(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      setQuote(await api.fxQuote({ fromCurrency: from, toCurrency: to, amount }));
    } catch (err) {
      setMsg({ kind: 'err', text: err instanceof Error ? err.message : 'Error al cotizar' });
    } finally {
      setBusy(false);
    }
  }

  async function accept() {
    if (!quote) return;
    setBusy(true);
    setMsg(null);
    try {
      const q = await api.fxAccept(quote.id);
      setMsg({
        kind: 'ok',
        text: `Convertido ${formatMoney(q.amountFrom, q.fromCurrency)} → ${formatMoney(q.amountTo, q.toCurrency)}`,
      });
      setQuote(null);
      setAmount('');
      await onDone();
    } catch (err) {
      setQuote(null); // used/expired server-side — force a fresh quote
      setMsg({ kind: 'err', text: err instanceof Error ? err.message : 'Error al convertir' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-[var(--space-md)]">
      <h2 className="text-[length:var(--text-md)]">Convertir saldo</h2>
      <p className="mb-[var(--space-sm)] mt-1 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
        Conversión opcional entre tus monedas, con tasa y spread declarados. Nunca se convierte
        automáticamente.
      </p>
      <form onSubmit={requestQuote} className="flex flex-col gap-[var(--space-sm)]">
        <div className="grid grid-cols-2 gap-[var(--space-sm)]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fx-from">De</Label>
            <Select
              id="fx-from"
              value={from}
              onChange={(e) => {
                const c = e.target.value as Currency;
                setFrom(c);
                if (c === to) setTo(CURRENCIES.find((x) => x !== c) ?? 'VES');
                setQuote(null);
              }}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fx-to">A</Label>
            <Select
              id="fx-to"
              value={to}
              onChange={(e) => {
                setTo(e.target.value as Currency);
                setQuote(null);
              }}
            >
              {CURRENCIES.filter((c) => c !== from).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fx-amount">Monto ({from})</Label>
          <Input
            id="fx-amount"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setQuote(null);
            }}
            required
            className="num"
          />
          <p className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
            Disponible <span className="num">{formatMoney(available, from)}</span>
          </p>
        </div>

        {quote ? (
          <div className="rounded-[var(--radius-sm)] border border-[var(--color-accent)] bg-[var(--color-accent-soft)] p-2.5 text-[length:var(--text-xs)]">
            <div className="flex justify-between font-medium text-[var(--color-ink)]">
              <span>Recibirás</span>
              <span className="num">{formatMoney(quote.amountTo, quote.toCurrency)}</span>
            </div>
            <div className="mt-1 flex justify-between text-[var(--color-ink-3)]">
              <span>Tasa efectiva</span>
              <span className="num">{quote.rate}</span>
            </div>
            <div className="mt-1 flex justify-between text-[var(--color-ink-3)]">
              <span>Spread</span>
              <span className="num">{(Number(quote.spreadPct) * 100).toFixed(2)}%</span>
            </div>
            <div className="mt-1.5 border-t border-[var(--color-rule)] pt-1.5 text-[var(--color-ink-3)]">
              La cotización expira en <span className="num">{secondsLeft}s</span>
            </div>
          </div>
        ) : null}

        {msg ? <Notice kind={msg.kind}>{msg.text}</Notice> : null}

        <div className="flex gap-2">
          {quote ? (
            <Button type="button" onClick={accept} disabled={busy}>
              {busy ? 'Convirtiendo…' : 'Aceptar y convertir'}
            </Button>
          ) : (
            <Button type="submit" variant="outline" disabled={busy || !amount}>
              {busy ? 'Cotizando…' : 'Cotizar'}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
