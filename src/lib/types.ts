export type Currency = 'USD' | 'VES';
export type Environment = 'TEST' | 'LIVE';
export type Role = 'MERCHANT' | 'ADMIN' | 'OPERATIONS';
export type PayoutMode = 'INSTANT' | 'MANUAL';
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
  | 'AUTHORIZED'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED'
  | 'EXPIRED'
  | 'CHARGEBACK';

export type SettleStatus = 'PENDING_RELEASE' | 'RELEASED';

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
  refundedAmount?: string | null;
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
  autoSettle: boolean;
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
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  isDefault: boolean;
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

/** A gateway (pasarela) as managed by admin — internal, never shown to customers. */
export interface AdminGateway {
  id: string;
  key: string;
  displayName: string;
  providerKey: string;
  currency: Currency;
  environment: Environment;
  payoutMode: PayoutMode;
  enabled: boolean;
  percentageRate: string;
  fixedFee: string;
  minFee: string;
  maxFee: string;
  taxRate: string;
  consiAccountId: string;
  consiAccount?: { id: string; label: string; currency: Currency };
  destinationSchema?: DestinationField[] | null;
  createdAt: string;
}

/** One field of a gateway's dynamic customer-destination contract. */
export interface DestinationField {
  key: string;
  label?: string;
  type?: string;
  required?: boolean;
}

/** Per-merchant gateway enablement row (with optional commission override). */
export interface MerchantGatewayLink {
  id: string;
  gatewayId: string;
  enabled: boolean;
  priority: number;
  percentageRate: string | null;
  fixedFee: string | null;
  minFee: string | null;
  maxFee: string | null;
  taxRate: string | null;
  gateway: AdminGateway;
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
  createdAt: string;
  wallets: Wallet[];
  merchantGateways: MerchantGatewayLink[];
  users: AdminMerchantUser[];
  transactions: Transaction[];
}

/** Payload for the admin merchant onboarding wizard. Gateways auto-enable on create. */
export interface OnboardMerchantInput {
  businessName: string;
  email: string;
  environment: Environment;
  retentionDays: number;
  userEmail: string;
  userPassword: string;
}

// ---- Operations (Consi liquidity accounts) ----

export interface ConsiAccount {
  id: string;
  label: string;
  currency: Currency;
  environment: Environment;
  balance: string;
  minBalance: string;
  lowBalance: boolean;
  createdAt: string;
}

export type MovementType = 'FUNDING' | 'WITHDRAWAL' | 'ADJUSTMENT';

export interface AccountMovement {
  id: string;
  accountId: string;
  type: MovementType;
  amount: string;
  balanceAfter: string;
  transactionId: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

export type OpsNotificationType = 'INSUFFICIENT_BALANCE' | 'LOW_BALANCE';

export interface OpsNotification {
  id: string;
  type: OpsNotificationType;
  accountId: string | null;
  currency: Currency | null;
  message: string;
  resolved: boolean;
  createdAt: string;
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

export interface Dispute {
  id: string;
  transactionId: string;
  transaction: Transaction;
  status: 'PENDING_EVIDENCE' | 'UNDER_REVIEW' | 'WON' | 'LOST';
  amount: string;
  reason: string;
  evidenceUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
