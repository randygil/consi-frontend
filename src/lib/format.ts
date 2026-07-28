import type { Currency, Role, TransactionStatus, TransactionType } from './types';

const ROLE_LABELS: Record<Role, string> = {
  MERCHANT: 'Comercio',
  ADMIN: 'Administrador',
  OPERATIONS: 'Operaciones',
};

/** The enum is an implementation detail — never show `OPERATIONS` to a person. */
export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

const STATUS_LABELS: Record<TransactionStatus, string> = {
  COMPLETED: 'Completado',
  PENDING: 'Pendiente',
  AUTHORIZED: 'Autorizado',
  FAILED: 'Fallido',
  REFUNDED: 'Reembolsado',
  EXPIRED: 'Expirado',
  CHARGEBACK: 'Contracargo',
};

const TYPE_LABELS: Record<TransactionType, string> = {
  PAYIN: 'Pago entrante',
  PAYOUT: 'Retiro',
};

export function statusLabel(status: TransactionStatus): string {
  return STATUS_LABELS[status];
}

export function typeLabel(type: TransactionType): string {
  return TYPE_LABELS[type];
}

export function formatMoney(amount: string | number, currency: Currency): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  // USDT is not ISO 4217 — Intl throws RangeError on it. Format the number, suffix the code.
  if (currency === 'USDT') {
    return `${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)} USDT`;
  }
  const locale = currency === 'VES' ? 'es-VE' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * BCV rate, always 2 decimals. Without maximumFractionDigits the es-VE locale
 * renders 36.4215 as "36,422" — which reads as thirty-six thousand, not 36.42.
 */
export function formatRate(rate: string | number): string {
  const value = typeof rate === 'string' ? Number(rate) : rate;
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es-VE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}
