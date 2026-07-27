'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { CustomerForm } from '@/components/dashboard/customer-form';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api-client';
import { formatDate, formatMoney } from '@/lib/format';
import type { Customer, Transaction } from '@/lib/types';

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </dt>
      <dd className="text-sm text-[var(--text-strong)]">{value || '—'}</dd>
    </div>
  );
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!params.id) return;
    api.getCustomer(params.id).then(setCustomer).catch((e) => setError(e.message));
    api.getCustomerTransactions(params.id).then(setTxns).catch(() => {});
  }

  useEffect(load, [params.id]);

  if (error) return <p className="p-6 text-sm text-[var(--red-600)]">{error}</p>;
  if (!customer) return <p className="p-6 text-sm text-[var(--text-muted)]">Cargando…</p>;

  return (
    <div className="space-y-6">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-strong)]"
      >
        <ArrowLeft size={16} /> Clientes
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {customer.firstName} {customer.lastName}
          </CardTitle>
          {!editing && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil size={15} /> Editar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editing ? (
            <CustomerForm
              initial={customer}
              submitLabel="Guardar cambios"
              onSubmit={async (input) => {
                await api.updateCustomer(customer.id, input);
                setEditing(false);
                load();
              }}
            />
          ) : (
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Correo" value={customer.email} />
              <Field label="Cédula / RIF" value={customer.cedula} />
              <Field label="Teléfono" value={customer.phone} />
              <Field label="País" value={customer.country} />
              <Field label="Dirección" value={customer.address} />
              <Field label="Registrado" value={formatDate(customer.createdAt)} />
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transacciones</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {txns.length === 0 ? (
            <p className="p-6 text-sm text-[var(--text-muted)]">Sin transacciones.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txns.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.reference}</TableCell>
                    <TableCell>{t.type}</TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoney(t.amount, t.currency)}
                    </TableCell>
                    <TableCell>{formatDate(t.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
