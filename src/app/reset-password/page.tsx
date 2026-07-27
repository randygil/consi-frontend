'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api-client';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-[var(--text-muted)]">Cargando formulario…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (!token) {
      setError('Token de recuperación no válido');
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword({ token, password });
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="text-2xl font-bold tracking-tight">Consi Pagos</div>
          <p className="text-sm text-[var(--muted-foreground)]">
            Restablecer contraseña
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!token ? (
            <div className="p-3 bg-red-50 text-[var(--destructive)] rounded-md text-sm border border-red-200">
              El enlace de recuperación es inválido o no contiene un token. Vuelve a solicitar un enlace.
            </div>
          ) : !success ? (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">Nueva contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  required
                />
              </div>
              {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Guardando…' : 'Guardar contraseña'}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm border border-green-200">
                ¡Contraseña restablecida con éxito! Redirigiéndote al inicio de sesión…
              </div>
              <Button onClick={() => router.push('/login')} className="w-full">
                Ir al login inmediatamente
              </Button>
            </div>
          )}

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-strong)]"
            >
              <ArrowLeft size={14} /> Volver al inicio de sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
