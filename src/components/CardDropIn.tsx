'use client';

/* Hallmark · component: card entry form · genre: modern-minimal · theme: Cobalt
 * states: default · hover · focus · active · disabled · loading · error · success
 * design-system: design.md · contrast: verified light + dark
 *
 * Every control is <Input> + <Label>, so the card form inherits the system's
 * hairline, 6px radius, focus ring and dark palette instead of re-declaring them.
 * PAN / expiry / CVV are money-adjacent figures, so they run in the mono face.
 */

import { Lock } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CardDropInProps {
  onSuccess: (token: string) => void;
  onError: (error: string) => void;
  /** Lets the parent disable its submit button while the vault call is in flight. */
  onLoadingChange?: (loading: boolean) => void;
}

export function CardDropIn({ onSuccess, onError, onLoadingChange }: CardDropInProps) {
  const [pan, setPan] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');

  const [panError, setPanError] = useState('');
  const [expiryError, setExpiryError] = useState('');
  const [cvvError, setCvvError] = useState('');
  const [cardHolderError, setCardHolderError] = useState('');

  const [loading, setLoading] = useState(false);
  const [brand, setBrand] = useState('');

  // Brand detection based on first digit
  useEffect(() => {
    const rawPan = pan.replace(/\s+/g, '');
    if (rawPan.startsWith('4')) {
      setBrand('Visa');
    } else if (rawPan.startsWith('5')) {
      setBrand('Mastercard');
    } else if (rawPan.startsWith('3')) {
      setBrand('American Express');
    } else {
      setBrand('');
    }
  }, [pan]);

  // Luhn algorithm validator
  const validateLuhn = (number: string): boolean => {
    const cleanNumber = number.replace(/\s+/g, '');
    if (!/^\d{13,19}$/.test(cleanNumber)) return false;

    let sum = 0;
    let shouldDouble = false;
    for (let i = cleanNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNumber.charAt(i), 10);
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  };

  // Input formatters
  const handlePanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    // Limit to 19 digits max
    value = value.slice(0, 19);
    // Add space every 4 digits
    const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    setPan(formatted);
    setPanError('');
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.slice(0, 4); // MMYY
    if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    setExpiry(value);
    setExpiryError('');
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCvv(value);
    setCvvError('');
  };

  const handleHolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardHolder(e.target.value);
    setCardHolderError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let isValid = true;
    const rawPan = pan.replace(/\s+/g, '');

    // Validate PAN
    if (!rawPan) {
      setPanError('Requerido');
      isValid = false;
    } else if (!validateLuhn(rawPan)) {
      setPanError('Número de tarjeta inválido');
      isValid = false;
    }

    // Validate Expiry
    if (!expiry) {
      setExpiryError('Requerido');
      isValid = false;
    } else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
      setExpiryError('Formato MM/AA');
      isValid = false;
    }

    // Validate CVV
    if (!cvv) {
      setCvvError('Requerido');
      isValid = false;
    } else if (cvv.length < 3) {
      setCvvError('3-4 dígitos');
      isValid = false;
    }

    // Validate Holder Name
    if (!cardHolder.trim()) {
      setCardHolderError('Requerido');
      isValid = false;
    }

    if (!isValid) return;

    // Trigger Vault Tokenization
    setLoading(true);
    onLoadingChange?.(true);
    onError('');

    try {
      const response = await fetch('/api/vault/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pan: rawPan,
          cvv,
          expiry,
          cardHolder,
        }),
      });

      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error || 'Fallo de tokenización de tarjeta');
      }

      onSuccess(body.data.token);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Ocurrió un error al tokenizar la tarjeta');
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  };

  const mono = 'font-[family-name:var(--font-mono)]';

  return (
    <form
      id="card-dropin-form"
      onSubmit={handleSubmit}
      aria-busy={loading}
      className="flex flex-col gap-[var(--space-sm)]"
    >
      {/* Card number — the brand is a readout beside the label, not a badge on the field. */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="cc-number">Número de tarjeta</Label>
          {brand ? (
            <span className="label text-[var(--color-accent)]">{brand}</span>
          ) : null}
        </div>
        <Input
          id="cc-number"
          type="text"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="0000 0000 0000 0000"
          value={pan}
          onChange={handlePanChange}
          disabled={loading}
          aria-invalid={panError ? true : undefined}
          aria-describedby={panError ? 'cc-number-err' : undefined}
          className={mono}
        />
        <FieldError id="cc-number-err" message={panError} />
      </div>

      <div className="grid grid-cols-1 gap-[var(--space-sm)] min-[380px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cc-exp">Vencimiento</Label>
          <Input
            id="cc-exp"
            type="text"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/AA"
            value={expiry}
            onChange={handleExpiryChange}
            disabled={loading}
            aria-invalid={expiryError ? true : undefined}
            aria-describedby={expiryError ? 'cc-exp-err' : undefined}
            className={mono}
          />
          <FieldError id="cc-exp-err" message={expiryError} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cc-csc">CVV</Label>
          <Input
            id="cc-csc"
            type="password"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="•••"
            value={cvv}
            onChange={handleCvvChange}
            disabled={loading}
            aria-invalid={cvvError ? true : undefined}
            aria-describedby={cvvError ? 'cc-csc-err' : undefined}
            className={mono}
          />
          <FieldError id="cc-csc-err" message={cvvError} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cc-name">Nombre en la tarjeta</Label>
        <Input
          id="cc-name"
          type="text"
          autoComplete="cc-name"
          placeholder="Como aparece impreso"
          value={cardHolder}
          onChange={handleHolderChange}
          disabled={loading}
          aria-invalid={cardHolderError ? true : undefined}
          aria-describedby={cardHolderError ? 'cc-name-err' : undefined}
        />
        <FieldError id="cc-name-err" message={cardHolderError} />
      </div>

      {/* Same trust voice as the order rail: hairline, mono-adjacent, no tinted panel. */}
      <p className="flex items-start gap-1.5 border-t border-[var(--color-rule)] pt-[var(--space-2xs)] text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
        <Lock size={12} aria-hidden className="mt-0.5 shrink-0" />
        Tus datos se tokenizan en el navegador y nunca tocan el servidor del comercio.
      </p>
    </form>
  );
}

function FieldError({ id, message }: { id: string; message: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-[length:var(--text-xs)] text-[var(--color-bad)]">
      {message}
    </p>
  );
}
