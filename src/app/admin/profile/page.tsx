'use client';

/* Hallmark · genre: modern-minimal · theme: Cobalt · design-system: design.md
 * designed-as-app · macrostructure: 05 Workbench (app family) · enrichment: none
 */

import { PageHead } from '@/components/ui/page-head';
import { ProfileForm } from '@/components/profile-form';

export default function AdminProfilePage() {
  return (
    <div className="flex flex-col gap-[var(--space-md)]">
      <PageHead
        title="Mi perfil"
        lede="Tus credenciales de acceso al panel de administración de la plataforma."
      />
      <ProfileForm />
    </div>
  );
}
