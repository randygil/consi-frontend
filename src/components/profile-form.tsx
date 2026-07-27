'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api-client';
import { setStoredUser } from '@/lib/auth';

export function ProfileForm() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password && password.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (password && password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const payload: { email?: string; password?: string } = {};
      if (email && email !== user?.email) {
        payload.email = email;
      }
      if (password) {
        payload.password = password;
      }

      if (Object.keys(payload).length === 0) {
        setError('No has realizado ningún cambio');
        setLoading(false);
        return;
      }

      const updatedUser = await api.updateProfile(payload);
      
      // Update local storage and auth context if local user
      if (user) {
        const newUser = { ...user, email: updatedUser.email };
        setStoredUser(newUser);
        // We trigger page reload or let it reflect on refresh, but updating localStorage helps.
      }

      setSuccess('¡Perfil actualizado con éxito! Recarga la página para ver todos los cambios reflejados.');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Configuración de Perfil</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="role">Rol asignado</Label>
              <Input
                id="role"
                type="text"
                value={user?.role || ''}
                disabled
                className="bg-[var(--ink-50)]"
              />
            </div>
            
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="password">Nueva contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Dejar en blanco para no cambiar"
              />
            </div>

            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Dejar en blanco para no cambiar"
              />
            </div>
          </div>

          {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}
          {success ? <p className="text-sm text-green-600 font-semibold">{success}</p> : null}

          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Guardando…' : 'Guardar Cambios'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
