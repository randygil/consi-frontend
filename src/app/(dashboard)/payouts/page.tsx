'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';
import { formatMoney, formatDate } from '@/lib/format';
import { GATEWAYS, type BankAccount, type Currency, type Gateway, type Wallet, type Transaction } from '@/lib/types';

export default function PayoutsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [payoutsList, setPayoutsList] = useState<Transaction[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCurrency, setFilterCurrency] = useState('');
  
  // Solicitar Retiro Form State
  const [bankAccountId, setBankAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [gateway, setGateway] = useState<Gateway | ''>('');
  const [payoutMode, setPayoutMode] = useState<'INSTANT' | 'MANUAL'>('INSTANT');
  const [description, setDescription] = useState('');
  const [payoutMessage, setPayoutMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);

  // Registrar Cuenta Bancaria Form State
  const [regBankName, setRegBankName] = useState('');
  const [regAccountNumber, setRegAccountNumber] = useState('');
  const [regAccountHolder, setRegAccountHolder] = useState('');
  const [regCurrency, setRegCurrency] = useState<Currency>('USD');
  const [regIsDefault, setRegIsDefault] = useState(false);
  const [regMessage, setRegMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [regLoading, setRegLoading] = useState(false);

  const refresh = () =>
    Promise.all([
      api.getBankAccounts(),
      api.getBalances(),
      api.getTransactions({ type: 'PAYOUT' })
    ]).then(([a, w, p]) => {
      setAccounts(a);
      setWallets(w);
      setPayoutsList(p);
      
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

  // Fetch payouts list when filters change
  useEffect(() => {
    const params: Record<string, string> = { type: 'PAYOUT' };
    if (filterStatus) params.status = filterStatus;
    if (filterCurrency) params.currency = filterCurrency;
    api.getTransactions(params)
      .then(setPayoutsList)
      .catch(() => {});
  }, [filterStatus, filterCurrency]);

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
        payoutMode: payoutMode,
      } as any);
      
      setPayoutMessage({
        kind: 'ok',
        text: `Retiro creado (${trx.reference.slice(0, 12)}…) — Estado: ${trx.status}${payoutMode === 'MANUAL' ? ' (Pendiente de aprobación admin)' : ''}`,
      });
      setAmount('');
      setDescription('');
      await refresh();
    } catch (err) {
      setPayoutMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Error al solicitar el retiro' });
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

      setRegMessage({ kind: 'ok', text: 'Cuenta bancaria registrada con éxito. Pendiente de aprobación por el administrador.' });
      setRegBankName('');
      setRegAccountNumber('');
      setRegAccountHolder('');
      setRegIsDefault(false);
      await refresh();
    } catch (err) {
      setRegMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Error al registrar la cuenta bancaria' });
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Liquidaciones y Retiros</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT COLUMN: Payout request & Bank Registration */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">Solicitar retiro</CardTitle>
            </CardHeader>
            <CardContent>
              {approvedAccounts.length === 0 ? (
                <div className="rounded-md border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted-foreground)]">
                  Debes registrar una cuenta bancaria y esperar que sea aprobada por un administrador antes de solicitar retiros.
                </div>
              ) : (
                <form onSubmit={onSubmitPayout} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Cuenta bancaria destino (Solo aprobadas)</Label>
                    <Select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} required>
                      {approvedAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.bankName} · {a.currency} · {a.accountNumber} {a.isDefault ? ' (Principal)' : ''}
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
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Modo de Retiro</Label>
                      <Select value={payoutMode} onChange={(e) => setPayoutMode(e.target.value as 'INSTANT' | 'MANUAL')}>
                        <option value="INSTANT">Instantáneo (Inmediato)</option>
                        <option value="MANUAL">Manual (Aprobación Admin)</option>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Pasarela (Gateway)</Label>
                      <Select value={gateway} onChange={(e) => setGateway(e.target.value as Gateway | '')}>
                        <option value="">Por defecto de Consi</option>
                        {GATEWAYS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Descripción (opcional)</Label>
                    <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej. Retiro de caja chica" />
                  </div>
                  {payoutMessage ? (
                    <p className={payoutMessage.kind === 'ok' ? 'text-sm text-green-600' : 'text-sm text-[var(--destructive)]'}>
                      {payoutMessage.text}
                    </p>
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
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">Registrar nueva cuenta bancaria</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmitRegisterBank} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Moneda de la cuenta</Label>
                    <Select value={regCurrency} onChange={(e) => setRegCurrency(e.target.value as Currency)}>
                      <option value="USD">USD ($)</option>
                      <option value="VES">VES (Bs.)</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nombre del Banco</Label>
                    <Input
                      type="text"
                      placeholder="Ej. Bancamiga, Banesco"
                      value={regBankName}
                      onChange={(e) => setRegBankName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Titular de la cuenta</Label>
                  <Input
                    type="text"
                    placeholder="Nombre o Razón Social"
                    value={regAccountHolder}
                    onChange={(e) => setRegAccountHolder(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Número de cuenta (20 dígitos)</Label>
                  <Input
                    type="text"
                    placeholder="0172..."
                    value={regAccountNumber}
                    onChange={(e) => setRegAccountNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="flex items-center space-x-2 py-1">
                  <input
                    type="checkbox"
                    id="regIsDefault"
                    checked={regIsDefault}
                    onChange={(e) => setRegIsDefault(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--ring)]"
                  />
                  <label htmlFor="regIsDefault" className="text-sm font-medium text-[var(--foreground)]">
                    Establecer como cuenta principal para esta moneda
                  </label>
                </div>

                {regMessage ? (
                  <p className={regMessage.kind === 'ok' ? 'text-sm text-green-600' : 'text-sm text-[var(--destructive)]'}>
                    {regMessage.text}
                  </p>
                ) : null}

                <Button type="submit" disabled={regLoading}>
                  {regLoading ? 'Registrando…' : 'Registrar cuenta bancaria'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Balances & Bank Accounts List */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">Saldos disponibles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {wallets.map((w) => (
                <div key={w.id} className="flex items-center justify-between rounded-md border border-[var(--border)] p-3">
                  <span className="font-medium text-[var(--foreground)]">{w.currency}</span>
                  <span className="font-mono text-sm">{formatMoney(w.available, w.currency)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">Mis cuentas bancarias</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {accounts.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">No tienes cuentas bancarias registradas.</p>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {accounts.map((a) => (
                    <div key={a.id} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-sm text-[var(--foreground)]">{a.bankName}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-[var(--muted)] text-[var(--text-body)] font-mono">
                            {a.currency}
                          </span>
                          {a.isDefault && (
                            <span className="text-xs px-2 py-0.5 rounded bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold">
                              Principal
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--muted-foreground)] font-mono">{a.accountNumber}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">Titular: {a.accountHolder}</p>
                        
                        {/* Status Badge */}
                        <div className="pt-1">
                          {a.status === 'APPROVED' ? (
                            <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-[var(--success-100)] text-[var(--success-600)]">
                              Aprobada
                            </span>
                          ) : a.status === 'PENDING' ? (
                            <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-[var(--warning-100)] text-[var(--warning-600)]">
                              Pendiente de aprobación
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-[var(--danger-100)] text-[var(--danger-600)]">
                              Rechazada
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      {!a.isDefault && a.status === 'APPROVED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSetDefaultAccount(a.id)}
                          className="text-xs"
                        >
                          Hacer principal
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* HISTORICAL PAYOUTS TABLE CARD */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-[var(--foreground)]">Historial de retiros</CardTitle>
          <div className="flex gap-2">
            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-[140px] text-xs">
              <option value="">Todos los estados</option>
              <option value="PENDING">Pendiente</option>
              <option value="COMPLETED">Completado</option>
              <option value="FAILED">Fallido</option>
            </Select>
            <Select value={filterCurrency} onChange={(e) => setFilterCurrency(e.target.value)} className="w-[110px] text-xs">
              <option value="">Monedas</option>
              <option value="USD">USD</option>
              <option value="VES">VES</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referencia</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Comisión</TableHead>
                <TableHead>Neto</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payoutsList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-[var(--muted-foreground)] py-6">
                    No hay retiros registrados
                  </TableCell>
                </TableRow>
              ) : (
                payoutsList.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.reference.slice(0, 14)}</TableCell>
                    <TableCell>{formatMoney(t.amount, t.currency)}</TableCell>
                    <TableCell className="text-[var(--muted-foreground)]">
                      {t.feeAmount ? formatMoney(t.feeAmount, t.currency) : '—'}
                    </TableCell>
                    <TableCell>{t.netAmount ? formatMoney(t.netAmount, t.currency) : '—'}</TableCell>
                    <TableCell className="text-xs text-[var(--muted-foreground)] max-w-xs truncate">
                      {t.description ?? 'Retiro directo'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="text-[var(--muted-foreground)] text-xs">
                      {formatDate(t.createdAt)}
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

