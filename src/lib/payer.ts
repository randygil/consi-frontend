import type { CustomerInput, PaymentMethod } from './types';

export type CustomerForm = { firstName: string; lastName: string; email: string; cedula: string };

/**
 * Mirrors SETTLEMENT_CURRENCY in the backend (checkout/checkout-methods.ts).
 *
 * The RAIL decides the settlement asset, not the link's pricing currency: a USD-priced
 * link paid by Pago Móvil (or card, or C2P) still settles in bolívares, and
 * CustomerService.resolve() demands the payer's cédula for any VES settlement. Keying the
 * checkout form off the link currency instead is what produced the dead end — the backend
 * refused the charge for a missing cédula on a field the UI had decided not to render.
 */
export const SETTLES_IN_VES: Record<PaymentMethod, boolean> = {
  PAGO_MOVIL: true,
  TRANSFER: true,
  CARD: true,
  OTP_DEBIT: true,
  C2P: true,
  ZELLE: false,
  USDT: false,
};

/** Which payer field is missing, so the UI can point at it instead of only complaining. */
export type PayerError = { field: keyof CustomerForm; message: string };

/**
 * Validate the payer details for the rail they just picked and build the payload.
 * Full data + cédula are required whenever the rail settles in VES; otherwise the payer
 * data is optional (receipt only).
 */
export function resolveCustomer(
  c: CustomerForm,
  method: PaymentMethod,
): { error: PayerError } | { customer?: CustomerInput } {
  const t = {
    firstName: c.firstName.trim(),
    lastName: c.lastName.trim(),
    email: c.email.trim(),
    cedula: c.cedula.trim(),
  };

  if (SETTLES_IN_VES[method]) {
    if (!t.firstName) return { error: { field: 'firstName', message: 'Ingresa tu nombre.' } };
    if (!t.lastName) return { error: { field: 'lastName', message: 'Ingresa tu apellido.' } };
    if (!t.email) return { error: { field: 'email', message: 'Ingresa tu correo electrónico.' } };
    if (!t.cedula)
      return {
        error: {
          field: 'cedula',
          message: 'La cédula es obligatoria: este método se liquida en bolívares.',
        },
      };
  }

  // The backend requires email + both names together (CustomerDataSchema), so a partially
  // filled optional form is sent as "no payer data" rather than triggering a 400.
  const complete = Boolean(t.firstName && t.lastName && t.email);
  return { customer: complete ? { ...t, cedula: t.cedula || undefined } : undefined };
}
