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
import type { CheckoutData, PaymentInstructions, PaymentMethod } from '@/lib/types';

const METHOD_ICON: Record<PaymentMethod, React.ReactNode> = {
  PAGO_MOVIL: <Smartphone size={17} />,
  TRANSFER: <Building2 size={17} />,
  USDT: <Coins size={17} />,
  CARD: <CreditCard size={17} />,
};

type Step = 'method' | 'instructions' | 'done';

const inputCls =
  'w-full rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-surface)] px-2.5 py-2 font-[family-name:var(--font-mono)] text-[length:var(--text-base)] text-[var(--color-ink)] outline-none transition-colors duration-[var(--dur-fast)] placeholder:text-[var(--color-ink-4)] focus-visible:border-[var(--color-accent)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-focus)]';

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
      checkoutApi
        .status(token)
        .then((s) => {
          if (s.status === 'PAID') {
            setStep('done');
            clearInterval(id);
          }
        })
        // A blip mid-poll is not worth alarming the payer — the next tick retries.
        .catch(() => {});
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
        <p role="alert" className="py-[var(--space-lg)] text-center text-[length:var(--text-sm)] text-[var(--color-bad)]">
          {error}
        </p>
      </Shell>
    );
  }
  if (!data) {
    return (
      <Shell>
        <div className="flex justify-center py-[var(--space-xl)]">
          <Loader2 className="animate-spin text-[var(--color-ink-4)]" size={20} />
        </div>
      </Shell>
    );
  }

  return (
    <Shell businessName={data.businessName}>
      <AmountBlock data={data} />

      {step === 'method' && (
        <div className="flex flex-col gap-2">
          <p className="label">Elige cómo pagar</p>
          {data.methods.map((m) => (
            <button
              key={m.method}
              type="button"
              disabled={busy}
              onClick={() => choose(m.method)}
              className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-surface)] px-3 py-3 text-left transition-colors duration-[var(--dur-fast)] hover:border-[var(--color-accent)] disabled:opacity-50"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-xs)] border border-[var(--color-rule)] text-[var(--color-ink-3)]">
                {METHOD_ICON[m.method]}
              </span>
              <span className="flex-1 text-[length:var(--text-base)] font-medium text-[var(--color-ink)]">
                {m.label}
              </span>
              {busy ? <Loader2 size={15} className="animate-spin text-[var(--color-ink-4)]" /> : null}
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
        <p role="alert" className="text-center text-[length:var(--text-xs)] text-[var(--color-bad)]">
          {error}
        </p>
      ) : null}
    </Shell>
  );
}

function Shell({ children, businessName }: { children: React.ReactNode; businessName?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-[var(--space-sm)]">
      <div className="w-full max-w-[400px]">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-rule)] bg-[var(--color-surface)] p-[var(--space-md)]">
          <div className="mb-[var(--space-md)] flex items-center justify-between gap-2 border-b border-[var(--color-rule)] pb-[var(--space-xs)]">
            <span className="min-w-0 truncate font-[family-name:var(--font-display)] text-[length:var(--text-base)] font-semibold tracking-[var(--tracking-display)] text-[var(--color-ink)]">
              {businessName ?? 'Consi'}
            </span>
            <span className="label flex shrink-0 items-center gap-1">
              <Lock size={10} /> Pago seguro
            </span>
          </div>
          <div className="flex flex-col gap-[var(--space-md)]">{children}</div>
        </div>

        {/* Ft2 — inline single line */}
        <p className="mt-[var(--space-sm)] text-center text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
          Procesado por <span className="text-[var(--color-ink-3)]">Consi</span> · Pasarela de pagos
        </p>
      </div>
    </main>
  );
}

/** Stat-Led: the amount is the hero. Everything below qualifies it. */
function AmountBlock({ data }: { data: CheckoutData }) {
  return (
    <div className="min-w-0 text-center">
      <p className="label">Total a pagar</p>
      <p className="num mt-2 break-words text-[length:clamp(1.75rem,9vw,2.375rem)] font-medium leading-none text-[var(--color-ink)]">
        {formatMoney(data.amount, data.currency)}
      </p>
      {data.currency !== 'USD' ? (
        <p className="num mt-2 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
          ≈ {formatMoney(data.usdEquivalent, 'USD')}
        </p>
      ) : null}
      {data.description ? (
        <p className="mt-2 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          {data.description}
        </p>
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
    <div className="flex flex-col gap-[var(--space-sm)]">
      <div className="flex items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-xs)] border border-[var(--color-rule)] text-[var(--color-ink-3)]">
          {METHOD_ICON[instructions.method]}
        </span>
        <span className="text-[length:var(--text-base)] font-medium text-[var(--color-ink)]">
          {instructions.label}
        </span>
      </div>
      <p className="text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink-2)]">
        {instructions.note}
      </p>

      {instructions.interactive ? (
        <CardForm />
      ) : (
        <>
          {instructions.qr ? <QrBox value={instructions.qr} /> : null}
          <div className="divide-y divide-[var(--color-rule)] overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-rule)]">
            {instructions.fields.map((f) => (
              <Field key={f.label} label={f.label} value={f.value} copyable={f.copyable !== false} />
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ref" className="label">
              Número de referencia
            </label>
            <input
              id="ref"
              value={reference}
              onChange={(e) => onReferenceChange(e.target.value)}
              placeholder="0123456789"
              inputMode="numeric"
              className={inputCls}
            />
            <span className="text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
              La referencia que te dio tu banco al hacer el pago.
            </span>
          </div>
        </>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={onConfirm}
        className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-4 py-3 text-[length:var(--text-base)] font-medium text-[var(--color-accent-ink)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--color-accent-hover)] active:translate-y-px disabled:opacity-50"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : null}
        {instructions.interactive ? 'Pagar ahora' : 'Ya realicé el pago'}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="w-full text-center text-[length:var(--text-sm)] text-[var(--color-ink-3)] underline-offset-4 transition-colors duration-[var(--dur-fast)] hover:text-[var(--color-ink)] hover:underline"
      >
        Cambiar método de pago
      </button>
    </div>
  );
}

function Field({ label, value, copyable }: { label: string; value: string; copyable: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 bg-[var(--color-surface)] px-3 py-2">
      <div className="min-w-0">
        <div className="label">{label}</div>
        <div className="num mt-0.5 truncate text-[length:var(--text-sm)] text-[var(--color-ink)]">
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
          className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-xs)] text-[var(--color-ink-4)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-accent)]"
        >
          {copied ? (
            <CheckCircle2 size={14} className="text-[var(--color-ok)]" />
          ) : (
            <Copy size={14} />
          )}
        </button>
      ) : null}
    </div>
  );
}

function QrBox({ value }: { value: string }) {
  // Rendered via a public QR image service for the MVP; swap for a bundled encoder
  // in production. The raw value is always available to copy in the fields below.
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=${encodeURIComponent(value)}`;
  return (
    <figure className="flex flex-col items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-surface)] p-[var(--space-sm)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Código QR de pago"
        width={150}
        height={150}
        className="rounded-[var(--radius-xs)] bg-white"
      />
      <figcaption className="label">Escanea para pagar</figcaption>
    </figure>
  );
}

function CardForm() {
  return (
    <div className="flex flex-col gap-2">
      <input placeholder="Número de tarjeta" inputMode="numeric" className={inputCls} autoComplete="cc-number" />
      <div className="flex gap-2">
        <input placeholder="MM/AA" className={inputCls} autoComplete="cc-exp" />
        <input placeholder="CVC" inputMode="numeric" className={inputCls} autoComplete="cc-csc" />
      </div>
      <input placeholder="Nombre en la tarjeta" className={inputCls} autoComplete="cc-name" />
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
    <div
      role="status"
      className="flex flex-col items-center gap-3 py-[var(--space-lg)] text-center"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-[var(--color-ok-soft)]">
        <CheckCircle2 size={24} className="text-[var(--color-ok)]" />
      </span>
      <p className="text-[length:var(--text-lg)] font-semibold text-[var(--color-ink)]">
        Pago confirmado
      </p>
      <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
        Recibimos tu pago correctamente.
        {successUrl ? ' Te estamos redirigiendo…' : ''}
      </p>
    </div>
  );
}
