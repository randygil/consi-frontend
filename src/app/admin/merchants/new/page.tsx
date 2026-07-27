'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useId, useState } from 'react';
import { Stepper } from '@/components/admin/stepper';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Notice, PageHead } from '@/components/ui/page-head';
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
    <div className="mx-auto flex max-w-2xl flex-col gap-[var(--space-md)]">
      <PageHead title="Nuevo comercio" lede="Cuatro pasos: negocio, retención, usuario, revisión." />

      <Stepper steps={STEPS} current={step} />

      <Card>
        <CardContent className="flex flex-col gap-[var(--space-sm)] p-[var(--space-md)]">
          {step === 0 ? (
            <>
              <Field label="Nombre del negocio">
                <Input
                  value={form.businessName}
                  onChange={(e) => set('businessName', e.target.value)}
                  placeholder="Comercio Caracas C.A."
                />
              </Field>
              <Field label="Correo de contacto">
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
              <p className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                Las comisiones se configuran por pasarela, no por comercio. Al crear el
                comercio se habilitan todas las pasarelas del entorno; ajústalas después en
                el detalle del comercio.
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
              <Field label="Contraseña · mín. 8 caracteres">
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={form.userPassword}
                  onChange={(e) => set('userPassword', e.target.value)}
                />
              </Field>
            </>
          ) : null}

          {step === 3 ? (
            <dl className="flex flex-col">
              <Review label="Negocio" value={form.businessName} />
              <Review label="Correo de contacto" value={form.email} />
              <Review label="Entorno" value={form.environment === 'LIVE' ? 'Real' : 'Prueba'} />
              <Review label="Retención" value={`${form.retentionDays} días`} />
              <Review label="Usuario" value={form.userEmail} />
            </dl>
          ) : null}

          {error ? <Notice kind="err">{error}</Notice> : null}

          <div className="flex justify-between gap-2 border-t border-[var(--color-rule)] pt-[var(--space-sm)]">
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

/** Generates the id so the label is actually associated with its control. */
function Field({ label, children }: { label: string; children: React.ReactElement }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {React.cloneElement(children as React.ReactElement<any>, { id })}
    </div>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-[var(--space-sm)] border-b border-[var(--color-rule)] py-2 last:border-0">
      <dt className="label shrink-0">{label}</dt>
      <dd className="truncate text-right text-[length:var(--text-sm)] text-[var(--color-ink)]">
        {value || '—'}
      </dd>
    </div>
  );
}
