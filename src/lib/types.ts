export type Currency = 'USD' | 'VES';
export type Environment = 'TEST' | 'LIVE';
export type Role = 'MERCHANT' | 'ADMIN';
export type TransactionType = 'PAYIN' | 'PAYOUT';

/** The authenticated account (login principal). merchantId is null for admins. */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  merchantId: string | null;
}
export type TransactionStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED'
  | 'EXPIRED'
  | 'CHARGEBACK';

export type SettleStatus = 'PENDING_RELEASE' | 'RELEASED';

export type Gateway = 'MOCK_BANCAMIGA' | 'MOCK_BANGENTE' | 'STRIPE' | 'MANUAL';

export const GATEWAYS: readonly Gateway[] = [
  'MOCK_BANCAMIGA',
  'MOCK_BANGENTE',
  'STRIPE',
  'MANUAL',
];

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: Record<string, unknown>;
}

export interface Wallet {
  id: string;
  currency: Currency;
  balance: string;
  available: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  currency: Currency;
  amount: string;
  exchangeRateUsed: string | null;
  usdEquivalent: string | null;
  reference: string;
  customerName: string | null;
  description: string | null;
  createdAt: string;
  feeAmount?: string | null;
  feeTax?: string | null;
  netAmount?: string | null;
  settleStatus?: SettleStatus | null;
  afterRetentionDate?: string | null;
  expiresAt?: string | null;
  provider?: string | null;
  order?: string | null;
}

export interface MerchantProfile {
  id: string;
  email: string;
  businessName: string;
  environment: Environment;
  webhookUrl: string | null;
}

export interface ApiKeys {
  apiKeyTest: string;
  apiSecretTest: string;
  apiKeyLive: string;
  apiSecretLive: string;
  webhookUrl: string | null;
}

export interface WebhookDelivery {
  id: string;
  event: string;
  status: 'PENDING' | 'DELIVERED' | 'FAILED';
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string;
  lastError?: string | null;
  url: string;
  transactionId?: string | null;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  currency: Currency;
}

export interface ExchangeRate {
  rate: string;
  source: string;
  createdAt: string;
}

export type PaymentMethod = 'PAGO_MOVIL' | 'TRANSFER' | 'USDT' | 'CARD';
export type PaymentLinkStatus = 'ACTIVE' | 'PAID' | 'EXPIRED' | 'CANCELLED';

/** Public payload powering the hosted checkout page at /c/{token}. No secrets. */
export interface CheckoutData {
  token: string;
  businessName: string;
  amount: string;
  currency: Currency;
  usdEquivalent: string;
  description: string | null;
  methods: { method: PaymentMethod; label: string }[];
  status: PaymentLinkStatus;
  successUrl: string | null;
  reference: string | null;
}

export interface InstructionField {
  label: string;
  value: string;
  copyable?: boolean;
}

export interface PaymentInstructions {
  method: PaymentMethod;
  label: string;
  note: string;
  fields: InstructionField[];
  qr?: string;
  interactive?: boolean;
}

export interface PayResult {
  reference: string;
  status: TransactionStatus;
  instructions: PaymentInstructions;
}

export interface CheckoutStatus {
  status: PaymentLinkStatus;
  transactionStatus: TransactionStatus | null;
  reference: string | null;
}

// ---- Admin dashboard ----

export interface PlatformStats {
  merchantCount: number;
  transactionCount: number;
  totalPayinVolumeUsd: string;
  commissionRevenueUsd: string;
}

export interface AdminMerchantSummary {
  id: string;
  businessName: string;
  email: string;
  environment: Environment;
  createdAt: string;
  wallets: Pick<Wallet, 'currency' | 'balance' | 'available'>[];
  _count: { users: number; transactions: number };
}

export interface AdminCommissionConfig {
  id: string;
  type: TransactionType;
  currency: Currency | null;
  percentageRate: string;
  fixedFee: string;
  minFee: string;
  taxRate: string;
}

export interface AdminMerchantUser {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface AdminMerchantDetail {
  id: string;
  businessName: string;
  email: string;
  environment: Environment;
  retentionDays: number;
  defaultGateway: string | null;
  createdAt: string;
  wallets: Wallet[];
  commissionConfigs: AdminCommissionConfig[];
  users: AdminMerchantUser[];
  transactions: Transaction[];
}

/** Payload for the admin merchant onboarding wizard. */
export interface OnboardMerchantInput {
  businessName: string;
  email: string;
  environment: Environment;
  commissionPayinRate: string;
  commissionTax: string;
  commissionPayoutRate: string;
  commissionPayoutMinFee: string;
  retentionDays: number;
  defaultGateway: string;
  userEmail: string;
  userPassword: string;
}

/** A payment link as listed in the merchant dashboard. */
export interface PaymentLinkSummary {
  token: string;
  url: string;
  amount: string;
  currency: Currency;
  description: string | null;
  methods: PaymentMethod[];
  status: PaymentLinkStatus;
  selectedMethod: PaymentMethod | null;
  createdAt: string;
}
