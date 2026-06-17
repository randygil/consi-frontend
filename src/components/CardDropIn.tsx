'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Calendar, Lock, User, ShieldAlert, ShieldCheck } from 'lucide-react';

interface CardDropInProps {
  onSuccess: (token: string) => void;
  onError: (error: string) => void;
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
      setPanError('Número de tarjeta inválido (Luhn)');
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
    if (onLoadingChange) onLoadingChange(true);
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
    } catch (err: any) {
      onError(err.message || 'Ocurrió un error al tokenizar la tarjeta');
    } finally {
      setLoading(false);
      if (onLoadingChange) onLoadingChange(false);
    }
  };

  return (
    <form id="card-dropin-form" onSubmit={handleSubmit} className="space-y-4">
      {/* Card Number */}
      <div className="space-y-1">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--text-subtle)]">
          Número de Tarjeta
        </label>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="0000 0000 0000 0000"
            value={pan}
            onChange={handlePanChange}
            className={`w-full rounded-[var(--radius-sm)] border bg-white pl-10 pr-12 py-2.5 font-mono text-sm outline-none transition-all ${
              panError ? 'border-[var(--danger-500)] focus:border-[var(--danger-500)]' : 'border-[var(--ink-150)] focus:border-[var(--blue-400)]'
            }`}
          />
          <CreditCard className="absolute left-3 top-3 text-[var(--text-subtle)]" size={16} />
          {brand && (
            <span className="absolute right-3 top-2.5 rounded bg-[var(--blue-50)] px-2 py-0.5 text-[10px] font-extrabold uppercase text-[var(--blue-700)] border border-[var(--blue-200)] shadow-sm animate-pulse">
              {brand}
            </span>
          )}
        </div>
        {panError && <p className="text-[10px] font-bold text-[var(--danger-600)]">{panError}</p>}
      </div>

      {/* Expiry & CVV */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--text-subtle)]">
            Fecha Expiración
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="MM/AA"
              value={expiry}
              onChange={handleExpiryChange}
              className={`w-full rounded-[var(--radius-sm)] border bg-white pl-10 py-2.5 font-mono text-sm outline-none transition-all ${
                expiryError ? 'border-[var(--danger-500)] focus:border-[var(--danger-500)]' : 'border-[var(--ink-150)] focus:border-[var(--blue-400)]'
              }`}
            />
            <Calendar className="absolute left-3 top-3 text-[var(--text-subtle)]" size={16} />
          </div>
          {expiryError && <p className="text-[10px] font-bold text-[var(--danger-600)]">{expiryError}</p>}
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--text-subtle)]">
            CVC / CVV
          </label>
          <div className="relative">
            <input
              type="password"
              inputMode="numeric"
              placeholder="•••"
              value={cvv}
              onChange={handleCvvChange}
              className={`w-full rounded-[var(--radius-sm)] border bg-white pl-10 py-2.5 font-mono text-sm outline-none transition-all ${
                cvvError ? 'border-[var(--danger-500)] focus:border-[var(--danger-500)]' : 'border-[var(--ink-150)] focus:border-[var(--blue-400)]'
              }`}
            />
            <Lock className="absolute left-3 top-3 text-[var(--text-subtle)]" size={16} />
          </div>
          {cvvError && <p className="text-[10px] font-bold text-[var(--danger-600)]">{cvvError}</p>}
        </div>
      </div>

      {/* Card Holder Name */}
      <div className="space-y-1">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--text-subtle)]">
          Nombre en la Tarjeta
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="Ej. Juan Pérez"
            value={cardHolder}
            onChange={handleHolderChange}
            className={`w-full rounded-[var(--radius-sm)] border bg-white pl-10 py-2.5 text-sm outline-none transition-all ${
              cardHolderError ? 'border-[var(--danger-500)] focus:border-[var(--danger-500)]' : 'border-[var(--ink-150)] focus:border-[var(--blue-400)]'
            }`}
          />
          <User className="absolute left-3 top-3 text-[var(--text-subtle)]" size={16} />
        </div>
        {cardHolderError && <p className="text-[10px] font-bold text-[var(--danger-600)]">{cardHolderError}</p>}
      </div>

      {/* PCI DSS compliance disclaimer */}
      <div className="flex items-center gap-1.5 rounded bg-[var(--ink-50)] px-3 py-2 text-[10px] text-[var(--text-subtle)]">
        <ShieldCheck size={14} className="text-[var(--success-600)] shrink-0" />
        <span>Tus datos son tokenizados en el cliente y nunca tocan el servidor del comercio.</span>
      </div>
    </form>
  );
}
