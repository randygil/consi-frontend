'use client';

import { clearToken, getToken } from './auth';
import type {
  AdminMerchantDetail,
  AdminMerchantSummary,
  ApiKeys,
  ApiResponse,
  AuthUser,
  BankAccount,
  Currency,
  Customer,
  CustomerInput,
  AccountMovement,
  AdminGateway,
  ConsiAccount,
  Dispute,
  Environment,
  ExchangeRate,
  MerchantProfile,
  OnboardMerchantInput,
  OpsNotification,
  PaymentLinkSummary,
  PaymentMethod,
  PlatformStats,
  Transaction,
  Wallet,
  WebhookDelivery,
} from './types';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  const body = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !body.success) {
    if (res.status === 401) clearToken();
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return body.data as T;
}

export interface LoginResult {
  accessToken: string;
  user: AuthUser;
}

export const api = {
  login: (email: string, password: string) =>
    request<LoginResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getProfile: () => request<MerchantProfile>('/merchant/me'),
  updateSettings: (input: { autoSettle: boolean }) =>
    request<{ autoSettle: boolean }>('/merchant/settings', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  getBalances: () => request<Wallet[]>('/merchant/balances'),
  getApiKeys: () => request<ApiKeys>('/merchant/api-keys'),
  regenerateApiKey: (environment: Environment) =>
    request<ApiKeys>('/merchant/api-keys/regenerate', {
      method: 'POST',
      body: JSON.stringify({ environment }),
    }),
  updateWebhook: (webhookUrl: string) =>
    request<{ webhookUrl: string }>('/merchant/webhook', {
      method: 'PUT',
      body: JSON.stringify({ webhookUrl }),
    }),
  getBankAccounts: () => request<BankAccount[]>('/merchant/bank-accounts'),
  addBankAccount: (input: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    currency: Currency;
    isDefault?: boolean;
  }) =>
    request<BankAccount>('/merchant/bank-accounts', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  setDefaultBankAccount: (id: string) =>
    request<{ success: boolean }>(`/merchant/bank-accounts/${id}/default`, {
      method: 'POST',
    }),
  getWebhookDeliveries: () =>
    request<WebhookDelivery[]>('/merchant/webhook-deliveries'),

  getTransactions: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<Transaction[]>(`/transactions${qs ? `?${qs}` : ''}`);
  },
  createPayin: (input: {
    currency: Currency;
    amount: string;
    customerName?: string;
    description?: string;
  }) =>
    request<Transaction>('/transactions/payin', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  createPayout: (input: {
    currency: Currency;
    amount: string;
    bankAccountId?: string;
    destination?: Record<string, string>;
    description?: string;
  }) =>
    request<Transaction>('/transactions/payout', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  refundTransaction: (id: string, amount?: string) =>
    request<Transaction>(`/transactions/${id}/refund`, {
      method: 'POST',
      body: amount ? JSON.stringify({ amount }) : undefined,
    }),
  chargebackTransaction: (id: string) =>
    request<Transaction>(`/transactions/${id}/chargeback`, { method: 'POST' }),
  captureTransaction: (id: string) =>
    request<Transaction>(`/transactions/${id}/capture`, { method: 'POST' }),
  voidTransaction: (id: string) =>
    request<Transaction>(`/transactions/${id}/void`, { method: 'POST' }),

  // ---- Customers (payers) ----
  getCustomers: (params: { search?: string; take?: number; skip?: number } = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]),
    ).toString();
    return request<{ data: Customer[]; total: number }>(`/customers${qs ? `?${qs}` : ''}`);
  },
  getCustomer: (id: string) => request<Customer>(`/customers/${id}`),
  getCustomerTransactions: (id: string) =>
    request<Transaction[]>(`/customers/${id}/transactions`),
  createCustomer: (input: CustomerInput) =>
    request<Customer>('/customers', { method: 'POST', body: JSON.stringify(input) }),
  updateCustomer: (id: string, input: CustomerInput) =>
    request<Customer>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(input) }),

  getSettlementsPending: () => request<Transaction[]>('/settlements/pending'),
  runSettlement: () =>
    request<{ released: number; evaluated: number }>('/settlements/run', {
      method: 'POST',
    }),

  getLatestRate: () => request<ExchangeRate>('/exchange-rates/latest'),

  getPaymentLinks: () => request<PaymentLinkSummary[]>('/payment-links'),
  createPaymentLink: (input: {
    amount: string;
    currency: Currency;
    description?: string;
    methods: PaymentMethod[];
    successUrl?: string;
  }) =>
    request<PaymentLinkSummary>('/payment-links', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  // ---- Admin ----
  adminGetStats: () => request<PlatformStats>('/admin/stats'),
  adminGetMerchants: () => request<AdminMerchantSummary[]>('/admin/merchants'),
  adminGetMerchant: (id: string) =>
    request<AdminMerchantDetail>(`/admin/merchants/${id}`),
  adminCreateMerchant: (input: OnboardMerchantInput) =>
    request<{ id: string; businessName: string }>('/admin/merchants', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  adminGetPendingBankAccounts: () =>
    request<(BankAccount & { merchant: { businessName: string } })[]>('/admin/bank-accounts/pending'),
  adminGetPendingPayouts: () =>
    request<(Transaction & { merchant: { businessName: string }; bankAccount: BankAccount })[]>('/admin/transactions/pending-payouts'),
  adminApproveBankAccount: (id: string) =>
    request<any>(`/admin/bank-accounts/${id}/approve`, { method: 'POST' }),
  adminRejectBankAccount: (id: string) =>
    request<any>(`/admin/bank-accounts/${id}/reject`, { method: 'POST' }),
  adminApprovePayout: (id: string) =>
    request<any>(`/admin/transactions/${id}/approve-payout`, { method: 'POST' }),
  adminRejectPayout: (id: string) =>
    request<any>(`/admin/transactions/${id}/reject-payout`, { method: 'POST' }),

  // ---- Admin: gateways (pasarelas) ----
  adminGetGateways: () => request<AdminGateway[]>('/admin/gateways'),
  adminCreateGateway: (input: Partial<AdminGateway>) =>
    request<AdminGateway>('/admin/gateways', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  adminUpdateGateway: (id: string, input: Partial<AdminGateway>) =>
    request<AdminGateway>(`/admin/gateways/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  adminSetMerchantGateways: (
    merchantId: string,
    gateways: Array<{
      gatewayId: string;
      enabled: boolean;
      priority: number;
      percentageRate?: string | null;
      fixedFee?: string | null;
      minFee?: string | null;
      maxFee?: string | null;
      taxRate?: string | null;
    }>,
  ) =>
    request<AdminMerchantDetail>(`/admin/merchants/${merchantId}/gateways`, {
      method: 'PUT',
      body: JSON.stringify({ gateways }),
    }),

  // ---- Operations: Consi liquidity accounts ----
  opsGetAccounts: () => request<ConsiAccount[]>('/ops/accounts'),
  opsCreateAccount: (input: {
    label: string;
    currency: Currency;
    environment?: Environment;
    balance?: string;
    minBalance?: string;
  }) =>
    request<ConsiAccount>('/ops/accounts', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  opsFundAccount: (id: string, amount: string, note?: string) =>
    request<ConsiAccount>(`/ops/accounts/${id}/fund`, {
      method: 'POST',
      body: JSON.stringify({ amount, note }),
    }),
  opsAdjustAccount: (id: string, amount: string, note?: string) =>
    request<ConsiAccount>(`/ops/accounts/${id}/adjust`, {
      method: 'POST',
      body: JSON.stringify({ amount, note }),
    }),
  opsGetMovements: (id: string) =>
    request<AccountMovement[]>(`/ops/accounts/${id}/movements`),
  opsGetNotifications: (includeResolved = false) =>
    request<OpsNotification[]>(`/ops/notifications?includeResolved=${includeResolved}`),
  opsResolveNotification: (id: string) =>
    request<OpsNotification>(`/ops/notifications/${id}/resolve`, { method: 'POST' }),

  // ---- Disputes ----
  getDisputes: () => request<Dispute[]>('/disputes'),
  getDispute: (id: string) => request<Dispute>(`/disputes/${id}`),
  submitDispute: (id: string) =>
    request<Dispute>(`/disputes/${id}/submit`, { method: 'POST' }),
  resolveDispute: (id: string, status: 'WON' | 'LOST') =>
    request<Dispute>(`/disputes/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
  uploadEvidence: async (id: string, file: File) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/disputes/${id}/evidence`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error || 'Fallo al subir evidencia');
    }
    return body.data as Dispute;
  },

  // ---- Authentication & Profile ----
  forgotPassword: (email: string) =>
    request<{ resetToken: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (input: { token: string; password: string }) =>
    request<{ success: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateProfile: (input: { email?: string; password?: string }) =>
    request<AuthUser>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  getMe: () => request<any>('/auth/me'),

  // ---- Admin User CRUD ----
  adminGetUsers: () => request<any[]>('/admin/users'),
  adminGetUser: (id: string) => request<any>(`/admin/users/${id}`),
  adminCreateUser: (input: any) =>
    request<any>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  adminUpdateUser: (id: string, input: any) =>
    request<any>(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  adminDeleteUser: (id: string) =>
    request<{ success: boolean }>(`/admin/users/${id}`, {
      method: 'DELETE',
    }),
};
