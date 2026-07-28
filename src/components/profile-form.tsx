'use client';

/* Hallmark · component: profile settings · genre: modern-minimal · theme: Cobalt
 * design-system: design.md · app family (05 Workbench) · enrichment: none
 * states: default · hover · focus · active · disabled · loading · error · success
 *
 * Two independent actions, not one "Guardar cambios" that does both. The old
 * single form had to invent a "no has realizado ningún cambio" error and put
 * "dejar en blanco para no cambiar" in two placeholders — both of which existed
 * only because one button was doing two unrelated jobs.
 */

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Notice } from '@/components/ui/page-head';
import { api } from '@/lib/api-client';
import { roleLabel } from '@/lib/format';

export function ProfileForm() {
  const { user, merchant, updateUser } = useAuth();

  return (
    <div className="flex max-w-[42rem] flex-col gap-[var(--space-md)]">
      <IdentityCard />
      <EmailCard user={user} onSaved={(email) => updateUser({ email })} />
      <PasswordCard />
      {merchant ? <MerchantCard /> : null}
    </div>
  );
}

/** Who the session belongs to. A readout, so it is rows — not disabled inputs. */
function IdentityCard() {
  const { user, merchant } = useAuth();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tu cuenta</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="border-t border-[var(--color-rule)]">
          <Row label="Correo" value={user?.email ?? '—'} num />
          <Row label="Rol" value={user ? roleLabel(user.role) : '—'} />
          {merchant ? <Row label="Comercio" value={merchant.businessName} /> : null}
          {merchant ? <Row label="Entorno" value={merchant.environment} num /> : null}
        </dl>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, num }: { label: string; value: string; num?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-[var(--space-sm)] border-b border-[var(--color-rule)] py-[var(--space-2xs)]">
      <dt className="label shrink-0">{label}</dt>
      <dd
        title={value}
        className={`min-w-0 truncate text-right text-[length:var(--text-sm)] text-[var(--color-ink-2)] ${num ? 'num' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}

function EmailCard({
  user,
  onSaved,
}: {
  user: { email: string } | null;
  onSaved: (email: string) => void;
}) {
  const [email, setEmail] = useState(user?.email ?? '');
  const [state, setState] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Nothing to save until it actually differs — the button says so instead of
  // letting the user submit and reading back an error.
  const changed = email.trim() !== '' && email.trim() !== user?.email;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setState(null);
    try {
      const updated = await api.updateProfile({ email: email.trim() });
      onSaved(updated.email);
      setState({ kind: 'ok', msg: 'Correo actualizado.' });
    } catch (err) {
      setState({
        kind: 'err',
        msg: err instanceof Error ? err.message : 'No pudimos actualizar el correo',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Correo de acceso</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-[var(--space-sm)]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-email">Correo electrónico</Label>
            <Input
              id="profile-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setState(null);
              }}
              aria-invalid={state?.kind === 'err' ? true : undefined}
              required
            />
            <p className="text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
              Con este correo inicias sesión.
            </p>
          </div>

          {state ? <Notice kind={state.kind}>{state.msg}</Notice> : null}

          <Button type="submit" className="self-start" disabled={busy || !changed}>
            {busy ? 'Guardando…' : 'Guardar correo'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordCard() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [state, setState] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const tooShort = password !== '' && password.length < 8;
  const mismatch = confirm !== '' && password !== confirm;
  const ready = password.length >= 8 && password === confirm;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setState(null);
    try {
      await api.updateProfile({ password });
      setPassword('');
      setConfirm('');
      setState({ kind: 'ok', msg: 'Contraseña actualizada. La próxima vez entra con la nueva.' });
    } catch (err) {
      setState({
        kind: 'err',
        msg: err instanceof Error ? err.message : 'No pudimos cambiar la contraseña',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contraseña</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-[var(--space-sm)]">
          <div className="grid grid-cols-1 gap-[var(--space-sm)] min-[420px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-password">Nueva contraseña</Label>
              <Input
                id="profile-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setState(null);
                }}
                aria-invalid={tooShort ? true : undefined}
                aria-describedby="profile-password-hint"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-confirm">Confirmar</Label>
              <Input
                id="profile-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setState(null);
                }}
                aria-invalid={mismatch ? true : undefined}
              />
            </div>
          </div>

          {/* Validation reads as guidance while typing, not as a failure after submit. */}
          <p
            id="profile-password-hint"
            className={`text-[length:var(--text-xs)] ${
              tooShort || mismatch ? 'text-[var(--color-bad)]' : 'text-[var(--color-ink-4)]'
            }`}
          >
            {mismatch
              ? 'Las contraseñas no coinciden.'
              : tooShort
                ? 'Mínimo 8 caracteres.'
                : 'Mínimo 8 caracteres.'}
          </p>

          {state ? <Notice kind={state.kind}>{state.msg}</Notice> : null}

          <Button type="submit" className="self-start" disabled={busy || !ready}>
            {busy ? 'Cambiando…' : 'Cambiar contraseña'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/** Merchant-only. Read-only here on purpose: business data lives in Ajustes. */
function MerchantCard() {
  const { merchant } = useAuth();
  if (!merchant) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos del comercio</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="border-t border-[var(--color-rule)]">
          <Row label="Razón social" value={merchant.businessName} />
          <Row label="Webhook" value={merchant.webhookUrl ?? 'Sin configurar'} num />
          <Row label="Liquidación" value={merchant.autoSettle ? 'Automática' : 'Manual'} />
        </dl>
        <p className="mt-[var(--space-sm)] text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
          Estos datos se editan desde Desarrolladores y Ajustes, no desde tu perfil.
        </p>
      </CardContent>
    </Card>
  );
}
