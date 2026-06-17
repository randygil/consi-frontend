'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Stepper } from '@/components/admin/stepper';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api-client';
import { type Environment } from '@/lib/types';

const STEPS = ['Negocio', 'Configuración', 'Usuario', 'Revisión'];

interface FormState {
  businessName: string;
  email: string;
  environment: Environment;
  retentionDays: string;
  userEmail: string;
  userPassword: string;
}

const INITIAL: FormState = {
  businessName: '',
  email: '',
  environment: 'TEST',
  retentionDays: '2',
  userEmail: '',
  userPassword: '',
};

export default function OnboardMerchantPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const emailOk = /.+@.+\..+/.test(form.email);
  const userEmailOk = /.+@.+\..+/.test(form.userEmail);
  const stepValid =
    step === 0
      ? form.businessName.trim().length > 0 && emailOk
      : step === 2
        ? userEmailOk && form.userPassword.length >= 8
        : true;

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const created = await api.adminCreateMerchant({
        businessName: form.businessName.trim(),
        email: form.email.trim(),
        environment: form.environment,
        retentionDays: Number(form.retentionDays),
        userEmail: form.userEmail.trim(),
        userPassword: form.userPassword,
      });
      router.push(`/admin/merchants/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el comercio');
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-[var(--text-strong)]">Onboarding de comercio</h1>
      <Stepper steps={STEPS} current={step} />

      <Card>
        <CardContent className="space-y-5 p-6">
          {step === 0 ? (
            <>
              <Field label="Nombre del negocio">
                <Input
                  value={form.businessName}
                  onChange={(e) => set('businessName', e.target.value)}
                  placeholder="Comercio Caracas C.A."
                />
              </Field>
              <Field label="Correo de contacto del negocio">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="contacto@comercio.com"
                />
              </Field>
              <Field label="Entorno inicial">
                <Select
                  value={form.environment}
                  onChange={(e) => set('environment', e.target.value as Environment)}
                >
                  <option value="TEST">Prueba</option>
                  <option value="LIVE">Real</option>
                </Select>
              </Field>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Field label="Días de retención">
                <Input
                  type="number"
                  value={form.retentionDays}
                  onChange={(e) => set('retentionDays', e.target.value)}
                />
              </Field>
              <p className="text-xs text-[var(--text-muted)]">
                Las comisiones y pasarelas se configuran por pasarela (no por comercio).
                Al crear el comercio se habilitan automáticamente todas las pasarelas del
                entorno; ajústalas luego en el detalle del comercio.
              </p>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Field label="Correo del primer usuario">
                <Input
                  type="email"
                  value={form.userEmail}
                  onChange={(e) => set('userEmail', e.target.value)}
                  placeholder="usuario@comercio.com"
                />
              </Field>
              <Field label="Contraseña (mín. 8 caracteres)">
                <Input
                  type="password"
                  value={form.userPassword}
                  onChange={(e) => set('userPassword', e.target.value)}
                />
              </Field>
            </>
          ) : null}

          {step === 3 ? (
            <dl className="space-y-2 text-sm">
              <Review label="Negocio" value={form.businessName} />
              <Review label="Correo de contacto" value={form.email} />
              <Review label="Entorno" value={form.environment === 'LIVE' ? 'Real' : 'Prueba'} />
              <Review label="Retención" value={`${form.retentionDays} días`} />
              <Review label="Usuario" value={form.userEmail} />
            </dl>
          ) : null}

          {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}

          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || submitting}
            >
              Atrás
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!stepValid}>
                Siguiente
              </Button>
            ) : (
              <Button onClick={submit} disabled={submitting}>
                {submitting ? 'Creando…' : 'Crear comercio'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-[var(--border)] pb-2">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="font-semibold text-[var(--text-strong)]">{value}</dd>
    </div>
  );
}
