'use client';

/* Hallmark · genre: modern-minimal · macrostructure: 05 Workbench
 * design-system: design.md · theme: Cobalt (light + dark)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertOctagon, CheckCircle2, RefreshCw, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Column, DataTable } from '@/components/ui/data-table';
import { Notice, PageHead } from '@/components/ui/page-head';
import { api } from '@/lib/api-client';
import { formatDate, formatMoney } from '@/lib/format';
import type { Dispute } from '@/lib/types';

const STATUS: Record<Dispute['status'], { text: string; tone: string }> = {
  PENDING_EVIDENCE: {
    text: 'Pendiente de evidencia',
    tone: 'text-[var(--color-warn)] bg-[var(--color-warn-soft)]',
  },
  UNDER_REVIEW: {
    text: 'En revisión',
    tone: 'text-[var(--color-accent)] bg-[var(--color-accent-soft)]',
  },
  WON: { text: 'Ganada', tone: 'text-[var(--color-ok)] bg-[var(--color-ok-soft)]' },
  LOST: { text: 'Perdida', tone: 'text-[var(--color-bad)] bg-[var(--color-bad-soft)]' },
};

function DisputeBadge({ status }: { status: Dispute['status'] }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-xs)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] font-medium uppercase tracking-[var(--tracking-mono-label)] ${STATUS[status].tone}`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {STATUS[status].text}
    </span>
  );
}

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Dispute | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDisputes(await api.getDisputes());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar disputas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns = useMemo<Column<Dispute>[]>(
    () => [
      {
        id: 'id',
        header: 'Disputa',
        num: true,
        align: 'left',
        value: (d) => d.id,
        cell: (d) => (
          <span className="text-[length:var(--text-xs)] text-[var(--color-ink)]">
            {d.id.slice(0, 10)}
          </span>
        ),
      },
      {
        id: 'transaction',
        header: 'Transacción',
        num: true,
        align: 'left',
        value: (d) => d.transaction.reference,
        cell: (d) => (
          <span className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
            {d.transaction.reference.slice(0, 14)}
          </span>
        ),
      },
      {
        id: 'currency',
        header: 'Moneda',
        num: true,
        align: 'left',
        value: (d) => d.transaction.currency,
      },
      {
        id: 'amount',
        header: 'Monto disputado',
        num: true,
        value: (d) => Number(d.amount),
        text: (d) => formatMoney(d.amount, d.transaction.currency),
        cell: (d) => (
          <span className="text-[var(--color-bad)]">
            {formatMoney(d.amount, d.transaction.currency)}
          </span>
        ),
      },
      {
        id: 'reason',
        header: 'Motivo',
        value: (d) => d.reason,
        cell: (d) => (
          <span className="block max-w-[28ch] truncate text-[length:var(--text-sm)]">
            {d.reason}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Estado',
        value: (d) => d.status,
        text: (d) => STATUS[d.status].text,
        cell: (d) => <DisputeBadge status={d.status} />,
      },
      {
        id: 'createdAt',
        header: 'Reportada',
        num: true,
        value: (d) => d.createdAt,
        text: (d) => formatDate(d.createdAt),
        cell: (d) => (
          <span className="whitespace-nowrap text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
            {formatDate(d.createdAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Acciones',
        align: 'right',
        pinned: true,
        sortable: false,
        searchable: false,
        exportable: false,
        cell: (d) => (
          <Button size="sm" variant="outline" onClick={() => setActive(d)}>
            Gestionar
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-[var(--space-md)]">
      <PageHead
        title="Disputas"
        lede="Cargos desconocidos por tus clientes. Presenta evidencia digital para revertir el débito ante la red bancaria."
        action={
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw size={14} /> Actualizar
          </Button>
        }
      />

      <Card className="p-[var(--space-md)]">
        <DataTable
          id="disputes"
          caption="Contracargos reportados"
          columns={columns}
          rows={disputes}
          rowKey={(d) => d.id}
          loading={loading}
          error={error}
          empty="No tienes contracargos registrados."
          searchPlaceholder="Buscar por referencia o motivo…"
          defaultSort={{ id: 'createdAt', dir: 'desc' }}
          exportFilename="disputas_consi"
        />
      </Card>

      {active ? (
        <DisputeDialog
          dispute={active}
          onClose={() => setActive(null)}
          onChanged={(updated) => {
            setActive(updated);
            load();
          }}
        />
      ) : null}
    </div>
  );
}

function DisputeDialog({
  dispute,
  onClose,
  onChanged,
}: {
  dispute: Dispute;
  onClose: () => void;
  onChanged: (d: Dispute) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function run(key: string, fn: () => Promise<Dispute>) {
    setBusy(key);
    setError(null);
    try {
      onChanged(await fn());
      setFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'La acción falló');
    } finally {
      setBusy(null);
    }
  }

  const facts = [
    { label: 'Referencia', value: dispute.transaction.reference, num: true },
    {
      label: 'Monto debitado',
      value: formatMoney(dispute.amount, dispute.transaction.currency),
      num: true,
    },
    { label: 'Motivo del banco', value: dispute.reason },
    { label: 'Estado', value: STATUS[dispute.status].text },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-scrim)] p-[var(--space-sm)]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby="dispute-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-[var(--space-md)]"
      >
        <div className="flex items-start justify-between gap-[var(--space-sm)]">
          <div className="min-w-0">
            <h2 id="dispute-title" className="text-[length:var(--text-md)]">
              Detalle de contracargo
            </h2>
            <p className="num mt-1 truncate text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
              {dispute.id}
            </p>
          </div>
          <DisputeBadge status={dispute.status} />
        </div>

        <dl className="mt-[var(--space-sm)] divide-y divide-[var(--color-rule)] rounded-[var(--radius-sm)] border border-[var(--color-rule)]">
          {facts.map((f) => (
            <div key={f.label} className="flex items-baseline justify-between gap-3 px-3 py-2">
              <dt className="label shrink-0">{f.label}</dt>
              <dd
                className={`text-right text-[length:var(--text-sm)] text-[var(--color-ink)] ${f.num ? 'num' : ''}`}
              >
                {f.value}
              </dd>
            </div>
          ))}
        </dl>

        {dispute.evidenceUrl ? (
          <div className="mt-[var(--space-sm)] flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--color-rule)] px-3 py-2">
            <span className="flex min-w-0 items-center gap-1.5 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
              <CheckCircle2 size={14} className="shrink-0 text-[var(--color-ok)]" aria-hidden />
              <span className="truncate">{dispute.evidenceUrl.split('/').pop()}</span>
            </span>
            <a
              href={dispute.evidenceUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 whitespace-nowrap text-[length:var(--text-sm)] text-[var(--color-accent)] underline-offset-4 hover:underline"
            >
              Ver archivo
            </a>
          </div>
        ) : null}

        {dispute.status === 'PENDING_EVIDENCE' ? (
          <div className="mt-[var(--space-sm)] flex flex-col gap-[var(--space-xs)] rounded-[var(--radius-sm)] border border-dashed border-[var(--color-rule)] p-[var(--space-sm)]">
            <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-ink)]">
              Cargar evidencia
            </p>
            <p className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
              Un PDF o imagen que compruebe la entrega del producto o servicio: recibo, guía de
              envío, conversación o firma.
            </p>
            <input
              type="file"
              id="evidence"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy !== null}
                onClick={() => document.getElementById('evidence')?.click()}
              >
                <Upload size={14} />
                <span className="max-w-[22ch] truncate">
                  {file ? file.name : 'Seleccionar documento'}
                </span>
              </Button>
              {file ? (
                <Button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => run('upload', () => api.uploadEvidence(dispute.id, file))}
                >
                  {busy === 'upload' ? 'Cargando…' : 'Subir'}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mt-[var(--space-sm)]">
            <Notice kind="err">{error}</Notice>
          </div>
        ) : null}

        {dispute.status === 'PENDING_EVIDENCE' && dispute.evidenceUrl ? (
          <Button
            className="mt-[var(--space-sm)] w-full"
            disabled={busy !== null}
            onClick={() => run('submit', () => api.submitDispute(dispute.id))}
          >
            {busy === 'submit' ? 'Enviando…' : 'Presentar evidencia al banco'}
          </Button>
        ) : null}

        {dispute.status === 'UNDER_REVIEW' ? (
          <div className="mt-[var(--space-sm)] flex flex-col gap-[var(--space-xs)] rounded-[var(--radius-sm)] border-l-2 border-[var(--color-warn)] bg-[var(--color-warn-soft)] px-3 py-2.5">
            <p className="text-[length:var(--text-sm)] font-medium text-[var(--color-warn)]">
              Simulación sandbox
            </p>
            <p className="text-[length:var(--text-xs)] text-[var(--color-ink-2)]">
              Simula el fallo que emitiría la red bancaria tras auditar tu evidencia. Ganar devuelve
              los fondos a tu wallet de inmediato.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                disabled={busy !== null}
                onClick={() => run('won', () => api.resolveDispute(dispute.id, 'WON'))}
              >
                {busy === 'won' ? '…' : 'Simular ganada'}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy !== null}
                onClick={() => run('lost', () => api.resolveDispute(dispute.id, 'LOST'))}
              >
                {busy === 'lost' ? '…' : 'Simular perdida'}
              </Button>
            </div>
          </div>
        ) : null}

        {dispute.status === 'WON' ? (
          <div className="mt-[var(--space-sm)]">
            <Notice kind="ok">
              La red bancaria falló a tu favor. Los{' '}
              <span className="num">
                {formatMoney(dispute.amount, dispute.transaction.currency)}
              </span>{' '}
              fueron acreditados de nuevo a tu cuenta.
            </Notice>
          </div>
        ) : null}

        {dispute.status === 'LOST' ? (
          <div className="mt-[var(--space-sm)] flex items-start gap-2 rounded-[var(--radius-sm)] border-l-2 border-[var(--color-bad)] bg-[var(--color-bad-soft)] px-3 py-2 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
            <AlertOctagon size={15} className="mt-0.5 shrink-0 text-[var(--color-bad)]" aria-hidden />
            La red falló a favor del tarjetahabiente. El débito queda confirmado.
          </div>
        ) : null}

        <div className="mt-[var(--space-md)] flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </Card>
    </div>
  );
}
