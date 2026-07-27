'use client';

import { ProfileForm } from '@/components/profile-form';

export default function AdminProfilePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-[var(--text-strong)]">Mi Perfil de Administrador</h1>
      <p className="-mt-4 text-sm text-[var(--text-muted)]">
        Administra tus credenciales personales de acceso al panel de control de la plataforma.
      </p>
      <ProfileForm />
    </div>
  );
}
