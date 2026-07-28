'use client';

/* Hallmark · genre: modern-minimal · macrostructure: 05 Workbench
 * design-system: design.md · theme: Cobalt (light + dark)
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Column, DataTable } from '@/components/ui/data-table';
import { PageHead } from '@/components/ui/page-head';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import type { Customer } from '@/lib/types';

const COLUMNS: Column<Customer>[] = [
  {
    id: 'name',
    header: 'Nombre',
    value: (c) => `${c.firstName} ${c.lastName}`,
    cell: (c) => (
      <Link
        href={`/customers/${c.id}`}
        className="font-medium text-[var(--color-ink)] underline-offset-4 transition-colors duration-[var(--dur-fast)] hover:text-[var(--color-accent)] hover:underline"
      >
        {c.firstName} {c.lastName}
      </Link>
    ),
  },
  { id: 'email', header: 'Correo', value: (c) => c.email },
  { id: 'cedula', header: 'Cédula', num: true, align: 'left', value: (c) => c.cedula ?? '' },
  { id: 'phone', header: 'Teléfono', num: true, align: 'left', value: (c) => c.phone ?? '' },
  {
    id: 'transactions',
    header: 'Transacciones',
    num: true,
    value: (c) => c._count?.transactions ?? 0,
  },
  {
    id: 'createdAt',
    header: 'Registrado',
    num: true,
    value: (c) => c.createdAt,
    text: (c) => formatDate(c.createdAt),
    cell: (c) => (
      <span className="whitespace-nowrap text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
        {formatDate(c.createdAt)}
      </span>
    ),
  },
];

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The endpoint matches across every customer, not just the loaded page, so
  // the search is debounced and delegated rather than filtered client-side.
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      api
        .getCustomers({ search })
        .then((r) => {
          setCustomers(r.data);
          setTotal(r.total);
          setError(null);
        })
        .catch((e) => setError(e instanceof Error ? e.message : 'Error'))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="flex flex-col gap-[var(--space-md)]">
      <PageHead
        title="Clientes"
        lede={`${total} ${total === 1 ? 'pagador registrado' : 'pagadores registrados'}.`}
        action={
          <Link href="/customers/new" className={buttonVariants()}>
            <Plus size={15} /> Nuevo cliente
          </Link>
        }
      />

      <Card className="p-[var(--space-md)]">
        <DataTable
          id="customers"
          caption="Clientes"
          columns={COLUMNS}
          rows={customers}
          rowKey={(c) => c.id}
          loading={loading}
          error={error}
          empty="No hay clientes todavía."
          searchPlaceholder="Buscar por nombre, correo, cédula o teléfono…"
          onSearchChange={setSearch}
          defaultSort={{ id: 'createdAt', dir: 'desc' }}
          exportFilename="clientes_consi"
        />
      </Card>
    </div>
  );
}
