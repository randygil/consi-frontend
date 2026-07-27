'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Notice } from '@/components/ui/page-head';
import { ThemeToggle } from '@/components/theme-toggle';
import { api } from '@/lib/api-client';
import { setStoredUser, setToken } from '@/lib/auth';

// Demo credentials stay a local convenience — they must never reach a build.
const DEV = process.env.NODE_ENV === 'development';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(DEV ? 'merchant@consi.test' : '');
  const [password, setPassword] = useState(DEV ? 'password123' : '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { accessToken, user } = await api.login(email, password);
      setToken(accessToken);
      setStoredUser(user);
      router.push(user.role === 'ADMIN' ? '/admin' : user.role === 'OPERATIONS' ? '/ops' : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-[var(--space-md)] p-[var(--space-sm)]">
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

        <h1 className="text-[length:var(--text-xl)]">Inicia sesión</h1>
        <p className="mt-1.5 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
          Accede al panel de tu comercio.
        </p>

        <form onSubmit={onSubmit} className="mt-[var(--space-md)] flex flex-col gap-[var(--space-sm)]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Link
                href="/forgot-password"
                className="text-[length:var(--text-xs)] text-[var(--color-accent)] underline-offset-4 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error ? <Notice kind="err">{error}</Notice> : null}

          <Button type="submit" size="lg" className="mt-1 w-full" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        <p className="mt-[var(--space-lg)] border-t border-[var(--color-rule)] pt-[var(--space-sm)] text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
          Consi · Pasarela de pagos multimoneda USD/VES
        </p>
      </div>
    </main>
  );
}
