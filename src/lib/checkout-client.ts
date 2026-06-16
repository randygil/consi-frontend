'use client';

import type {
  ApiResponse,
  CheckoutData,
  CheckoutStatus,
  PayResult,
  PaymentMethod,
} from './types';

const BASE = '/api/checkout';

/** Public checkout fetch — no auth header (the unguessable token is the credential). */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  const body = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !body.success) {
    throw new Error(body.error ?? `Request failed (${res.status})`);
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
