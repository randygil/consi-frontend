'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CustomerInput } from '@/lib/types';

const FIELDS: { key: keyof CustomerInput; label: string; required?: boolean; type?: string }[] = [
  { key: 'firstName', label: 'Nombre', required: true },
  { key: 'lastName', label: 'Apellido', required: true },
  { key: 'email', label: 'Correo', required: true, type: 'email' },
  { key: 'cedula', label: 'Cédula / RIF' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'country', label: 'País' },
  { key: 'address', label: 'Dirección' },
];

export function CustomerForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Partial<Record<keyof CustomerInput, string | null>>;
  submitLabel: string;
  onSubmit: (input: CustomerInput) => Promise<void>;
}) {
  const [form, setForm] = useState<CustomerInput>({
    firstName: initial?.firstName ?? '',
    lastName: initial?.lastName ?? '',
    email: initial?.email ?? '',
    cedula: initial?.cedula ?? '',
    phone: initial?.phone ?? '',
    country: initial?.country ?? '',
    address: initial?.address ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      // Drop empty optionals so they aren't stored as "".
      const clean = Object.fromEntries(
        Object.entries(form).filter(([, v]) => String(v).trim() !== ''),
      ) as unknown as CustomerInput;
      await onSubmit(clean);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {FIELDS.map(({ key, label, required, type }) => (
        <div key={key} className={key === 'address' ? 'sm:col-span-2' : undefined}>
          <Label htmlFor={key}>
            {label}
            {required ? <span className="text-[var(--red-600)]"> *</span> : null}
          </Label>
          <Input
            id={key}
            type={type ?? 'text'}
            required={required}
            value={form[key] ?? ''}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          />
        </div>
      ))}
      {error ? <p className="text-sm text-[var(--red-600)] sm:col-span-2">{error}</p> : null}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
