'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Trash2, Edit, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import type { AdminMerchantSummary } from '@/lib/types';

interface SystemUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'OPERATIONS' | 'MERCHANT';
  merchantId: string | null;
  createdAt: string;
  merchant?: {
    id: string;
    businessName: string;
    email: string;
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [merchants, setMerchants] = useState<AdminMerchantSummary[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  
  // Form states
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<'ADMIN' | 'OPERATIONS' | 'MERCHANT'>('MERCHANT');
  const [formMerchantId, setFormMerchantId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [usersData, merchantsData] = await Promise.all([
        api.adminGetUsers(),
        api.adminGetMerchants(),
      ]);
      setUsers(usersData);
      setMerchants(merchantsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setModalMode('create');
    setSelectedUser(null);
    setFormEmail('');
    setFormPassword('');
    setFormRole('MERCHANT');
    setFormMerchantId(merchants[0]?.id || '');
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEditModal(user: SystemUser) {
    setModalMode('edit');
    setSelectedUser(user);
    setFormEmail(user.email);
    setFormPassword(''); // leave blank
    setFormRole(user.role);
    setFormMerchantId(user.merchantId || merchants[0]?.id || '');
    setFormError(null);
    setIsModalOpen(true);
  }

  async function handleSaveUser(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);

    if (formRole === 'MERCHANT' && !formMerchantId) {
      setFormError('Los usuarios de comercio deben estar asociados a un comercio');
      setFormSubmitting(false);
      return;
    }

    try {
      if (modalMode === 'create') {
        if (!formPassword || formPassword.length < 8) {
          setFormError('La contraseña es obligatoria y debe tener al menos 8 caracteres');
          setFormSubmitting(false);
          return;
        }
        await api.adminCreateUser({
          email: formEmail,
          password: formPassword,
          role: formRole,
          merchantId: formRole === 'MERCHANT' ? formMerchantId : null,
        });
      } else if (modalMode === 'edit' && selectedUser) {
        await api.adminUpdateUser(selectedUser.id, {
          email: formEmail,
          password: formPassword || undefined,
          role: formRole,
          merchantId: formRole === 'MERCHANT' ? formMerchantId : null,
        });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar el usuario');
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleDeleteUser(id: string) {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;
    try {
      await api.adminDeleteUser(id);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar el usuario');
    }
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.email.toLowerCase().includes(search.toLowerCase()) || 
      (u.merchant?.businessName || '').toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  function getRoleBadge(role: string) {
    switch (role) {
      case 'ADMIN':
        return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Administrador</Badge>;
      case 'OPERATIONS':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Operaciones</Badge>;
      case 'MERCHANT':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Comercio</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-strong)]">Gestión de Usuarios</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Administra los usuarios del sistema, sus roles y accesos a comercios.
          </p>
        </div>
        <Button onClick={openCreateModal} className="flex items-center gap-1.5 self-start">
          <Plus size={16} /> Nuevo Usuario
        </Button>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-md bg-red-50 p-4 text-sm text-[var(--destructive)] border border-red-200">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      ) : null}

      <Card>
        <CardContent className="p-0">
          {/* Filters Bar */}
          <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-subtle)]" />
              <Input
                placeholder="Buscar por correo o comercio…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="ALL">Todos los roles</option>
                <option value="ADMIN">Administradores</option>
                <option value="OPERATIONS">Operaciones</option>
                <option value="MERCHANT">Comercios</option>
              </Select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-8 text-center text-[var(--text-muted)]">Cargando usuarios…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Comercio Asociado</TableHead>
                  <TableHead>Fecha de Registro</TableHead>
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-semibold text-[var(--text-strong)]">
                      {u.email}
                    </TableCell>
                    <TableCell>{getRoleBadge(u.role)}</TableCell>
                    <TableCell>
                      {u.role === 'MERCHANT' ? (
                        u.merchant?.businessName || (
                          <span className="text-[var(--text-muted)] text-xs italic">No asignado</span>
                        )
                      ) : (
                        <span className="text-[var(--text-muted)] text-xs">— (Plataforma)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-muted)]">
                      {formatDate(u.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(u)}
                          title="Editar"
                          className="p-1.5 rounded hover:bg-[var(--ink-100)] text-[var(--text-muted)] hover:text-[var(--text-strong)]"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          title="Eliminar"
                          className="p-1.5 rounded hover:bg-red-50 text-[var(--text-muted)] hover:text-[var(--destructive)]"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-[var(--text-muted)]">
                      No se encontraron usuarios.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded hover:bg-[var(--ink-100)] text-[var(--text-muted)] hover:text-[var(--text-strong)]"
            >
              <X size={18} />
            </button>
            <CardHeader>
              <CardTitle>
                {modalMode === 'create' ? 'Crear Nuevo Usuario' : 'Editar Usuario'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveUser} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="formEmail">Correo electrónico</Label>
                  <Input
                    id="formEmail"
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="formPassword">
                    {modalMode === 'create' ? 'Contraseña' : 'Nueva contraseña (opcional)'}
                  </Label>
                  <Input
                    id="formPassword"
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={modalMode === 'create' ? 'Mínimo 8 caracteres' : 'Dejar vacío para mantener actual'}
                    required={modalMode === 'create'}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="formRole">Rol de Sistema</Label>
                  <Select
                    id="formRole"
                    value={formRole}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setFormRole(val);
                    }}
                  >
                    <option value="MERCHANT">Comerciante (Merchant)</option>
                    <option value="ADMIN">Administrador (Admin)</option>
                    <option value="OPERATIONS">Operaciones (Ops)</option>
                  </Select>
                </div>

                {formRole === 'MERCHANT' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="formMerchant">Comercio Asociado</Label>
                    <Select
                      id="formMerchant"
                      value={formMerchantId}
                      onChange={(e) => setFormMerchantId(e.target.value)}
                    >
                      {merchants.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.businessName} ({m.environment === 'LIVE' ? 'Real' : 'Pruebas'})
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                {formError ? (
                  <p className="text-xs text-[var(--destructive)] font-semibold">{formError}</p>
                ) : null}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    disabled={formSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={formSubmitting}>
                    {formSubmitting ? 'Guardando…' : 'Guardar Usuario'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
