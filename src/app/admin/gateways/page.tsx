'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';
import type { GatewayAccount } from '@/lib/types';
import { Coins, Plus, Settings, ShieldAlert, CheckCircle2, XCircle, ArrowUpRight, Ban, Eye } from 'lucide-react';

export default function GatewaysAdminPage() {
  const [accounts, setAccounts] = useState<GatewayAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fundingId, setFundingId] = useState<string | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  
  // Edit & Create modal state
  const [editingAccount, setEditingAccount] = useState<Partial<GatewayAccount> | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAccount, setNewAccount] = useState<Partial<GatewayAccount>>({
    name: '',
    gateway: 'MOCK_BANGENTE',
    currency: 'VES',
    accountNumber: '',
    balance: '0.00',
    minBalance: '1000.00',
    percentageRate: '0.01',
    fixedFee: '0.00',
    minFee: '0.00',
    maxFee: '0.00',
    taxRate: '0.16',
  });

  const loadAccounts = useCallback(() => {
    setLoading(true);
    api.getGatewayAccounts()
      .then(setAccounts)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar las cuentas'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleFundSubmit = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!fundAmount || Number(fundAmount) <= 0) return;
    try {
      await api.fundGatewayAccount(id, fundAmount);
      setFundingId(null);
      setFundAmount('');
      loadAccounts();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al fondear la cuenta');
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createGatewayAccount(newAccount);
      setIsCreateOpen(false);
      setNewAccount({
        name: '',
        gateway: 'MOCK_BANGENTE',
        currency: 'VES',
        accountNumber: '',
        balance: '0.00',
        minBalance: '1000.00',
        percentageRate: '0.01',
        fixedFee: '0.00',
        minFee: '0.00',
        maxFee: '0.00',
        taxRate: '0.16',
      });
      loadAccounts();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al crear la cuenta');
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !editingAccount.id) return;
    try {
      await api.updateGatewayAccount(editingAccount.id, editingAccount);
      setEditingAccount(null);
      loadAccounts();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al actualizar la cuenta');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-strong)] flex items-center gap-2">
            <Coins className="text-[var(--blue-500)]" />
            <span>Cuentas Corporativas de Consi (Pasarelas)</span>
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Gestione los fondos y las comisiones de los proveedores de pago utilizados para liquidaciones y cobros.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-[var(--gradient-brand)] hover:opacity-90 font-bold text-white flex items-center gap-1.5 px-4 py-2 h-auto rounded-[var(--radius-md)] border-0">
          <Plus size={16} /> Nueva Cuenta
        </Button>
      </div>

      {error ? <p className="text-sm text-[var(--destructive)] bg-red-50 p-3 rounded-lg">{error}</p> : null}

      <div className="grid gap-6">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre / Gateway</TableHead>
                  <TableHead>Moneda / Cuenta</TableHead>
                  <TableHead>Saldo Actual</TableHead>
                  <TableHead>Fondo Mínimo</TableHead>
                  <TableHead>Configuración Comisiones (Costo)</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-sm text-[var(--text-muted)]">
                      {loading ? 'Cargando cuentas...' : 'No hay cuentas de pasarela configuradas.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((acct) => {
                    const isLowBalance = Number(acct.balance) < Number(acct.minBalance);
                    return (
                      <TableRow key={acct.id}>
                        <TableCell className="align-middle">
                          <p className="font-bold text-sm text-[var(--text-strong)]">{acct.name}</p>
                          <span className="text-[10px] font-semibold text-[var(--text-subtle)] font-mono uppercase bg-[var(--ink-100)] px-1.5 py-0.5 rounded">
                            {acct.gateway}
                          </span>
                        </TableCell>
                        <TableCell className="align-middle">
                          <p className="font-bold text-xs">{acct.currency}</p>
                          <p className="text-xs text-[var(--text-muted)] font-mono truncate max-w-[150px]">{acct.accountNumber}</p>
                        </TableCell>
                        <TableCell className="align-middle">
                          <p className={`font-mono font-bold text-sm ${isLowBalance ? 'text-amber-500' : 'text-green-600'}`}>
                            {formatMoney(acct.balance, acct.currency)}
                          </p>
                          {isLowBalance && (
                            <span className="text-[10px] text-amber-500 font-bold flex items-center gap-0.5 mt-0.5">
                              <ShieldAlert size={10} /> Requiere Fondeo
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="align-middle font-mono text-xs">
                          {formatMoney(acct.minBalance, acct.currency)}
                        </TableCell>
                        <TableCell className="align-middle text-xs space-y-0.5">
                          <p><span className="text-[var(--text-muted)]">Tasa:</span> {(Number(acct.percentageRate) * 100).toFixed(2)}%</p>
                          <p><span className="text-[var(--text-muted)]">Fijo:</span> {formatMoney(acct.fixedFee, acct.currency)}</p>
                          <p><span className="text-[var(--text-muted)]">Límites:</span> Min {formatMoney(acct.minFee, acct.currency)} · Max {formatMoney(acct.maxFee, acct.currency)}</p>
                        </TableCell>
                        <TableCell className="align-middle">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${acct.enabled ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {acct.enabled ? 'Activa' : 'Inactiva'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right align-middle space-y-1">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 text-xs px-2.5 py-1 h-auto flex items-center gap-1"
                              onClick={() => setFundingId(acct.id)}
                            >
                              <ArrowUpRight size={12} /> Fondear
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200 text-xs px-2.5 py-1 h-auto flex items-center gap-1"
                              onClick={() => setEditingAccount(acct)}
                            >
                              <Settings size={12} /> Config
                            </Button>
                          </div>
                          {fundingId === acct.id && (
                            <form onSubmit={(e) => handleFundSubmit(e, acct.id)} className="flex items-center gap-1 justify-end mt-1.5">
                              <input
                                type="text"
                                className="text-xs border border-gray-300 rounded px-1.5 py-0.5 w-20 bg-white"
                                placeholder="Monto"
                                value={fundAmount}
                                onChange={(e) => setFundAmount(e.target.value)}
                                required
                              />
                              <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700 text-white text-[10px] px-2 py-0.5 h-auto">
                                Enviar
                              </Button>
                              <Button type="button" size="sm" variant="ghost" className="text-xs text-red-500 px-1 py-0.5 h-auto" onClick={() => setFundingId(null)}>
                                X
                              </Button>
                            </form>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Agregar Cuenta de Pasarela</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <form onSubmit={handleCreateAccount} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Nombre Descriptivo</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                    placeholder="Ej: Consi Bangente VES"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Gateway ID</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                    value={newAccount.gateway}
                    onChange={(e) => setNewAccount({ ...newAccount, gateway: e.target.value })}
                  >
                    <option value="MOCK_BANGENTE">MOCK_BANGENTE (Instantáneo VES)</option>
                    <option value="MOCK_BANCARIBE">MOCK_BANCARIBE (Manual VES)</option>
                    <option value="MOCK_CRYPTO">MOCK_CRYPTO (Instantáneo USD)</option>
                    <option value="STRIPE">STRIPE (Instantáneo USD Card)</option>
                    <option value="MANUAL">MANUAL (Transferencia manual)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Moneda</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                    value={newAccount.currency}
                    onChange={(e) => setNewAccount({ ...newAccount, currency: e.target.value as 'USD' | 'VES' })}
                  >
                    <option value="VES">VES (Bolívares)</option>
                    <option value="USD">USD (Dólares)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Número de Cuenta / Dirección</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                    placeholder="Cuenta bancaria o address cripto"
                    value={newAccount.accountNumber}
                    onChange={(e) => setNewAccount({ ...newAccount, accountNumber: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Saldo Inicial</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white font-mono"
                    value={newAccount.balance}
                    onChange={(e) => setNewAccount({ ...newAccount, balance: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Fondo Mínimo de Alerta</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white font-mono"
                    value={newAccount.minBalance}
                    onChange={(e) => setNewAccount({ ...newAccount, minBalance: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="border-t border-gray-100 pt-3">
                <h4 className="text-xs font-bold text-gray-800 mb-2">Comisiones del Proveedor (Costo para Consi)</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 block mb-1">Tasa % (0.01 = 1%)</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white font-mono"
                      value={newAccount.percentageRate}
                      onChange={(e) => setNewAccount({ ...newAccount, percentageRate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 block mb-1">Costo Fijo</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white font-mono"
                      value={newAccount.fixedFee}
                      onChange={(e) => setNewAccount({ ...newAccount, fixedFee: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 block mb-1">Costo Mínimo</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white font-mono"
                      value={newAccount.minFee}
                      onChange={(e) => setNewAccount({ ...newAccount, minFee: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 block mb-1">Costo Máximo</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white font-mono"
                      value={newAccount.maxFee}
                      onChange={(e) => setNewAccount({ ...newAccount, maxFee: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 block mb-1">Tasa Impuesto (e.g. 0.16 = IVA)</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white font-mono"
                      value={newAccount.taxRate}
                      onChange={(e) => setNewAccount({ ...newAccount, taxRate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-[var(--blue-600)] hover:bg-[var(--blue-700)] text-white">Guardar Cuenta</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Configuración de Pasarela: {editingAccount.name}</h3>
              <button onClick={() => setEditingAccount(null)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <form onSubmit={handleUpdateAccount} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Nombre Descriptivo</label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                  value={editingAccount.name}
                  onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Número de Cuenta / Dirección</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white font-mono"
                    value={editingAccount.accountNumber}
                    onChange={(e) => setEditingAccount({ ...editingAccount, accountNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Fondo Mínimo de Alerta</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white font-mono"
                    value={editingAccount.minBalance}
                    onChange={(e) => setEditingAccount({ ...editingAccount, minBalance: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <h4 className="text-xs font-bold text-gray-800 mb-2">Comisiones del Proveedor (Costo para Consi)</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 block mb-1">Tasa %</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white font-mono"
                      value={editingAccount.percentageRate}
                      onChange={(e) => setEditingAccount({ ...editingAccount, percentageRate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 block mb-1">Costo Fijo</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white font-mono"
                      value={editingAccount.fixedFee}
                      onChange={(e) => setEditingAccount({ ...editingAccount, fixedFee: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 block mb-1">Costo Mínimo</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white font-mono"
                      value={editingAccount.minFee}
                      onChange={(e) => setEditingAccount({ ...editingAccount, minFee: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 block mb-1">Costo Máximo</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white font-mono"
                      value={editingAccount.maxFee}
                      onChange={(e) => setEditingAccount({ ...editingAccount, maxFee: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 block mb-1">Tasa Impuesto</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white font-mono"
                      value={editingAccount.taxRate}
                      onChange={(e) => setEditingAccount({ ...editingAccount, taxRate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    checked={editingAccount.enabled}
                    onChange={(e) => setEditingAccount({ ...editingAccount, enabled: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Habilitar Cuenta</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                <Button type="button" variant="ghost" onClick={() => setEditingAccount(null)}>Cancelar</Button>
                <Button type="submit" className="bg-[var(--blue-600)] hover:bg-[var(--blue-700)] text-white">Guardar Cambios</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
