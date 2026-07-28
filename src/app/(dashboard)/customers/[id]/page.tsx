'use client';

/* Hallmark · genre: modern-minimal · macrostructure: 05 Workbench
 * design-system: design.md · theme: Cobalt (light + dark)
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { CustomerForm } from '@/components/dashboard/customer-form';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Column, DataTable } from '@/components/ui/data-table';
import { Notice, PageHead } from '@/components/ui/page-head';
import { api } from '@/lib/api-client';
import { formatDate, formatMoney, statusLabel, typeLabel } from '@/lib/format';
import type { Customer, Transaction } from '@/lib/types';

const COLUMNS: Column<Transaction>[] = [
  {
    id: 'reference',
    header: 'Referencia',
    num: true,
    align: 'left',
    value: (t) => t.reference,
    cell: (t) => (
      <span className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">{t.reference}</span>
    ),
  },
  { id: 'type', header: 'Tipo', value: (t) => t.type, text: (t) => typeLabel(t.type), cell: (t) => typeLabel(t.type) },
  { id: 'currency', header: 'Moneda', num: true, align: 'left', value: (t) => t.currency },
  {
    id: 'amount',
    header: 'Monto',
    num: true,
    value: (t) => Number(t.amount),
    text: (t) => formatMoney(t.amount, t.currency),
    cell: (t) => <span className="text-[var(--color-ink)]">{formatMoney(t.amount, t.currency)}</span>,
  },
  {
    id: 'status',
    header: 'Estado',
    value: (t) => t.status,
    text: (t) => statusLabel(t.status),
    cell: (t) => <StatusBadge status={t.status} />,
  },
  {
    id: 'createdAt',
    header: 'Fecha',
    num: true,
    value: (t) => t.createdAt,
    text: (t) => formatDate(t.createdAt),
    cell: (t) => (
      <span className="whitespace-nowrap text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
        {formatDate(t.createdAt)}
      </span>
    ),
  },
];

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="mt-0.5 text-[length:var(--text-sm)] text-[var(--color-ink)]">{value || '—'}</dd>
    </div>
  );
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    api.getCustomer(params.id).then(setCustomer).catch((e) => setError(e.message));
    api
      .getCustomerTransactions(params.id)
      .then(setTxns)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  function reload() {
    if (!params.id) return;
    api.getCustomer(params.id).then(setCustomer).catch((e) => setError(e.message));
  }

  if (error) return <Notice kind="err">{error}</Notice>;
  if (!customer) {
    return <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">Cargando…</p>;
  }

  return (
    <div className="flex flex-col gap-[var(--space-md)]">
      <Link
        href="/customers"
        className="inline-flex w-fit items-center gap-1.5 text-[length:var(--text-sm)] text-[var(--color-ink-3)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--color-accent)]"
      >
        <ArrowLeft size={15} /> Clientes
      </Link>

      <PageHead
        title={`${customer.firstName} ${customer.lastName}`}
        lede={customer.email}
        action={
          editing ? undefined : (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil size={14} /> Editar
            </Button>
          )
        }
      />

      <Card className="p-[var(--space-md)]">
        {editing ? (
          <CustomerForm
            initial={customer}
            submitLabel="Guardar cambios"
            onSubmit={async (input) => {
              await api.updateCustomer(customer.id, input);
              setEditing(false);
              reload();
            }}
          />
        ) : (
          <dl className="grid grid-cols-1 gap-[var(--space-sm)] sm:grid-cols-3">
            <Field label="Correo" value={customer.email} />
            <Field label="Cédula / RIF" value={customer.cedula} />
            <Field label="Teléfono" value={customer.phone} />
            <Field label="País" value={customer.country} />
            <Field label="Dirección" value={customer.address} />
            <Field label="Registrado" value={formatDate(customer.createdAt)} />
          </dl>
        )}
      </Card>

      <Card className="p-[var(--space-md)]">
        <h2 className="mb-[var(--space-sm)] text-[length:var(--text-md)]">Transacciones</h2>
        <DataTable
          id="customer-transactions"
          caption={`Transacciones de ${customer.firstName} ${customer.lastName}`}
          columns={COLUMNS}
          rows={txns}
          rowKey={(t) => t.id}
          loading={loading}
          empty="Sin transacciones."
          searchPlaceholder="Buscar por referencia…"
          defaultSort={{ id: 'createdAt', dir: 'desc' }}
          exportFilename={`transacciones_${customer.lastName.toLowerCase()}`}
        />
      </Card>
    </div>
  );
}
