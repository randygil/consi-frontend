'use client';

import type {
  ApiResponse,
  CheckoutData,
  CheckoutStatus,
  PayResult,
  PaymentMethod,
} from './types';

const BASE = '/api/checkout';

/** What a payer sees when the gateway is unreachable or answers with non-JSON. */
const GENERIC_ERROR = 'No pudimos conectar con la pasarela. Intenta de nuevo en un momento.';

/** Public checkout fetch — no auth header (the unguessable token is the credential). */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      cache: 'no-store',
    });
  } catch {
    throw new Error(GENERIC_ERROR); // network down / DNS / CORS
  }

  // A 502 from the proxy returns an HTML error page, not JSON. Never let the
  // resulting SyntaxError reach a payer — they can't act on "Unexpected token".
  let body: ApiResponse<T>;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new Error(GENERIC_ERROR);
  }

  if (!res.ok || !body.success) {
    throw new Error(body.error ?? GENERIC_ERROR);
  }
  return body.data as T;
}

export const checkoutApi = {
  get: (token: string) => request<CheckoutData>(`/${token}`),
  pay: (token: string, method: PaymentMethod, customerName?: string) =>
    request<PayResult>(`/${token}/pay`, {
      method: 'POST',
      body: JSON.stringify({ method, ...(customerName ? { customerName } : {}) }),
    }),
  status: (token: string) => request<CheckoutStatus>(`/${token}/status`),
  /** Report the payment (with the bank reference) → drives the real confirmation webhook. */
  confirm: (token: string, reference?: string) =>
    request<{ status: string; transactionStatus: string | null }>(`/${token}/confirm`, {
      method: 'POST',
      body: JSON.stringify(reference ? { reference } : {}),
    }),
};
