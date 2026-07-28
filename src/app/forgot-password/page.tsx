'use client';

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4
 * genre: modern-minimal · theme: Cobalt (light + dark) · design-system: design.md
 * designed-as-app · macrostructure: 04 Stat-Led (focused family) · enrichment: none
 * Same bare column as /login — the focused family carries no card and no chrome.
 */

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Notice } from '@/components/ui/page-head';
import { ThemeToggle } from '@/components/theme-toggle';
import { api } from '@/lib/api-client';

// The reset link is a credential. It is only ever rendered locally — in a build it
// must reach the user by email, never by being painted onto the page that asked.
const DEV = process.env.NODE_ENV === 'development';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSent(false);
    setDevToken(null);
    setLoading(true);

    try {
      const result = await api.forgotPassword(email);
      setSent(true);
      if (DEV && result?.resetToken) setDevToken(result.resetToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos procesar la solicitud');
    } finally {
      setLoading(false);
    }
  }

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

        <h1 className="text-[length:var(--text-xl)]">Recuperar contraseña</h1>

        {!sent ? (
          <>
            <p className="mt-1.5 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
              Ingresa el correo de tu cuenta y generamos un enlace para restablecerla.
            </p>
            <form
              onSubmit={onSubmit}
              className="mt-[var(--space-md)] flex flex-col gap-[var(--space-sm)]"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={error ? true : undefined}
                  required
                />
              </div>

              {error ? <Notice kind="err">{error}</Notice> : null}

              <Button type="submit" size="lg" className="mt-1 w-full" disabled={loading}>
                {loading ? 'Generando…' : 'Generar enlace'}
              </Button>
            </form>
          </>
        ) : (
          <div className="mt-[var(--space-md)] flex flex-col gap-[var(--space-sm)]">
            {/* Conditional on purpose. The backend answers identically whether or
              * not the address is registered, so this message must not confirm it
              * either — otherwise the UI re-opens the enumeration oracle the API
              * just closed. */}
            <Notice kind="ok">
              Si <span className="num">{email}</span> tiene una cuenta, generamos un enlace de
              recuperación válido por 1 hora.
            </Notice>
            <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
              Si no lo recibes, revisa que el correo sea el correcto o contacta al administrador de
              tu comercio.
            </p>

            {devToken ? (
              <div className="border-t border-[var(--color-rule)] pt-[var(--space-sm)]">
                <p className="label">Solo en desarrollo</p>
                <p className="mt-1.5 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                  No hay SMTP configurado en local, así que aquí va el enlace directo.
                </p>
                <Link
                  href={`/reset-password?token=${devToken}`}
                  className="mt-[var(--space-2xs)] inline-block text-[length:var(--text-sm)] text-[var(--color-accent)] underline-offset-4 hover:underline"
                >
                  Restablecer la contraseña ahora
                </Link>
              </div>
            ) : null}
          </div>
        )}

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
