'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { CustomerForm } from '@/components/dashboard/customer-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api-client';

export default function NewCustomerPage() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-strong)]"
      >
        <ArrowLeft size={16} /> Clientes
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Nuevo cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm
            submitLabel="Crear cliente"
            onSubmit={async (input) => {
              const c = await api.createCustomer(input);
              router.push(`/customers/${c.id}`);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
