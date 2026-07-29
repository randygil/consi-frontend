'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function CardElementsContent() {
  const searchParams = useSearchParams();
  
  // State for form fields
  const [pan, setPan] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Parse custom styling parameters from URL query params
  const [customStyle, setCustomStyle] = useState<any>({});
  const [mounted, setMounted] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const styleParam = searchParams.get('style');
    if (styleParam) {
      try {
        setCustomStyle(JSON.parse(styleParam));
      } catch (e) {
        console.error('Failed to parse elements custom style:', e);
      }
    }
  }, [searchParams]);

  // Formatter for Card Number (XXXX XXXX XXXX XXXX)
  const handlePanChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    setPan(formatted);
    validateField('pan', digits);
  };

  // Formatter for Expiry Date (MM/AA)
  const handleExpiryChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    let formatted = clean;
    if (clean.length > 2) {
      formatted = `${clean.slice(0, 2)}/${clean.slice(2)}`;
    }
    setExpiry(formatted);
    validateField('expiry', formatted);
  };

  // Formatter for CVV (3 or 4 digits)
  const handleCvvChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    setCvv(clean);
    validateField('cvv', clean);
  };

  const handleHolderChange = (val: string) => {
    setCardHolder(val);
    validateField('cardHolder', val);
  };

  // Validation
  const validateField = (field: string, val: string) => {
    let err = '';
    if (field === 'pan') {
      if (val.length < 13 || val.length > 19) {
        err = 'Tarjeta debe contener entre 13 y 19 dígitos';
      }
    } else if (field === 'expiry') {
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(val)) {
        err = 'Expiración inválida (MM/AA)';
      }
    } else if (field === 'cvv') {
      if (val.length < 3 || val.length > 4) {
        err = 'CVV inválido';
      }
    } else if (field === 'cardHolder') {
      if (val.trim().length < 2) {
        err = 'Titular es muy corto';
      }
    }

    setErrors((prev) => {
      const next = { ...prev };
      if (err) next[field] = err;
      else delete next[field];
      return next;
    });
  };

  // Notify parent window on input changes
  useEffect(() => {
    const cleanPan = pan.replace(/\s/g, '');
    const isValid =
      cleanPan.length >= 13 &&
      /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry) &&
      cvv.length >= 3 &&
      cardHolder.trim().length >= 2 &&
      Object.keys(errors).length === 0;

    window.parent.postMessage(
      {
        type: 'consi:elements_change',
        valid: isValid,
        complete: isValid,
      },
      '*',
    );
  }, [pan, expiry, cvv, cardHolder, errors]);

  /* Tell the parent how tall we actually are. The iframe cannot size itself, so
   * consi.js opens it at a guessed height and corrects it from here — the last
   * field used to be cut in half whenever the merchant's font size, input padding
   * or a wrapped validation message made the form taller than that guess. */
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const post = () =>
      window.parent.postMessage(
        {
          type: 'consi:elements_resize',
          height: Math.ceil(box.getBoundingClientRect().height),
        },
        '*',
      );
    const observer = new ResizeObserver(post);
    observer.observe(box);
    post();
    return () => observer.disconnect();
  }, [mounted]);

  // Listen for Tokenization command from parent window
  useEffect(() => {
    const handleMessage = async (e: MessageEvent) => {
      if (e.data && e.data.type === 'consi:elements_tokenize') {
        const cleanPan = pan.replace(/\s/g, '');
        const isValid =
          cleanPan.length >= 13 &&
          /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry) &&
          cvv.length >= 3 &&
          cardHolder.trim().length >= 2;

        if (!isValid) {
          window.parent.postMessage(
            { type: 'consi:elements_token_error', error: 'Datos de tarjeta incompletos o inválidos.' },
            '*',
          );
          return;
        }

        try {
          // Send request directly to Consi Vault Tokenization API
          const response = await fetch('/api/vault/tokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pan: cleanPan,
              cvv,
              expiry,
              cardHolder,
            }),
          });

          const resData = await response.json();
          if (!response.ok || !resData.success) {
            window.parent.postMessage(
              { type: 'consi:elements_token_error', error: resData.error || 'Tokenization failed.' },
              '*',
            );
          } else {
            window.parent.postMessage(
              { type: 'consi:elements_token_success', token: resData.data.token },
              '*',
            );
          }
        } catch (err: any) {
          window.parent.postMessage(
            { type: 'consi:elements_token_error', error: err.message },
            '*',
          );
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [pan, expiry, cvv, cardHolder]);

  if (!mounted) {
    return null;
  }

  /* Every fallback below is derived from the two colours the merchant sends —
   * `background` and `color` — never guessed from them. Guessing is what broke
   * the dark themes: the old code sniffed the luma of `background` as a hex
   * string, read a modern colour like `oklch(10.5% .012 266)` as "not dark", and
   * painted a white field under white text.
   *
   * `||` and not `??`: a merchant reading its own CSS custom properties hands us
   * an EMPTY STRING for a token that does not exist, and `?? ` lets that through
   * as `color: ''`. */
  const pick = (value: unknown, fallback: string) =>
    typeof value === 'string' && value.trim() ? value : fallback;

  const styles = {
    background: pick(customStyle.background, '#ffffff'),
    color: pick(customStyle.color, '#0f172a'),
    fontFamily: pick(customStyle.fontFamily, 'system-ui, -apple-system, sans-serif'),
    fontSize: pick(customStyle.fontSize, '14px'),
    borderColor: pick(customStyle.borderColor, 'color-mix(in oklab, currentColor 28%, transparent)'),
    borderRadius: pick(customStyle.borderRadius, '8px'),
    inputPadding: pick(customStyle.inputPadding, '10px 14px'),
    // The field sits ON the surface the merchant named, so it inherits it. The
    // border is what separates them, not a contrasting fill.
    inputBackground: pick(customStyle.inputBackground, pick(customStyle.background, '#ffffff')),
    gridGap: pick(customStyle.gridGap, '16px'),
    labelColor: 'color-mix(in oklab, currentColor 65%, transparent)',
    placeholderColor: 'color-mix(in oklab, currentColor 45%, transparent)',
    focusBorderColor: pick(customStyle.focusBorderColor, 'currentColor'),
    focusGlow: 'color-mix(in oklab, currentColor 22%, transparent)',
  };

  return (
    <div
      ref={boxRef}
      style={{
        background: styles.background,
        color: styles.color,
        fontFamily: styles.fontFamily,
        fontSize: styles.fontSize,
        // Room for the 3px focus ring: at 2px the iframe edge clipped it.
        padding: '4px',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        html, body {
          background-color: ${styles.background} !important;
          color: ${styles.color} !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          height: auto !important;
        }
        .consi-el-input {
          width: 100%;
          padding: ${styles.inputPadding};
          background-color: ${styles.inputBackground} !important;
          border: 1px solid ${styles.borderColor};
          border-radius: ${styles.borderRadius};
          color: ${styles.color} !important;
          font-family: ${styles.fontFamily};
          font-size: ${styles.fontSize};
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .consi-el-input::placeholder {
          color: ${styles.placeholderColor} !important;
          opacity: 1;
        }
        .consi-el-input:focus {
          border-color: ${styles.focusBorderColor};
          box-shadow: 0 0 0 3px ${styles.focusGlow};
        }
        .consi-el-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: ${styles.gridGap};
          margin-top: ${styles.gridGap};
        }
        .consi-el-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: ${styles.labelColor};
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      `}</style>

      <div>
        <label className="consi-el-label">Número de Tarjeta</label>
        <input
          type="text"
          className="consi-el-input"
          placeholder="4242 4242 4242 4242"
          value={pan}
          onChange={(e) => handlePanChange(e.target.value)}
        />
      </div>

      <div className="consi-el-row">
        <div>
          <label className="consi-el-label">Expiración (MM/AA)</label>
          <input
            type="text"
            className="consi-el-input"
            placeholder="12/29"
            value={expiry}
            onChange={(e) => handleExpiryChange(e.target.value)}
          />
        </div>
        <div>
          <label className="consi-el-label">CVC</label>
          <input
            type="password"
            className="consi-el-input"
            placeholder="123"
            value={cvv}
            onChange={(e) => handleCvvChange(e.target.value)}
          />
        </div>
      </div>

      <div style={{ marginTop: styles.gridGap }}>
        <label className="consi-el-label">Nombre del Titular</label>
        <input
          type="text"
          className="consi-el-input"
          placeholder="Juan Pérez"
          value={cardHolder}
          onChange={(e) => handleHolderChange(e.target.value)}
        />
      </div>
    </div>
  );
}

export default function CardElementsPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <CardElementsContent />
    </Suspense>
  );
}
