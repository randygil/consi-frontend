'use client';

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4
 * genre: modern-minimal · theme: Cobalt (light + dark) · design-system: design.md
 * designed-as-app · macrostructure: 04 Stat-Led (focused family) · enrichment: none
 * Same bare column as /login and /forgot-password.
 */

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Notice } from '@/components/ui/page-head';
import { ThemeToggle } from '@/components/theme-toggle';
import { api } from '@/lib/api-client';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Shell title="Restablecer contraseña" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

/** Wordmark + theme control + heading. Shared so the Suspense fallback doesn't flash a bare page. */
function Shell({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-[var(--space-sm)]">
      <div className="w-full max-w-[360px]">
        <div className="mb-[var(--space-lg)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-[2px] bg-[var(--color-accent)]" aria-hidden />
            <span className="font-[family-name:var(--font-display)] text-[length:var(--text-md)] font-semibold tracking-[var(--tracking-display)] text-[var(--color-ink)]">
              Consi
            </span>
          </div>
          <ThemeToggle />
        </div>

        <h1 className="text-[length:var(--text-xl)]">{title}</h1>
        {children}

        <p className="mt-[var(--space-lg)] border-t border-[var(--color-rule)] pt-[var(--space-sm)]">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-[length:var(--text-sm)] text-[var(--color-ink-3)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--color-ink)]"
          >
            <ArrowLeft size={14} aria-hidden />
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword({ token, password });
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <Shell title="Enlace no válido">
        <div className="mt-[var(--space-md)] flex flex-col gap-[var(--space-sm)]">
          <Notice kind="err">
            Este enlace no trae un token de recuperación, o ya se usó.
          </Notice>
          <Link
            href="/forgot-password"
            className="self-start text-[length:var(--text-sm)] text-[var(--color-accent)] underline-offset-4 hover:underline"
          >
            Solicitar un enlace nuevo
          </Link>
        </div>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell title="Contraseña actualizada">
        <div className="mt-[var(--space-md)] flex flex-col gap-[var(--space-sm)]">
          <Notice kind="ok">Ya puedes entrar con tu contraseña nueva.</Notice>
          <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
            Te llevamos al inicio de sesión…
          </p>
          <Button size="lg" className="w-full" onClick={() => router.push('/login')}>
            Ir a iniciar sesión
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="Restablecer contraseña">
      <p className="mt-1.5 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
        Elige una contraseña nueva de al menos 8 caracteres.
      </p>
      <form onSubmit={onSubmit} className="mt-[var(--space-md)] flex flex-col gap-[var(--space-sm)]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Nueva contraseña</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? true : undefined}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={error ? true : undefined}
            required
          />
        </div>

        {error ? <Notice kind="err">{error}</Notice> : null}

        <Button type="submit" size="lg" className="mt-1 w-full" disabled={loading}>
          {loading ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
      </form>
    </Shell>
  );
}
