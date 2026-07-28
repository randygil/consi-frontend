'use client';

/* Hallmark · genre: modern-minimal · theme: Cobalt · design-system: design.md
 * designed-as-app · macrostructure: 05 Workbench (app family) · enrichment: none
 *
 * Lives inside the (dashboard) route group on purpose. At src/app/profile it
 * resolved to the same /profile URL but outside the group's layout, so it had no
 * rail, no header and — because AuthProvider lives in that layout — no session:
 * useAuth() fell through to the default context and the form rendered blank.
 */

import { PageHead } from '@/components/ui/page-head';
import { ProfileForm } from '@/components/profile-form';

export default function MerchantProfilePage() {
  return (
    <div className="flex flex-col gap-[var(--space-md)]">
      <PageHead
        title="Mi perfil"
        lede="Tus credenciales de acceso al panel. Los datos del comercio se editan en Ajustes."
      />
      <ProfileForm />
    </div>
  );
}
