import type { Currency, TransactionStatus, TransactionType } from './types';

const STATUS_LABELS: Record<TransactionStatus, string> = {
  COMPLETED: 'Completado',
  PENDING: 'Pendiente',
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
  const locale = currency === 'VES' ? 'es-VE' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es-VE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}
