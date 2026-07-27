'use client';

import { ProfileForm } from '@/components/profile-form';

export default function MerchantProfilePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-[var(--text-strong)]">Mi Perfil</h1>
      <p className="-mt-4 text-sm text-[var(--text-muted)]">
        Administra tus credenciales personales de acceso.
      </p>
      <ProfileForm />
    </div>
  );
}
