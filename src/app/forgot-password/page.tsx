'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [simulatedToken, setSimulatedToken] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSimulatedToken(null);
    setLoading(true);

    try {
      const result = await api.forgotPassword(email);
      setSuccess(true);
      if (result && result.resetToken) {
        setSimulatedToken(result.resetToken);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la solicitud');
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
            Recuperar contraseña
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!success ? (
            <form onSubmit={onSubmit} className="space-y-4">
              <p className="text-xs text-[var(--text-muted)]">
                Ingresa tu correo electrónico registrado y te enviaremos las instrucciones para restablecer tu contraseña.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ejemplo@consi.test"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Enviando…' : 'Enviar instrucciones'}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm border border-green-200">
                Se ha generado un token de recuperación de contraseña para tu cuenta.
              </div>
              
              {simulatedToken && (
                <div className="p-3.5 rounded-[var(--radius-sm)] border border-[var(--blue-200)] bg-[var(--blue-50)] text-xs text-[var(--blue-700)] space-y-2">
                  <p className="font-bold">🔒 Ambiente de Prueba:</p>
                  <p>Dado que no hay servidor SMTP configurado, puedes hacer clic aquí para restablecer directamente:</p>
                  <Link
                    href={`/reset-password?token=${simulatedToken}`}
                    className="font-semibold underline hover:text-blue-900 block break-all"
                  >
                    Restablecer Contraseña Ahora
                  </Link>
                </div>
              )}
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
