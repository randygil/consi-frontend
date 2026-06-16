'use client';

import {
  Building2,
  CheckCircle2,
  Coins,
  Copy,
  CreditCard,
  Loader2,
  Lock,
  Smartphone,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { checkoutApi } from '@/lib/checkout-client';
import { formatMoney } from '@/lib/format';
import type {
  CheckoutData,
  PaymentInstructions,
  PaymentMethod,
} from '@/lib/types';

const METHOD_ICON: Record<PaymentMethod, React.ReactNode> = {
  PAGO_MOVIL: <Smartphone size={20} />,
  TRANSFER: <Building2 size={20} />,
  USDT: <Coins size={20} />,
  CARD: <CreditCard size={20} />,
};

type Step = 'method' | 'instructions' | 'done';

export default function CheckoutPage() {
  const token = String(useParams().token);
  const [data, setData] = useState<CheckoutData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('method');
  const [instructions, setInstructions] = useState<PaymentInstructions | null>(null);
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Always start at method selection. Links are reusable, so a previously-paid
    // link can be paid again — we don't jump straight to the confirmed screen.
    checkoutApi
      .get(token)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'));
  }, [token]);

  // Poll the charge status while the payer is on the instructions step.
  useEffect(() => {
    if (step !== 'instructions') return;
    const id = setInterval(() => {
      checkoutApi.status(token).then((s) => {
        if (s.status === 'PAID') {
          setStep('done');
          clearInterval(id);
        }
      });
    }, 3000);
    return () => clearInterval(id);
  }, [step, token]);

  const choose = useCallback(
    async (m: PaymentMethod) => {
      setBusy(true);
      setError(null);
      try {
        const res = await checkoutApi.pay(token, m);
        setInstructions(res.instructions);
        setStep('instructions');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error');
      } finally {
        setBusy(false);
      }
    },
    [token],
  );

  const confirm = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await checkoutApi.confirm(token, reference.trim() || undefined);
      if (res.status === 'PAID') {
        setStep('done');
      } else {
        setError('No pudimos confirmar el pago todavía. Verifica la referencia e intenta de nuevo.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }, [token, reference]);

  if (error && !data) {
    return (
      <Shell>
        <p className="text-center text-sm text-[var(--danger-600)]">{error}</p>
      </Shell>
    );
  }
  if (!data) {
    return (
      <Shell>
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-[var(--text-subtle)]" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell businessName={data.businessName}>
      <AmountBlock data={data} />

      {step === 'method' && (
        <div className="space-y-2.5">
          <p className="text-[13px] font-semibold text-[var(--text-muted)]">
            Elige cómo pagar
          </p>
          {data.methods.map((m) => (
            <button
              key={m.method}
              type="button"
              disabled={busy}
              onClick={() => choose(m.method)}
              className="flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-[var(--ink-150)] bg-white px-4 py-3.5 text-left transition-all hover:border-[var(--blue-400)] hover:shadow-[var(--shadow-sm)] disabled:opacity-50"
            >
              <span className="flex size-9 items-center justify-center rounded-[10px] bg-[var(--blue-100)] text-[var(--blue-700)]">
                {METHOD_ICON[m.method]}
              </span>
              <span className="flex-1 font-semibold text-[var(--text-strong)]">{m.label}</span>
              {busy ? <Loader2 size={16} className="animate-spin text-[var(--text-subtle)]" /> : null}
            </button>
          ))}
        </div>
      )}

      {step === 'instructions' && instructions && (
        <InstructionsView
          instructions={instructions}
          busy={busy}
          reference={reference}
          onReferenceChange={setReference}
          onConfirm={confirm}
          onBack={() => {
            setReference('');
            setError(null);
            setStep('method');
          }}
        />
      )}

      {step === 'done' && <DoneView successUrl={data.successUrl} />}

      {error && data ? (
        <p className="text-center text-xs text-[var(--danger-600)]">{error}</p>
      ) : null}
    </Shell>
  );
}

function Shell({ children, businessName }: { children: React.ReactNode; businessName?: string }) {
  return (
    <main
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: 'var(--gradient-mesh)' }}
    >
      <div className="w-full max-w-[420px] rounded-[var(--radius-xl)] bg-white p-7 shadow-[var(--shadow-lg)]">
        <div className="mb-5 flex items-center justify-between">
          <span className="text-[15px] font-extrabold tracking-tight text-[var(--text-strong)]">
            {businessName ?? 'Consi'}
          </span>
          <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--ink-50)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--text-muted)]">
            <Lock size={11} /> Pago seguro
          </span>
        </div>
        <div className="space-y-5">{children}</div>
        <p className="mt-6 text-center text-[11px] text-[var(--text-subtle)]">
          Procesado por <span className="font-bold">Consi</span> · Pasarela de pagos
        </p>
      </div>
    </main>
  );
}

function AmountBlock({ data }: { data: CheckoutData }) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-[var(--ink-50)] p-5 text-center">
      <div className="font-mono text-[34px] font-bold leading-none text-[var(--text-strong)]">
        {formatMoney(data.amount, data.currency)}
      </div>
      {data.currency !== 'USD' ? (
        <div className="mt-1.5 text-[13px] text-[var(--text-muted)]">
          ≈ {formatMoney(data.usdEquivalent, 'USD')}
        </div>
      ) : null}
      {data.description ? (
        <div className="mt-2 text-[13px] font-medium text-[var(--text-body)]">{data.description}</div>
      ) : null}
    </div>
  );
}

function InstructionsView({
  instructions,
  busy,
  reference,
  onReferenceChange,
  onConfirm,
  onBack,
}: {
  instructions: PaymentInstructions;
  busy: boolean;
  reference: string;
  onReferenceChange: (value: string) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-[9px] bg-[var(--blue-100)] text-[var(--blue-700)]">
          {METHOD_ICON[instructions.method]}
        </span>
        <span className="font-bold text-[var(--text-strong)]">{instructions.label}</span>
      </div>
      <p className="text-[13px] leading-relaxed text-[var(--text-body)]">{instructions.note}</p>

      {instructions.interactive ? (
        <CardForm />
      ) : (
        <>
          {instructions.qr ? <QrBox value={instructions.qr} /> : null}
          <div className="divide-y divide-[var(--ink-100)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--ink-150)]">
            {instructions.fields.map((f) => (
              <Field key={f.label} label={f.label} value={f.value} copyable={f.copyable !== false} />
            ))}
          </div>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--text-subtle)]">
              Número de referencia del pago
            </span>
            <input
              value={reference}
              onChange={(e) => onReferenceChange(e.target.value)}
              placeholder="Ej. 0123456789"
              inputMode="numeric"
              className="w-full rounded-[var(--radius-sm)] border border-[var(--ink-150)] px-3.5 py-2.5 font-mono text-sm outline-none focus:border-[var(--blue-400)]"
            />
            <span className="text-[11px] text-[var(--text-subtle)]">
              Ingresa la referencia que te dio tu banco para confirmar el pago.
            </span>
          </label>
        </>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={onConfirm}
        className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 py-3.5 font-bold text-white shadow-[var(--glow-brand)] transition-opacity hover:opacity-95 disabled:opacity-50"
        style={{ background: 'var(--gradient-brand)' }}
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : null}
        {instructions.interactive ? 'Pagar ahora' : 'Ya realicé el pago'}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="w-full text-center text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-strong)]"
      >
        ← Cambiar método de pago
      </button>
    </div>
  );
}

function Field({ label, value, copyable }: { label: string; value: string; copyable: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 bg-white px-3.5 py-2.5">
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--text-subtle)]">
          {label}
        </div>
        <div className="truncate font-mono text-[13px] font-semibold text-[var(--text-strong)]">
          {value}
        </div>
      </div>
      {copyable ? (
        <button
          type="button"
          aria-label={`Copiar ${label}`}
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="flex size-8 flex-none items-center justify-center rounded-[8px] text-[var(--text-muted)] transition-colors hover:bg-[var(--ink-50)] hover:text-[var(--blue-700)]"
        >
          {copied ? <CheckCircle2 size={15} className="text-[var(--success-600)]" /> : <Copy size={15} />}
        </button>
      ) : null}
    </div>
  );
}

function QrBox({ value }: { value: string }) {
  // Rendered via a public QR image service for the MVP; swap for a bundled encoder
  // in production. The raw value below is always available as a fallback to copy.
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=${encodeURIComponent(value)}`;
  return (
    <div className="flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-[var(--ink-150)] bg-white p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Código QR de pago" width={150} height={150} className="rounded-[8px]" />
      <span className="text-[11px] text-[var(--text-subtle)]">Escanea para pagar</span>
    </div>
  );
}

function CardForm() {
  return (
    <div className="space-y-2.5">
      <input
        placeholder="Número de tarjeta"
        inputMode="numeric"
        className="w-full rounded-[var(--radius-sm)] border border-[var(--ink-150)] px-3.5 py-2.5 font-mono text-sm outline-none focus:border-[var(--blue-400)]"
      />
      <div className="flex gap-2.5">
        <input
          placeholder="MM/AA"
          className="w-full rounded-[var(--radius-sm)] border border-[var(--ink-150)] px-3.5 py-2.5 font-mono text-sm outline-none focus:border-[var(--blue-400)]"
        />
        <input
          placeholder="CVC"
          inputMode="numeric"
          className="w-full rounded-[var(--radius-sm)] border border-[var(--ink-150)] px-3.5 py-2.5 font-mono text-sm outline-none focus:border-[var(--blue-400)]"
        />
      </div>
      <input
        placeholder="Nombre en la tarjeta"
        className="w-full rounded-[var(--radius-sm)] border border-[var(--ink-150)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--blue-400)]"
      />
    </div>
  );
}

function DoneView({ successUrl }: { successUrl: string | null }) {
  useEffect(() => {
    // Notify the embedding page (consi.js drop-in), if any.
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'consi:paid' }, '*');
    }
  }, []);

  useEffect(() => {
    if (successUrl) {
      const t = setTimeout(() => {
        window.location.href = successUrl;
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [successUrl]);

  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-[var(--success-100)]">
        <CheckCircle2 size={36} className="text-[var(--success-600)]" />
      </span>
      <div className="text-lg font-extrabold text-[var(--text-strong)]">¡Pago confirmado!</div>
      <p className="text-[13px] text-[var(--text-muted)]">
        Tu pago fue recibido correctamente.
        {successUrl ? ' Redirigiendo…' : ''}
      </p>
    </div>
  );
}
