import {
  Banknote,
  Building2,
  Coins,
  CreditCard,
  DollarSign,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';
import type { Currency, PaymentMethod } from './types';

/**
 * Single source of truth for the payment methods the platform offers, used by the
 * link-creation picker and the "Métodos de pago" reference page. Keep the labels in
 * sync with the backend's PAYMENT_METHOD_LABELS (checkout-methods.ts) — those drive
 * what the payer sees on the hosted checkout.
 *
 * OTP_DEBIT is an internal alias of C2P (same interactive OTP flow) and is intentionally
 * NOT offered here — C2P is its customer-facing name. Old links carrying OTP_DEBIT still work.
 */
export type MethodCategory = 'Bolívares (VES)' | 'Tarjetas' | 'Divisas y cripto';

export interface PaymentMethodInfo {
  key: PaymentMethod;
  label: string;
  /** One-line disambiguation shown next to the label. */
  tagline: string;
  /** Full explanation for the reference page. */
  description: string;
  category: MethodCategory;
  /** Currencies the method settles in. */
  currencies: Currency[];
  /** What the customer must provide to pay / confirm. */
  customerProvides: string;
  /** How Consi reconciles the payment. */
  confirmation: string;
  icon: LucideIcon;
  /** Pre-selected by default when creating a link. */
  defaultOn: boolean;
  /** Optional ribbon, e.g. "Nuevo". */
  badge?: string;
}

export const PAYMENT_METHODS: PaymentMethodInfo[] = [
  {
    key: 'PAGO_MOVIL',
    label: 'Pago Móvil',
    tagline: 'Transferencia interbancaria en bolívares por teléfono',
    description:
      'El cliente paga desde su app bancaria al teléfono y RIF del comercio. Se concilia automáticamente por el número de teléfono desde el que transfirió.',
    category: 'Bolívares (VES)',
    currencies: ['VES'],
    customerProvides: 'Teléfono desde el que pagó',
    confirmation: 'Automática (teléfono emisor + monto)',
    icon: Smartphone,
    defaultOn: true,
  },
  {
    key: 'C2P',
    label: 'Pago C2P',
    tagline: 'Débito inmediato autorizado con clave OTP del banco',
    description:
      'Comercio a Persona: el cliente ingresa su cédula, teléfono y banco, solicita la clave OTP y autoriza el débito al instante. No requiere esperar una conciliación.',
    category: 'Bolívares (VES)',
    currencies: ['VES'],
    customerProvides: 'Cédula, teléfono, banco y clave OTP',
    confirmation: 'Inmediata (OTP)',
    icon: Smartphone,
    defaultOn: true,
    badge: 'Nuevo',
  },
  {
    key: 'TRANSFER',
    label: 'Transferencia bancaria',
    tagline: 'Transferencia a la cuenta del comercio en bolívares',
    description:
      'Transferencia bancaria tradicional a la cuenta del comercio. El cliente indica la referencia bancaria al confirmar el pago.',
    category: 'Bolívares (VES)',
    currencies: ['VES'],
    customerProvides: 'Referencia de la transferencia',
    confirmation: 'Por referencia bancaria',
    icon: Building2,
    defaultOn: true,
  },
  {
    key: 'CARD',
    label: 'Tarjeta de crédito/débito',
    tagline: 'Visa / Mastercard, procesada de forma segura',
    description:
      'El cliente ingresa los datos de su tarjeta directamente en el checkout. Soporta verificación 3D Secure y tokenización para cobros recurrentes.',
    category: 'Tarjetas',
    currencies: ['USD', 'VES'],
    customerProvides: 'Datos de la tarjeta',
    confirmation: 'Inmediata (3D Secure)',
    icon: CreditCard,
    defaultOn: true,
  },
  {
    key: 'USDT',
    label: 'USDT (cripto)',
    tagline: 'Stablecoin USDT en red TRON (TRC-20)',
    description:
      'El cliente envía USDT a la dirección del comercio; el monto se cotiza en su equivalente USD. Esta misma vía cripto cubre wallets como Binance Pay.',
    category: 'Divisas y cripto',
    currencies: ['USD'],
    customerProvides: 'Comprobante / hash de la transacción',
    confirmation: 'Por comprobante en cadena',
    icon: Coins,
    defaultOn: true,
  },
  {
    key: 'ZELLE',
    label: 'Zelle (USD)',
    tagline: 'Transferencia internacional en dólares vía Zelle',
    description:
      'El cliente envía USD por Zelle al correo del comercio y confirma con el correo desde el que pagó. Se concilia automáticamente contra las notificaciones Zelle entrantes.',
    category: 'Divisas y cripto',
    currencies: ['USD'],
    customerProvides: 'Correo desde el que envió el Zelle',
    confirmation: 'Automática (correo emisor + monto)',
    icon: DollarSign,
    defaultOn: false,
    badge: 'Nuevo',
  },
];

/** Catalog grouped by category, preserving declaration order. */
export const METHOD_CATEGORIES: { category: MethodCategory; methods: PaymentMethodInfo[] }[] =
  (['Bolívares (VES)', 'Tarjetas', 'Divisas y cripto'] as MethodCategory[]).map((category) => ({
    category,
    methods: PAYMENT_METHODS.filter((m) => m.category === category),
  }));

/** Methods pre-selected when a merchant opens the "create link" form. */
export const DEFAULT_METHODS: PaymentMethod[] = PAYMENT_METHODS.filter((m) => m.defaultOn).map(
  (m) => m.key,
);

/** Category icon for section headers. */
export const CATEGORY_ICON: Record<MethodCategory, LucideIcon> = {
  'Bolívares (VES)': Banknote,
  Tarjetas: CreditCard,
  'Divisas y cripto': DollarSign,
};
