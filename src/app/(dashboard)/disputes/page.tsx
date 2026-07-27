'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShieldAlert, FileText, Upload, CheckCircle2, AlertTriangle, AlertOctagon, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';
import { formatDate, formatMoney } from '@/lib/format';
import type { Dispute } from '@/lib/types';

const STATUS_LABELS: Record<string, string> = {
  PENDING_EVIDENCE: 'Pendiente de Evidencia',
  UNDER_REVIEW: 'En Revisión del Banco',
  WON: 'Ganada (Fondos Revertidos)',
  LOST: 'Perdida',
};

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeDispute, setActiveDispute] = useState<Dispute | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resolving, setResolving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDisputes();
      setDisputes(data);
    } catch (e: any) {
      setError(e.message || 'Error al cargar disputas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!activeDispute || !selectedFile) return;
    setUploading(true);
    setError(null);
    try {
      const updated = await api.uploadEvidence(activeDispute.id, selectedFile);
      setActiveDispute(updated);
      setSelectedFile(null);
      load();
    } catch (err: any) {
      setError(err.message || 'Error al subir la evidencia');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!activeDispute) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await api.submitDispute(activeDispute.id);
      setActiveDispute(updated);
      load();
    } catch (err: any) {
      setError(err.message || 'Error al enviar a revisión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveSimulation = async (status: 'WON' | 'LOST') => {
    if (!activeDispute) return;
    setResolving(true);
    setError(null);
    try {
      // Direct call to resolution (forces ADMIN authorization on the backend, which succeeds since it's demo)
      const updated = await api.resolveDispute(activeDispute.id, status);
      setActiveDispute(updated);
      load();
    } catch (err: any) {
      setError(err.message || 'Error al simular resolución');
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Gestión de Disputas y Contracargos</h1>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-[var(--foreground)]">
            Contracargos Reportados
          </CardTitle>
          <p className="text-xs text-[var(--muted-foreground)]">
            Aquí puedes ver los cargos desconocidos por tus clientes y presentar las evidencias digitales correspondientes para revertir los débitos ante Visa/Mastercard.
          </p>
        </CardHeader>
        <CardContent>
          {loading && disputes.length === 0 ? (
            <div className="py-10 text-center text-sm text-[var(--muted-foreground)]">Cargando disputas…</div>
          ) : disputes.length === 0 ? (
            <div className="py-10 text-center text-sm text-[var(--muted-foreground)]">
              No tienes contracargos registrados en este momento. ¡Buen trabajo!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID de Disputa</TableHead>
                  <TableHead>Transacción Original</TableHead>
                  <TableHead>Monto Disputado</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Reporte</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes.map((dispute) => (
                  <TableRow key={dispute.id} className="cursor-pointer" onClick={() => setActiveDispute(dispute)}>
                    <TableCell className="font-mono text-xs font-semibold">{dispute.id.slice(0, 10)}</TableCell>
                    <TableCell className="font-mono text-xs text-[var(--muted-foreground)]">
                      {dispute.transaction.reference.slice(0, 14)}
                    </TableCell>
                    <TableCell className="font-semibold text-[var(--destructive)]">
                      {formatMoney(dispute.amount, dispute.transaction.currency)}
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{dispute.reason}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs font-bold ${
                        dispute.status === 'WON' ? 'bg-[var(--success-100)] text-[var(--success-700)]' :
                        dispute.status === 'LOST' ? 'bg-[var(--danger-100)] text-[var(--danger-700)]' :
                        dispute.status === 'UNDER_REVIEW' ? 'bg-[var(--blue-100)] text-[var(--blue-700)]' :
                        'bg-[var(--warning-100)] text-[var(--warning-700)]'
                      }`}>
                        {STATUS_LABELS[dispute.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-[var(--muted-foreground)]">{formatDate(dispute.createdAt)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">
                        Gestionar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dispute Detail / Evidence Upload Modal */}
      {activeDispute && (() => {
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <Card className="w-full max-w-lg p-6 bg-white border border-[var(--border)] shadow-[var(--shadow-lg)] max-h-[90vh] overflow-y-auto">
              <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-[var(--text-strong)] flex items-center gap-2">
                    <ShieldAlert className="text-[var(--destructive)]" size={20} />
                    Detalle de Contracargo
                  </CardTitle>
                  <p className="text-[11px] font-mono text-[var(--text-muted)] mt-1">Disputa ID: {activeDispute.id}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setActiveDispute(null); setSelectedFile(null); }}>
                  ✖
                </Button>
              </CardHeader>
              <CardContent className="p-0 space-y-5">
                {/* Transaction details block */}
                <div className="rounded-md border border-[var(--ink-100)] divide-y divide-[var(--ink-100)] bg-[var(--ink-50)] text-xs">
                  <div className="p-3 flex justify-between">
                    <span className="font-bold text-[var(--text-muted)]">Transacción Ref:</span>
                    <span className="font-mono">{activeDispute.transaction.reference}</span>
                  </div>
                  <div className="p-3 flex justify-between">
                    <span className="font-bold text-[var(--text-muted)]">Monto Debitado:</span>
                    <span className="font-bold text-[var(--destructive)]">
                      {formatMoney(activeDispute.amount, activeDispute.transaction.currency)}
                    </span>
                  </div>
                  <div className="p-3 flex justify-between">
                    <span className="font-bold text-[var(--text-muted)]">Motivo del Banco:</span>
                    <span className="text-[var(--text-strong)] font-semibold">{activeDispute.reason}</span>
                  </div>
                  <div className="p-3 flex justify-between">
                    <span className="font-bold text-[var(--text-muted)]">Estado Actual:</span>
                    <span className="font-extrabold">{STATUS_LABELS[activeDispute.status]}</span>
                  </div>
                </div>

                {/* Evidence Upload Section */}
                {activeDispute.status === 'PENDING_EVIDENCE' && (
                  <div className="space-y-3.5 border border-dashed border-[var(--ink-200)] rounded-md p-4 bg-white">
                    <h4 className="text-xs font-bold text-[var(--text-strong)] flex items-center gap-1.5">
                      <FileText size={15} className="text-[var(--blue-600)]" />
                      Cargar Evidencia (Recibos, Guías de Envío, Chats, Firma)
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Sube un documento en PDF o imagen que compruebe que el servicio o producto fue entregado.
                    </p>

                    {activeDispute.evidenceUrl ? (
                      <div className="flex items-center justify-between rounded bg-[var(--success-50)] p-2.5 text-xs text-[var(--success-700)] border border-[var(--success-200)]">
                        <span className="truncate font-semibold flex items-center gap-1.5">
                          <CheckCircle2 size={15} /> Documento subido: {activeDispute.evidenceUrl.split('/').pop()}
                        </span>
                        <a href={activeDispute.evidenceUrl} target="_blank" rel="noreferrer" className="underline font-bold text-[var(--blue-700)] ml-2">
                          Ver archivo
                        </a>
                      </div>
                    ) : null}

                    <div className="flex gap-2.5 items-center">
                      <input
                        type="file"
                        id="evidence-file-input"
                        onChange={handleFileChange}
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('evidence-file-input')?.click()}
                        disabled={uploading}
                        className="w-full gap-1.5 text-xs text-[var(--text-body)]"
                      >
                        <Upload size={14} />
                        {selectedFile ? selectedFile.name : 'Seleccionar Documento'}
                      </Button>
                      {selectedFile && (
                        <Button
                          type="button"
                          onClick={handleUpload}
                          disabled={uploading}
                          className="text-xs"
                        >
                          {uploading ? 'Cargando…' : 'Subir'}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* File link for under review or finished disputes */}
                {activeDispute.status !== 'PENDING_EVIDENCE' && activeDispute.evidenceUrl && (
                  <div className="rounded border border-[var(--ink-100)] p-3 bg-white text-xs flex justify-between items-center">
                    <span className="font-semibold text-[var(--text-muted)]">Documento de Evidencia:</span>
                    <a href={activeDispute.evidenceUrl} target="_blank" rel="noreferrer" className="underline font-bold text-[var(--blue-700)]">
                      Ver Evidencia Presentada
                    </a>
                  </div>
                )}

                {error && (
                  <p className="text-xs text-[var(--destructive)] font-semibold bg-[var(--danger-100)] p-2 rounded-md">
                    {error}
                  </p>
                )}

                {/* Submitting Evidence to Bank */}
                {activeDispute.status === 'PENDING_EVIDENCE' && activeDispute.evidenceUrl && (
                  <Button
                    onClick={handleSubmitReview}
                    disabled={submitting}
                    className="w-full font-bold text-white bg-[var(--blue-600)] hover:bg-[var(--blue-700)] shadow-sm py-3"
                  >
                    {submitting ? 'Enviando…' : 'Presentar Evidencia para Revisión Bancaria'}
                  </Button>
                )}

                {/* SIMULATOR RESOLUTION PANEL (DX/QA Sandbox) */}
                {activeDispute.status === 'UNDER_REVIEW' && (
                  <div className="rounded-md border border-[var(--warning-200)] p-4 bg-[var(--warning-50)] space-y-3">
                    <h4 className="text-xs font-bold text-[var(--warning-800)] flex items-center gap-1.5">
                      <AlertTriangle size={15} />
                      Simulación Sandbox (Acciones de Red Bancaria)
                    </h4>
                    <p className="text-[11px] text-[var(--warning-700)] leading-relaxed">
                      Utiliza estos botones para simular la resolución que tomaría la red bancaria (Visa/Mastercard) tras auditar tu evidencia. Ganar la disputa devolverá los fondos a tu wallet inmediatamente.
                    </p>
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <Button
                        size="sm"
                        onClick={() => handleResolveSimulation('WON')}
                        disabled={resolving}
                        className="bg-[var(--success-600)] hover:bg-[var(--success-700)] text-white font-bold text-xs"
                      >
                        Simular GANADA (Devolver Fondos)
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleResolveSimulation('LOST')}
                        disabled={resolving}
                        className="font-bold text-xs"
                      >
                        Simular PERDIDA
                      </Button>
                    </div>
                  </div>
                )}

                {/* Resolution Outcomes info messages */}
                {activeDispute.status === 'WON' && (
                  <div className="rounded bg-[var(--success-50)] p-3 text-xs text-[var(--success-700)] border border-[var(--success-200)] flex items-start gap-2">
                    <CheckCircle2 size={16} className="mt-0.5" />
                    <div>
                      <span className="font-bold">¡Disputa ganada!</span> La red bancaria falló a tu favor. Los fondos disputados ({formatMoney(activeDispute.amount, activeDispute.transaction.currency)}) han sido acreditados nuevamente a tu cuenta comercial.
                    </div>
                  </div>
                )}

                {activeDispute.status === 'LOST' && (
                  <div className="rounded bg-[var(--danger-50)] p-3 text-xs text-[var(--danger-700)] border border-[var(--danger-200)] flex items-start gap-2">
                    <AlertOctagon size={16} className="mt-0.5" />
                    <div>
                      <span className="font-bold">Disputa perdida.</span> La red bancaria falló a favor del tarjetahabiente. El débito temporal queda confirmado de forma definitiva.
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setActiveDispute(null); setSelectedFile(null); }}>
                    Cerrar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}
    </div>
  );
}
