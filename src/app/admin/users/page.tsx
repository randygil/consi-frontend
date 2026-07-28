'use client';

/* Hallmark · genre: modern-minimal · macrostructure: 05 Workbench
 * design-system: design.md · theme: Cobalt (light + dark)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Column, DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Notice, PageHead } from '@/components/ui/page-head';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api-client';
import { formatDate, roleLabel } from '@/lib/format';
import type { AdminMerchantSummary, Role } from '@/lib/types';

interface SystemUser {
  id: string;
  email: string;
  role: Role;
  merchantId: string | null;
  createdAt: string;
  merchant?: { id: string; businessName: string; email: string };
}

type FormState = { email: string; password: string; role: Role; merchantId: string };

const BLANK: FormState = { email: '', password: '', role: 'MERCHANT', merchantId: '' };

/**
 * Role is a readout, not a traffic light: the privileged role carries the
 * accent, everything else stays muted. Two hues, not three.
 */
function RoleBadge({ role }: { role: Role }) {
  const privileged = role === 'ADMIN';
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-xs)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] font-medium uppercase tracking-[var(--tracking-mono-label)] ${
        privileged
          ? 'text-[var(--color-accent)] bg-[var(--color-accent-soft)]'
          : 'text-[var(--color-ink-3)] bg-[var(--color-paper-3)]'
      }`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {roleLabel(role)}
    </span>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [merchants, setMerchants] = useState<AdminMerchantSummary[]>([]);
  const [roleFilter, setRoleFilter] = useState<'ALL' | Role>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ user: SystemUser | null } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, m] = await Promise.all([api.adminGetUsers(), api.adminGetMerchants()]);
      setUsers(u as SystemUser[]);
      setMerchants(m);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = useCallback(
    async (id: string) => {
      if (!window.confirm('¿Eliminar este usuario? La acción no se puede deshacer.')) return;
      try {
        await api.adminDeleteUser(id);
        load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al eliminar el usuario');
      }
    },
    [load],
  );

  const rows = useMemo(
    () => (roleFilter === 'ALL' ? users : users.filter((u) => u.role === roleFilter)),
    [users, roleFilter],
  );

  const columns = useMemo<Column<SystemUser>[]>(
    () => [
      {
        id: 'email',
        header: 'Usuario',
        value: (u) => u.email,
        cell: (u) => <span className="font-medium text-[var(--color-ink)]">{u.email}</span>,
      },
      {
        id: 'role',
        header: 'Rol',
        value: (u) => u.role,
        text: (u) => roleLabel(u.role),
        cell: (u) => <RoleBadge role={u.role} />,
      },
      {
        id: 'merchant',
        header: 'Comercio',
        value: (u) => u.merchant?.businessName ?? '',
        cell: (u) =>
          u.role === 'MERCHANT' ? (
            (u.merchant?.businessName ?? (
              <span className="text-[var(--color-warn)]">Sin asignar</span>
            ))
          ) : (
            <span className="label">Plataforma</span>
          ),
      },
      {
        id: 'createdAt',
        header: 'Registro',
        num: true,
        value: (u) => u.createdAt,
        text: (u) => formatDate(u.createdAt),
        cell: (u) => (
          <span className="whitespace-nowrap text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
            {formatDate(u.createdAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Acciones',
        align: 'right',
        pinned: true,
        sortable: false,
        searchable: false,
        exportable: false,
        cell: (u) => (
          <div className="flex justify-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              aria-label={`Editar ${u.email}`}
              onClick={() => setEditing({ user: u })}
            >
              <Pencil size={13} />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              aria-label={`Eliminar ${u.email}`}
              onClick={() => remove(u.id)}
            >
              <Trash2 size={13} />
            </Button>
          </div>
        ),
      },
    ],
    [remove],
  );

  return (
    <div className="flex flex-col gap-[var(--space-md)]">
      <PageHead
        title="Usuarios"
        lede="Cuentas de acceso a la plataforma, sus roles y el comercio al que pertenecen."
        action={
          <Button onClick={() => setEditing({ user: null })}>
            <Plus size={15} /> Nuevo usuario
          </Button>
        }
      />

      <Card className="p-[var(--space-md)]">
        <DataTable
          id="admin-users"
          caption="Usuarios de la plataforma"
          columns={columns}
          rows={rows}
          rowKey={(u) => u.id}
          loading={loading}
          error={error}
          empty="No se encontraron usuarios."
          searchPlaceholder="Buscar por correo o comercio…"
          defaultSort={{ id: 'createdAt', dir: 'desc' }}
          exportFilename="usuarios_consi"
          toolbar={
            <Select
              aria-label="Filtrar por rol"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'ALL' | Role)}
              className="h-9 w-auto"
            >
              <option value="ALL">Todos los roles</option>
              <option value="ADMIN">Administradores</option>
              <option value="OPERATIONS">Operaciones</option>
              <option value="MERCHANT">Comercios</option>
            </Select>
          }
        />
      </Card>

      {editing ? (
        <UserDialog
          user={editing.user}
          merchants={merchants}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      ) : null}
    </div>
  );
}

function UserDialog({
  user,
  merchants,
  onClose,
  onSaved,
}: {
  user: SystemUser | null;
  merchants: AdminMerchantSummary[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    user
      ? { email: user.email, password: '', role: user.role, merchantId: user.merchantId ?? '' }
      : { ...BLANK, merchantId: merchants[0]?.id ?? '' },
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.role === 'MERCHANT' && !form.merchantId) {
      setError('Un usuario de comercio debe estar asociado a un comercio.');
      return;
    }
    if (!user && form.password.length < 8) {
      setError('La contraseña es obligatoria y debe tener al menos 8 caracteres.');
      return;
    }

    setBusy(true);
    try {
      const payload = {
        email: form.email,
        role: form.role,
        merchantId: form.role === 'MERCHANT' ? form.merchantId : null,
      };
      if (user) {
        await api.adminUpdateUser(user.id, {
          ...payload,
          password: form.password || undefined,
        });
      } else {
        await api.adminCreateUser({ ...payload, password: form.password });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el usuario');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-scrim)] p-[var(--space-sm)]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-title"
        className="w-full max-w-md p-[var(--space-md)]"
      >
        <h2 id="user-title" className="text-[length:var(--text-md)]">
          {user ? 'Editar usuario' : 'Nuevo usuario'}
        </h2>

        <form onSubmit={submit} className="mt-[var(--space-sm)] flex flex-col gap-[var(--space-sm)]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="u-email">Correo electrónico</Label>
            <Input
              id="u-email"
              type="email"
              autoComplete="off"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="correo@ejemplo.com"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="u-password">
              {user ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            </Label>
            <Input
              id="u-password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder={user ? 'Dejar vacío para mantenerla' : 'Mínimo 8 caracteres'}
              required={!user}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="u-role">Rol</Label>
            <Select
              id="u-role"
              value={form.role}
              onChange={(e) => set('role', e.target.value as Role)}
            >
              <option value="MERCHANT">Comercio</option>
              <option value="ADMIN">Administrador</option>
              <option value="OPERATIONS">Operaciones</option>
            </Select>
          </div>

          {form.role === 'MERCHANT' ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="u-merchant">Comercio asociado</Label>
              <Select
                id="u-merchant"
                value={form.merchantId}
                onChange={(e) => set('merchantId', e.target.value)}
              >
                <option value="">—</option>
                {merchants.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.businessName} ({m.environment === 'LIVE' ? 'Real' : 'Prueba'})
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          {error ? <Notice kind="err">{error}</Notice> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar usuario'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
