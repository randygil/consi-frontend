'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import type { Customer } from '@/lib/types';

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-strong)]">
            Clientes
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Pagadores registrados {total ? `· ${total}` : ''}
          </p>
        </div>
        <Link href="/customers/new">
          <Button>
            <Plus size={16} /> Nuevo cliente
          </Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
        />
        <Input
          className="pl-9"
          placeholder="Buscar por nombre, correo, cédula o teléfono…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {error ? (
            <p className="p-6 text-sm text-[var(--red-600)]">{error}</p>
          ) : loading ? (
            <p className="p-6 text-sm text-[var(--text-muted)]">Cargando…</p>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-12 text-center text-[var(--text-muted)]">
              <Users size={32} />
              <p className="text-sm">No hay clientes todavía.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Cédula</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="text-right">Transacciones</TableHead>
                  <TableHead>Registrado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => (window.location.href = `/customers/${c.id}`)}
                  >
                    <TableCell className="font-semibold text-[var(--text-strong)]">
                      {c.firstName} {c.lastName}
                    </TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.cedula ?? '—'}</TableCell>
                    <TableCell>{c.phone ?? '—'}</TableCell>
                    <TableCell className="text-right">{c._count?.transactions ?? 0}</TableCell>
                    <TableCell>{formatDate(c.createdAt)}</TableCell>
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
