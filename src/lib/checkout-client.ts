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
  pay: (token: string, method: PaymentMethod, cardToken?: string, customerName?: string) =>
    request<PayResult>(`/${token}/pay`, {
      method: 'POST',
      body: JSON.stringify({
        method,
        ...(cardToken ? { cardToken } : {}),
        ...(customerName ? { customerName } : {}),
      }),
    }),
  status: (token: string) => request<CheckoutStatus>(`/${token}/status`),
  /** Report the payment (with the bank reference) → drives the real confirmation webhook. */
  confirm: (token: string, reference?: string) =>
    request<{ status: string; transactionStatus: string | null }>(`/${token}/confirm`, {
      method: 'POST',
      body: JSON.stringify(reference ? { reference } : {}),
    }),
  confirm3ds: (token: string) =>
    request<{ status: string; transactionStatus: string | null }>(`/${token}/3ds-confirm`, {
      method: 'POST',
    }),
  /** Auto-confirm a Pago Móvil by the sender's phone number (no bank reference needed). */
  confirmAuto: (token: string, phone: string) =>
    request<{ status: string; transactionStatus: string | null; reference: string | null }>(
      `/${token}/confirm-auto`,
      { method: 'POST', body: JSON.stringify({ phone }) },
    ),
  /** C2P / OTP-debit step 1: ask the payer's bank to send the one-time code. */
  requestOtp: (token: string, payer: { cedula?: string; phone?: string; bank?: string }) =>
    request<{ status: string; message?: string }>(`/${token}/request-otp`, {
      method: 'POST',
      body: JSON.stringify(payer),
    }),
  /** C2P / OTP-debit step 2: validate the code and settle the charge. */
  confirmOtp: (token: string, otp: string) =>
    request<{ status: string; transactionStatus: string | null }>(`/${token}/confirm-otp`, {
      method: 'POST',
      body: JSON.stringify({ otp }),
    }),
  /** Auto-confirm a Zelle transfer by the sender's email. */
  confirmZelle: (token: string, email: string) =>
    request<{ status: string; transactionStatus: string | null; reference: string | null }>(
      `/${token}/confirm-zelle`,
      { method: 'POST', body: JSON.stringify({ email }) },
    ),
};
