'use client';

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4
 * genre: modern-minimal · theme: Cobalt (light + dark) · design-system: design.md
 * designed-as-app · macrostructure: 04 Stat-Led (focused family)
 * nav: none (hosted payer surface) · footer: Ft2 inline single line
 * enrichment: none — typography only · motion: reveal-off, state-only
 * contrast: verified light + dark · graphite: unused (reserved per design.md)
 */

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Coins,
  CreditCard,
  DollarSign,
  Lock,
  Smartphone,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';
import { useCallback, useEffect, useState } from 'react';
import { CardDropIn } from '@/components/CardDropIn';
import { Stepper } from '@/components/admin/stepper';
import { CopyButton } from '@/components/developers/copy-button';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Notice } from '@/components/ui/page-head';
import { ThemeToggle } from '@/components/theme-toggle';
import { checkoutApi } from '@/lib/checkout-client';
import { formatMoney } from '@/lib/format';
import { PAYMENT_METHODS } from '@/lib/payment-methods';
import type {
  CheckoutData,
  Currency,
  CustomerInput,
  PaymentInstructions,
  PaymentMethod,
} from '@/lib/types';

// Test shortcuts are a local convenience — they must never reach a build.
const DEV = process.env.NODE_ENV === 'development';

type CustomerForm = { firstName: string; lastName: string; email: string; cedula: string };

/**
 * Validate the payer details and build the customer payload. Cédula + full data are
 * required for VES (Venezuelan) methods; for USD they're optional. Returns an error
 * message or the (possibly undefined) customer to send.
 */
function resolveCustomer(
  c: CustomerForm,
  currency?: Currency,
): { error: string } | { customer?: CustomerInput } {
  if (currency === 'VES') {
    if (!c.firstName.trim() || !c.lastName.trim() || !c.email.trim())
      return { error: 'Ingresa tu nombre, apellido y correo' };
    if (!c.cedula.trim())
      return { error: 'La cédula es obligatoria para pagos en bolívares' };
  }
  const has = c.firstName || c.lastName || c.email || c.cedula;
  return {
    customer: has
      ? {
          firstName: c.firstName.trim(),
          lastName: c.lastName.trim(),
          email: c.email.trim(),
          cedula: c.cedula.trim() || undefined,
        }
      : undefined,
  };
}

const METHOD_ICON: Record<PaymentMethod, React.ReactNode> = {
  PAGO_MOVIL: <Smartphone size={16} />,
  TRANSFER: <Building2 size={16} />,
  USDT: <Coins size={16} />,
  CARD: <CreditCard size={16} />,
  OTP_DEBIT: <Lock size={16} />,
  C2P: <Lock size={16} />,
  ZELLE: <DollarSign size={16} />,
};

/** One-line disambiguation per rail, from the local catalog — real copy, not invented. */
const METHOD_TAGLINE: Partial<Record<PaymentMethod, string>> = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.key, m.tagline]),
);

type Step = 'method' | 'instructions' | 'done';

const STEPS = ['Datos', 'Pago', 'Listo'];
const STEP_INDEX: Record<Step, number> = { method: 0, instructions: 1, done: 2 };

export default function CheckoutPage() {
  const token = String(useParams().token);
  const [data, setData] = useState<CheckoutData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('method');
  const [instructions, setInstructions] = useState<PaymentInstructions | null>(null);
  const [reference, setReference] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  // Which rail is mid-request, so only that row reads "Creando…" rather than all of them.
  const [pending, setPending] = useState<PaymentMethod | null>(null);
  const [show3ds, setShow3ds] = useState(false);
  const [loading3ds, setLoading3ds] = useState(false);
  const [customer, setCustomer] = useState<CustomerForm>({
    firstName: '',
    lastName: '',
    email: '',
    cedula: '',
  });

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
      const resolved = resolveCustomer(customer, data?.currency);
      if ('error' in resolved) {
        setError(resolved.error);
        return;
      }
      if (m === 'CARD') {
        // Skip direct payment creation for card method: we transition directly to instructions (interactive form)
        // and only create/tokenize when they click pay. The payer data captured above
        // persists in state and is sent at tokenize time.
        setInstructions({
          method: 'CARD',
          // Carry the label the payer just clicked, so the step head doesn't rename
          // the rail mid-flow ("Tarjeta de crédito/débito" → "Tarjeta de Crédito").
          label: data?.methods.find((x) => x.method === 'CARD')?.label ?? 'Tarjeta',
          note: 'Ingresa los datos de tu tarjeta para completar el pago de forma segura.',
          fields: [],
          interactive: true,
        });
        setStep('instructions');
        return;
      }
      setBusy(true);
      setPending(m);
      setError(null);
      try {
        const res = await checkoutApi.pay(token, m, undefined, resolved.customer);
        setInstructions(res.instructions);
        setStep('instructions');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error');
      } finally {
        setBusy(false);
        setPending(null);
      }
    },
    [token, customer, data],
  );

  const onTokenizeSuccess = useCallback(async (cardToken: string) => {
    const resolved = resolveCustomer(customer, data?.currency);
    if ('error' in resolved) {
      setError(resolved.error);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await checkoutApi.pay(token, 'CARD', cardToken, resolved.customer);
      if (res.status === 'AUTHORIZED') {
        setShow3ds(true);
      } else {
        setStep('done');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar el pago');
    } finally {
      setBusy(false);
    }
  }, [token, customer, data]);

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

  // Pago Móvil: confirm by the sender's phone number — we reconcile it automatically
  // against the bank's inbound report, no reference to copy.
  const confirmByPhone = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await checkoutApi.confirmAuto(token, phone.trim());
      if (res.status === 'PAID' || res.transactionStatus === 'COMPLETED') {
        setStep('done');
      } else {
        setError('No pudimos confirmar el pago todavía. Intenta de nuevo en unos segundos.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }, [token, phone]);

  // Zelle: confirm by the sender's email — reconciled against the incoming Zelle feed.
  const confirmByEmail = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await checkoutApi.confirmZelle(token, email.trim());
      if (res.status === 'PAID' || res.transactionStatus === 'COMPLETED') {
        setStep('done');
      } else {
        setError('No pudimos confirmar el pago todavía. Intenta de nuevo en unos segundos.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }, [token, email]);

  // Esc closes the 3DS challenge — same affordance as the command palette.
  useEffect(() => {
    if (!show3ds) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShow3ds(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show3ds]);

  if (error && !data) {
    return (
      <Frame aside={<RailHead />}>
        <Notice kind="err">{error}</Notice>
      </Frame>
    );
  }
  if (!data) {
    return (
      <Frame aside={<RailHead />}>
        <p className="label">Cargando pago…</p>
      </Frame>
    );
  }

  // A dead link is a terminal state, not a form. The backend already refuses to
  // charge one (checkout.service pay() → BadRequest), but without this the payer
  // fills in name, email and cédula, picks a rail, and only THEN gets refused.
  // PAID is deliberately not here: links are reusable, so a paid link stays payable.
  if (data.status === 'EXPIRED' || data.status === 'CANCELLED') {
    return (
      <Frame aside={<OrderRail data={data} />}>
        <DeadLinkView status={data.status} />
      </Frame>
    );
  }

  const errorNotice = error ? <Notice kind="err">{error}</Notice> : null;

  return (
    <>
      <div inert={show3ds}>
        <Frame aside={<OrderRail data={data} />}>
          <Stepper steps={STEPS} current={STEP_INDEX[step]} />

          {step === 'method' && (
            <div className="mt-[var(--space-lg)] flex flex-col gap-[var(--space-lg)]">
              <section>
                <h2 className="text-[length:var(--text-md)]">Tus datos</h2>
                <p className="mt-1 max-w-[52ch] text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                  {data.currency === 'VES'
                    ? 'Los bancos venezolanos exigen tu identidad para conciliar el pago.'
                    : 'Opcional. Sólo lo usamos para enviarte el comprobante.'}
                </p>

                <div className="mt-[var(--space-sm)] flex flex-col gap-[var(--space-sm)]">
                  <div className="grid grid-cols-1 gap-[var(--space-sm)] min-[360px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="firstName">Nombre</Label>
                      <Input
                        id="firstName"
                        autoComplete="given-name"
                        value={customer.firstName}
                        onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="lastName">Apellido</Label>
                      <Input
                        id="lastName"
                        autoComplete="family-name"
                        value={customer.lastName}
                        onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={customer.email}
                      onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    />
                  </div>
                  {data.currency === 'VES' && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="cedula">Cédula / RIF</Label>
                      <Input
                        id="cedula"
                        placeholder="V-12345678"
                        className="font-[family-name:var(--font-mono)]"
                        value={customer.cedula}
                        onChange={(e) => setCustomer({ ...customer, cedula: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h2 className="text-[length:var(--text-md)]">Elige cómo pagar</h2>
                <p className="mt-1 max-w-[52ch] text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                  {data.methods.length} vía{data.methods.length === 1 ? '' : 's'} habilitada
                  {data.methods.length === 1 ? '' : 's'} por el comercio.
                </p>

                <ul className="mt-[var(--space-sm)] border-y border-[var(--color-rule)]">
                  {data.methods.map((m) => (
                    <li key={m.method} className="border-b border-[var(--color-rule)] last:border-b-0">
                      <MethodRow
                        method={m.method}
                        label={m.label}
                        disabled={busy}
                        pending={pending === m.method}
                        onSelect={() => choose(m.method)}
                      />
                    </li>
                  ))}
                </ul>
              </section>

              {errorNotice}
            </div>
          )}

          {step === 'instructions' && instructions && (
            <InstructionsView
              token={token}
              instructions={instructions}
              busy={busy}
              errorNotice={errorNotice}
              reference={reference}
              onReferenceChange={setReference}
              phone={phone}
              onPhoneChange={setPhone}
              email={email}
              onEmailChange={setEmail}
              onConfirm={confirm}
              onConfirmByPhone={confirmByPhone}
              onConfirmByEmail={confirmByEmail}
              onPaid={() => setStep('done')}
              onBack={() => {
                setReference('');
                setPhone('');
                setEmail('');
                setError(null);
                setStep('method');
              }}
              onTokenizeSuccess={onTokenizeSuccess}
              setError={setError}
            />
          )}

          {step === 'done' && <DoneView data={data} />}
        </Frame>
      </div>

      {/* Simulated 3D Secure 2.0 challenge. The page behind it is `inert`, so Tab
        * can't escape the dialog and no focus trap is needed. */}
      {show3ds && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-scrim)] p-[var(--space-sm)] min-[480px]:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tds-title"
            className="w-full max-w-[26rem] rounded-[var(--radius-md)] border border-[var(--color-rule)] bg-[var(--color-surface)] p-[var(--space-md)]"
          >
            <p className="label">3-D Secure 2.0</p>
            <h2 id="tds-title" className="mt-1 text-[length:var(--text-md)]">
              Autoriza el cargo
            </h2>
            <p className="mt-1.5 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
              Tu banco pide una autorización adicional. Confirma abajo para completar el pago
              (simulación de biometría).
            </p>

            <dl className="mt-[var(--space-sm)] border-y border-[var(--color-rule)]">
              <LedgerRow label="Comercio" value={data.businessName} />
              <LedgerRow label="Monto" value={formatMoney(data.amount, data.currency)} num />
            </dl>

            {errorNotice ? <div className="mt-[var(--space-sm)]">{errorNotice}</div> : null}

            <div className="mt-[var(--space-md)] flex flex-col gap-[var(--space-2xs)]">
              <Button
                type="button"
                size="lg"
                autoFocus
                disabled={loading3ds}
                onClick={async () => {
                  setLoading3ds(true);
                  setError(null);
                  try {
                    const res = await checkoutApi.confirm3ds(token);
                    if (res.status === 'PAID' || res.transactionStatus === 'COMPLETED') {
                      setShow3ds(false);
                      setStep('done');
                    } else {
                      setError('No pudimos autorizar el cargo. Intenta de nuevo.');
                    }
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Error en la autorización 3-D Secure');
                  } finally {
                    setLoading3ds(false);
                  }
                }}
              >
                {loading3ds ? 'Autorizando…' : 'Autorizar pago'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShow3ds(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------------------------------------------------------------------
 * Frame — the two-tone split.
 *
 * Order rail on paper, act column on surface, one hairline seam between them.
 * Both halves are 1fr and their content hugs the seam, so the pair reads centred
 * on a wide screen without a floating card. Below 880px it stacks: the rail
 * becomes a header band and the act column runs full width.
 * ------------------------------------------------------------------------- */
function Frame({ aside, children }: { aside: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="min-h-screen min-[880px]:grid min-[880px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="border-b border-[var(--color-rule)] bg-[var(--color-paper)] px-[var(--space-md)] py-[var(--space-lg)] min-[880px]:border-b-0 min-[880px]:border-r min-[880px]:py-[var(--space-2xl)]">
        <div className="min-[880px]:sticky min-[880px]:top-[var(--space-2xl)] min-[880px]:ml-auto min-[880px]:mr-[var(--space-xl)] min-[880px]:max-w-[24rem]">
          {aside}
        </div>
      </aside>
      <section className="bg-[var(--color-surface)] px-[var(--space-md)] py-[var(--space-lg)] min-[880px]:py-[var(--space-2xl)]">
        <div className="min-[880px]:ml-[var(--space-xl)] min-[880px]:max-w-[28rem]">{children}</div>
      </section>
    </main>
  );
}

/** Wordmark + theme control. Same construction as /login — the focused family's head. */
function RailHead() {
  return (
    <div className="flex items-center justify-between gap-[var(--space-sm)]">
      <div className="flex items-center gap-2">
        <span className="size-3 rounded-[2px] bg-[var(--color-accent)]" aria-hidden />
        <span className="font-[family-name:var(--font-display)] text-[length:var(--text-md)] font-semibold tracking-[var(--tracking-display)] text-[var(--color-ink)]">
          Consi
        </span>
      </div>
      <ThemeToggle />
    </div>
  );
}

/**
 * Stat-Led hero. The amount is the largest element on the page and it is paired
 * with the words that complete it ("Pagar a <comercio>"), read as one sentence.
 * No graphite here — design.md reserves that beat for the dashboard readout and
 * code cards, and a second dark surface would dilute it into decoration.
 */
function OrderRail({ data }: { data: CheckoutData }) {
  // The ledger already closes on a rule, so the trust block only draws its own
  // when there is no ledger above it — two rules 24px apart read as a mistake.
  const hasLedger = Boolean(data.description || data.reference);
  return (
    <div className="flex flex-col gap-[var(--space-lg)]">
      <RailHead />

      <div>
        <p className="label">Pagar a</p>
        <h1 className="mt-1 text-[length:var(--text-lg)]">{data.businessName}</h1>

        <p
          className="num mt-[var(--space-sm)] font-medium leading-[1.05] tracking-[var(--tracking-display)] text-[var(--color-ink)] [font-size:clamp(1.75rem,7vw,3rem)] [overflow-wrap:anywhere]"
          aria-label={`Monto a pagar: ${formatMoney(data.amount, data.currency)}`}
        >
          {formatMoney(data.amount, data.currency)}
        </p>

        {data.currency !== 'USD' ? (
          <p className="mt-[var(--space-2xs)] text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
            Equivalente{' '}
            <span className="num text-[var(--color-ink-2)]">
              {formatMoney(data.usdEquivalent, 'USD')}
            </span>
          </p>
        ) : null}
      </div>

      {hasLedger ? (
        <dl className="border-y border-[var(--color-rule)]">
          {data.description ? <LedgerRow label="Concepto" value={data.description} /> : null}
          {data.reference ? <LedgerRow label="Referencia" value={data.reference} num /> : null}
        </dl>
      ) : null}

      <div className={hasLedger ? '' : 'border-t border-[var(--color-rule)] pt-[var(--space-sm)]'}>
        <p className="flex items-center gap-1.5 text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
          <Lock size={12} aria-hidden />
          Pago seguro procesado por Consi
        </p>
        <p className="mt-1 text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
          Pasarela de pagos multimoneda USD/VES
        </p>
      </div>
    </div>
  );
}

/** Hairline key/value row. `num` puts the value in the money face. */
function LedgerRow({ label, value, num }: { label: string; value: string; num?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-[var(--space-sm)] border-b border-[var(--color-rule)] py-[var(--space-2xs)] last:border-b-0">
      <dt className="label shrink-0">{label}</dt>
      <dd
        title={value}
        className={`min-w-0 truncate text-right text-[length:var(--text-sm)] text-[var(--color-ink-2)] ${num ? 'num' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * A payment rail. Selecting it creates the charge, so it reads as a forward
 * action (chevron) rather than a radio — the affordance matches what happens.
 */
function MethodRow({
  method,
  label,
  disabled,
  pending,
  onSelect,
}: {
  method: PaymentMethod;
  label: string;
  disabled: boolean;
  pending: boolean;
  onSelect: () => void;
}) {
  const tagline = METHOD_TAGLINE[method];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className="group flex w-full items-center gap-[var(--space-xs)] px-[var(--space-2xs)] py-[var(--space-xs)] text-left transition-colors duration-[var(--dur-fast)] hover:bg-[var(--color-paper-3)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-focus)] disabled:pointer-events-none disabled:opacity-45"
    >
      <span
        aria-hidden
        className="flex shrink-0 text-[var(--color-ink-4)] transition-colors duration-[var(--dur-fast)] group-hover:text-[var(--color-accent)]"
      >
        {METHOD_ICON[method]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-[var(--color-ink)]">{label}</span>
        {tagline ? (
          <span className="mt-0.5 block text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
            {tagline}
          </span>
        ) : null}
      </span>
      {pending ? (
        <span className="label shrink-0">Creando…</span>
      ) : (
        <ArrowRight
          size={14}
          aria-hidden
          className="shrink-0 text-[var(--color-ink-4)] transition-transform duration-[var(--dur-fast)] ease-[var(--ease-out)] group-hover:translate-x-0.5 group-hover:text-[var(--color-accent)]"
        />
      )}
    </button>
  );
}

function InstructionsView({
  token,
  instructions,
  busy,
  errorNotice,
  reference,
  onReferenceChange,
  phone,
  onPhoneChange,
  email,
  onEmailChange,
  onConfirm,
  onConfirmByPhone,
  onConfirmByEmail,
  onPaid,
  onBack,
  onTokenizeSuccess,
  setError,
}: {
  token: string;
  instructions: PaymentInstructions;
  busy: boolean;
  errorNotice: React.ReactNode;
  reference: string;
  onReferenceChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  email: string;
  onEmailChange: (value: string) => void;
  onConfirm: () => void;
  onConfirmByPhone: () => void;
  onConfirmByEmail: () => void;
  onPaid: () => void;
  onBack: () => void;
  onTokenizeSuccess: (token: string) => void;
  setError: (err: string | null) => void;
}) {
  // Pago Móvil confirms by the sender's phone (auto-reconciled); Zelle by the sender's
  // email; C2P/OTP-debit is an interactive OTP flow; other rails confirm by bank reference.
  const isPagoMovil = instructions.method === 'PAGO_MOVIL';
  const isC2P = instructions.method === 'C2P' || instructions.method === 'OTP_DEBIT';
  const isZelle = instructions.method === 'ZELLE';
  const [useReference, setUseReference] = useState(false);
  // The vault call runs inside CardDropIn, so the submit button needs its own
  // in-flight flag — `busy` only flips once tokenization has already returned.
  const [tokenizing, setTokenizing] = useState(false);
  const phoneMode = isPagoMovil && !useReference;

  return (
    <div className="mt-[var(--space-lg)] flex flex-col gap-[var(--space-md)]">
      <div>
        <p className="label flex items-center gap-1.5">
          <span aria-hidden className="flex text-[var(--color-ink-4)]">
            {METHOD_ICON[instructions.method]}
          </span>
          Vía de pago
        </p>
        <h2 className="mt-1 text-[length:var(--text-md)]">{instructions.label}</h2>
        <p className="mt-1.5 max-w-[52ch] text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink-3)]">
          {instructions.note}
        </p>
      </div>

      {instructions.interactive && isC2P ? (
        <OtpForm token={token} onDone={onPaid} setError={setError} errorNotice={errorNotice} />
      ) : instructions.interactive ? (
        <>
          <CardDropIn
            onSuccess={onTokenizeSuccess}
            onError={setError}
            onLoadingChange={setTokenizing}
          />
          {errorNotice}
          <Button
            type="submit"
            form="card-dropin-form"
            size="lg"
            disabled={busy || tokenizing}
          >
            {busy || tokenizing ? 'Procesando…' : 'Pagar ahora'}
          </Button>
        </>
      ) : (
        <>
          {instructions.qr ? <QrFigure value={instructions.qr} /> : null}

          <dl className="border-y border-[var(--color-rule)]">
            {instructions.fields.map((f) => (
              <Field key={f.label} label={f.label} value={f.value} copyable={f.copyable !== false} />
            ))}
          </dl>

          {phoneMode ? (
            <ConfirmField
              id="payer-phone"
              label="Teléfono desde el que pagaste"
              hint="Verificamos tu pago automáticamente con tu número. No necesitas la referencia."
              placeholder="0412-1234567"
              inputMode="tel"
              value={phone}
              onChange={onPhoneChange}
              testValue="0412-000-0000"
            />
          ) : isZelle ? (
            <ConfirmField
              id="payer-email"
              label="Correo desde el que enviaste el Zelle"
              hint="Verificamos tu pago automáticamente con el correo del remitente."
              placeholder="tucorreo@ejemplo.com"
              inputMode="email"
              value={email}
              onChange={onEmailChange}
              testValue="pagador@test.com"
            />
          ) : (
            <ConfirmField
              id="payer-reference"
              label="Número de referencia del pago"
              hint="Ingresa la referencia que te dio tu banco para confirmar el pago."
              placeholder="0123456789"
              inputMode="numeric"
              value={reference}
              onChange={onReferenceChange}
            />
          )}

          {isPagoMovil ? (
            <button
              type="button"
              onClick={() => {
                setUseReference((v) => !v);
                setError(null);
              }}
              className="self-start text-[length:var(--text-sm)] text-[var(--color-accent)] underline-offset-4 hover:underline"
            >
              {useReference
                ? 'Verificar con mi número de teléfono'
                : '¿Prefieres usar la referencia bancaria?'}
            </button>
          ) : null}

          {errorNotice}

          <Button
            type="button"
            size="lg"
            disabled={
              busy || (phoneMode && phone.trim().length < 7) || (isZelle && !email.includes('@'))
            }
            onClick={phoneMode ? onConfirmByPhone : isZelle ? onConfirmByEmail : onConfirm}
          >
            {busy
              ? 'Verificando…'
              : phoneMode || isZelle
                ? 'Verificar mi pago'
                : 'Ya realicé el pago'}
          </Button>
        </>
      )}

      <Button type="button" variant="ghost" className="self-start" onClick={onBack}>
        <ArrowLeft size={14} aria-hidden />
        Cambiar método
      </Button>
    </div>
  );
}

/** Labelled confirmation input + hint, with a dev-only prefill. */
function ConfirmField({
  id,
  label,
  hint,
  placeholder,
  inputMode,
  value,
  onChange,
  testValue,
}: {
  id: string;
  label: string;
  hint: string;
  placeholder: string;
  inputMode: 'tel' | 'email' | 'numeric';
  value: string;
  onChange: (value: string) => void;
  testValue?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="font-[family-name:var(--font-mono)]"
      />
      <p id={`${id}-hint`} className="text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
        {hint}
      </p>
      {DEV && testValue ? (
        <button
          type="button"
          onClick={() => onChange(testValue)}
          className="self-start text-[length:var(--text-xs)] text-[var(--color-accent)] underline-offset-4 hover:underline"
        >
          Usar valor de prueba
        </button>
      ) : null}
    </div>
  );
}

/**
 * C2P / OTP-debit interactive flow: collect the payer's cédula/teléfono/banco, request
 * the bank OTP, then submit the code to authorize the debit in real time. Self-contained —
 * it drives the request-otp / confirm-otp endpoints and signals `onDone` once settled.
 */
function OtpForm({
  token,
  onDone,
  setError,
  errorNotice,
}: {
  token: string;
  onDone: () => void;
  setError: (err: string | null) => void;
  errorNotice: React.ReactNode;
}) {
  const [cedula, setCedula] = useState('');
  const [phone, setPhone] = useState('');
  const [bank, setBank] = useState('');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const request = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await checkoutApi.requestOtp(token, { cedula, phone, bank });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }, [token, cedula, phone, bank, setError]);

  const confirm = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await checkoutApi.confirmOtp(token, otp.trim());
      if (res.status === 'PAID' || res.transactionStatus === 'COMPLETED') {
        onDone();
      } else {
        setError('La clave OTP no es válida. Verifícala e intenta de nuevo.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }, [token, otp, onDone, setError]);

  if (!sent) {
    return (
      <div className="flex flex-col gap-[var(--space-sm)]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="otp-cedula">Cédula</Label>
          <Input
            id="otp-cedula"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            placeholder="V-12345678"
            className="font-[family-name:var(--font-mono)]"
          />
        </div>
        <div className="grid grid-cols-1 gap-[var(--space-sm)] min-[360px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="otp-phone">Teléfono</Label>
            <Input
              id="otp-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0412-1234567"
              inputMode="tel"
              className="font-[family-name:var(--font-mono)]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="otp-bank">Banco</Label>
            <Input
              id="otp-bank"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              placeholder="0172"
              inputMode="numeric"
              className="font-[family-name:var(--font-mono)]"
            />
          </div>
        </div>
        {errorNotice}
        <Button
          type="button"
          size="lg"
          disabled={busy || cedula.trim().length < 5 || phone.trim().length < 7}
          onClick={request}
        >
          {busy ? 'Solicitando…' : 'Solicitar clave OTP'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--space-sm)]">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="otp-code">Clave OTP</Label>
        <Input
          id="otp-code"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="123456"
          inputMode="numeric"
          autoComplete="one-time-code"
          className="font-[family-name:var(--font-mono)] tracking-[0.2em]"
        />
        <p className="text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
          Ingresa la clave que tu banco te envió para autorizar el débito.
        </p>
      </div>
      {errorNotice}
      <Button type="button" size="lg" disabled={busy || otp.trim().length < 4} onClick={confirm}>
        {busy ? 'Autorizando…' : 'Autorizar pago'}
      </Button>
    </div>
  );
}

/** Instruction field: mono label, mono value, hairline row, copy swaps to a check. */
function Field({ label, value, copyable }: { label: string; value: string; copyable: boolean }) {
  return (
    <div className="border-b border-[var(--color-rule)] py-[var(--space-2xs)] last:border-b-0">
      <dt className="label">{label}</dt>
      <dd className="flex items-center justify-between gap-[var(--space-xs)]">
        <span
          title={value}
          className="num min-w-0 truncate text-[length:var(--text-sm)] font-medium text-[var(--color-ink)]"
        >
          {value}
        </span>
        {copyable ? <CopyButton value={value} label={label} variant="ghost" /> : null}
      </dd>
    </div>
  );
}

/**
 * Encoded in the browser, not by a third party.
 *
 * This used to call api.qrserver.com with the payload in the query string, which
 * put the merchant's wallet address / Pago Móvil target in an unaffiliated host's
 * access logs on every checkout view. Nothing leaves the page now.
 *
 * The dark/light pair is hardcoded black-on-white on purpose: a QR needs maximum
 * luminance contrast plus a quiet zone to scan, so it must NOT follow the theme —
 * a themed code on a dark surface is a code no phone can read. The white ground is
 * baked into the SVG, so the surrounding panel stays free to be a Cobalt surface.
 */
function QrFigure({ value }: { value: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    QRCode.toString(value, {
      type: 'svg',
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((out) => live && setSvg(`data:image/svg+xml;utf8,${encodeURIComponent(out)}`))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [value]);

  // The payload is always readable as a copyable field below, so a failed encode
  // collapses the figure rather than leaving an empty frame on a payment page.
  if (failed || !svg) return null;

  return (
    <figure className="flex flex-col items-center gap-[var(--space-2xs)] self-start rounded-[var(--radius-md)] border border-[var(--color-rule)] p-[var(--space-2xs)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={svg} alt={`Código QR con la dirección de pago ${value}`} width={168} height={168} />
      <figcaption className="label pb-[var(--space-3xs)]">Escanea para pagar</figcaption>
    </figure>
  );
}

/**
 * Expired or cancelled link. Same readout voice as the receipt — the badge carries
 * the state and the copy says who can fix it, because the payer cannot.
 */
function DeadLinkView({ status }: { status: 'EXPIRED' | 'CANCELLED' }) {
  const expired = status === 'EXPIRED';
  return (
    <div className="mt-[var(--space-lg)] flex flex-col gap-[var(--space-sm)]">
      <div className="self-start">
        <StatusBadge status={expired ? 'EXPIRED' : 'FAILED'} />
      </div>
      <h2 className="text-[length:var(--text-lg)]">
        {expired ? 'Este link de pago venció' : 'Este link de pago fue cancelado'}
      </h2>
      <p className="max-w-[52ch] text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
        {expired
          // No directional wording: the order rail sits beside this at ≥880px and above it below.
          ? 'No se puede completar el pago con este link. Pídele al comercio uno nuevo — el monto y el concepto siguen visibles para que sepas de qué se trataba.'
          : 'El comercio canceló este cobro, así que no se puede pagar. Si crees que es un error, escríbele directamente.'}
      </p>
      <p className="label border-t border-[var(--color-rule)] pt-[var(--space-sm)]">
        No se te cobró nada
      </p>
    </div>
  );
}

/**
 * The payer's receipt reads in the same voice as the merchant's transaction row —
 * same StatusBadge, same money face. No celebratory motion; the state is the news.
 */
function DoneView({ data }: { data: CheckoutData }) {
  useEffect(() => {
    // Notify the embedding page (consi.js drop-in), if any.
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'consi:paid' }, '*');
    }
  }, []);

  useEffect(() => {
    if (data.successUrl) {
      const t = setTimeout(() => {
        window.location.href = data.successUrl as string;
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [data.successUrl]);

  return (
    <div className="mt-[var(--space-lg)] flex flex-col gap-[var(--space-sm)]">
      {/* The chip must hug its label — a stretched flex child would paint a full-width bar. */}
      <div className="self-start">
        <StatusBadge status="COMPLETED" />
      </div>
      <h2 className="text-[length:var(--text-lg)]">Pago confirmado</h2>
      <p className="max-w-[52ch] text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
        {/* No trailing period: business names here routinely end in "C.A." */}
        Recibimos{' '}
        <span className="num text-[var(--color-ink)]">
          {formatMoney(data.amount, data.currency)}
        </span>{' '}
        para {data.businessName}
        {data.successUrl ? ' · te estamos redirigiendo al comercio…' : ''}
      </p>
      {data.successUrl ? (
        <a
          href={data.successUrl}
          className="self-start text-[length:var(--text-sm)] text-[var(--color-accent)] underline-offset-4 hover:underline"
        >
          Volver al comercio ahora
        </a>
      ) : null}
    </div>
  );
}
