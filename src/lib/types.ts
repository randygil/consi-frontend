/** Settlement assets: each has its own ledger — received, held and withdrawn as-is. */
export type Currency = 'USD' | 'VES' | 'USDT';
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
  customerId?: string | null;
  customer?: Customer | null;
  description: string | null;
  createdAt: string;
  feeAmount?: string | null;
  feeTax?: string | null;
  netAmount?: string | null;
  refundedAmount?: string | null;
  settleStatus?: SettleStatus | null;
  afterRetentionDate?: string | null;
  reserveAmount?: string | null;
  reserveReleaseAt?: string | null;
  reserveReleasedAt?: string | null;
  expiresAt?: string | null;
  /** Payouts only. MANUAL = parked waiting for an admin to approve it. */
  payoutMode?: PayoutMode | null;
  provider?: string | null;
  method?: PaymentMethod | null;
  order?: string | null;
  /** Point of sale the money came in through. Null on payouts (money leaving). */
  terminalId?: string | null;
  terminal?: { code: string; name: string; channel: TerminalChannel } | null;
}

/** A registered payer of the merchant. email + name required; cédula for VES methods. */
export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  address: string | null;
  country: string | null;
  cedula: string | null;
  createdAt: string;
  updatedAt?: string;
  transactions?: Transaction[];
  _count?: { transactions: number };
}

/** Editable customer fields (dashboard create/edit). */
export interface CustomerInput {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  country?: string;
  cedula?: string;
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

// ---- Double-entry ledger (Movimientos) ----

export type LedgerAccount = 'MERCHANT_FUNDS' | 'CONSI_LIQUIDITY' | 'FEE_REVENUE' | 'TAX_PAYABLE';
export type EntryDirection = 'DEBIT' | 'CREDIT';

export interface LedgerEntry {
  id: string;
  journalId: string;
  event: string;
  account: LedgerAccount;
  direction: EntryDirection;
  currency: Currency;
  amount: string;
  memo: string | null;
  transactionId: string | null;
  createdAt: string;
}

// ---- Explicit FX (quote → accept) ----

export interface FxQuote {
  id: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  amountFrom: string;
  amountTo: string;
  baseRate: string;
  rate: string;
  spreadPct: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

/** Fee/net preview for a payout, returned by POST /transactions/payout/quote. */
export interface PayoutQuote {
  currency: Currency;
  amount: string;
  fee: string;
  tax: string;
  net: string;
  requiresApproval: boolean;
  payoutMode: PayoutMode;
}

export type DispersionMode = 'IMMEDIATE' | 'DAILY_CUT';

/** Admin-managed risk & payout policy of a merchant. */
export interface MerchantPolicy {
  retentionDays: number;
  rollingReservePercent: string;
  reserveDays: number;
  payoutApprovalThresholdUsd: string;
  payoutDailyLimitUsd: string;
  dispersionMode: DispersionMode;
  autoSettle: boolean;
}

export type PaymentMethod = 'PAGO_MOVIL' | 'TRANSFER' | 'USDT' | 'CARD' | 'OTP_DEBIT' | 'C2P' | 'ZELLE';
export type CheckoutSessionStatus = 'ACTIVE' | 'PAID' | 'EXPIRED' | 'CANCELLED';

/** Public payload powering the hosted checkout page at /c/{token}. No secrets. */
export interface CheckoutData {
  token: string;
  businessName: string;
  amount: string;
  currency: Currency;
  usdEquivalent: string;
  description: string | null;
  methods: { method: PaymentMethod; label: string }[];
  status: CheckoutSessionStatus;
  successUrl: string | null;
  reference: string | null;
  /**
   * Payer details the merchant already collected when it opened the session, so
   * the form can open filled in rather than asking the shopper to type them a
   * second time. Null when the integration sent none.
   *
   * Prefill only — the payer is still registered when the rail is picked, so a
   * prefill without a cédula is normal and the cédula field stays required for
   * rails that settle in bolívares.
   */
  payer: Partial<Record<'firstName' | 'lastName' | 'email' | 'cedula', string>> | null;
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
  status: CheckoutSessionStatus;
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

export interface AdminMerchantDetail extends MerchantPolicy {
  id: string;
  businessName: string;
  email: string;
  environment: Environment;
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

/** The terminal (point of sale) a session belongs to, as carried in list payloads. */
export interface TerminalRef {
  code: string;
  name: string;
}

/**
 * A checkout session as listed in the merchant dashboard. `shareable` is what makes it
 * a "link de pago" in the UI: true = a URL the merchant sends, false = a session opened
 * by their server and embedded with consi.js.
 */
export interface CheckoutSessionSummary {
  token: string;
  url: string;
  amount: string;
  currency: Currency;
  description: string | null;
  methods: PaymentMethod[];
  shareable: boolean;
  status: CheckoutSessionStatus;
  selectedMethod: PaymentMethod | null;
  terminalId: string;
  terminal: TerminalRef | null;
  createdAt: string;
}

/** Body for creating/editing a terminal. `code` is absent: it is allocated, not chosen. */
export interface UpsertTerminalInput {
  name: string;
  channel: TerminalChannel;
  methods: PaymentMethod[];
  defaultCurrency?: Currency;
  successUrl?: string;
  active?: boolean;
}

/** Sales channel a terminal represents. Labels only — it drives no behaviour. */
export type TerminalChannel = 'ECOMMERCE' | 'POS' | 'MOBILE_APP' | 'LINK' | 'API';

/**
 * Settled payin volume for one terminal in one settlement asset. Per currency on
 * purpose — USD, VES and USDT are separate ledgers, so there is no single total and
 * showing one would invent an exchange rate nobody agreed to.
 */
export interface TerminalTotal {
  currency: Currency;
  /** What the payers sent. */
  gross: string;
  /** What the merchant keeps after commission and tax. */
  net: string;
  count: number;
}

/** A terminal as listed in the merchant dashboard. */
export interface Terminal {
  id: string;
  /** Channel number, unique per merchant ("01"). Immutable once issued. */
  code: string;
  /** merchant code + terminal code, e.g. "CNS-0042-01" — the reconciliation identity. */
  fullCode: string;
  name: string;
  channel: TerminalChannel;
  methods: PaymentMethod[];
  defaultCurrency: Currency | null;
  successUrl: string | null;
  active: boolean;
  createdAt: string;
  _count: { transactions: number; checkoutSessions: number };
  /** Settled (COMPLETED) payin volume per currency. */
  totals: TerminalTotal[];
}

/** One terminal with its books and its recent activity. */
export interface TerminalDetail extends Terminal {
  /** COMPLETED payins — money actually earned through this channel. */
  settled: TerminalTotal[];
  /** PENDING/AUTHORIZED payins — never added to `settled`. */
  pending: TerminalTotal[];
  transactions: Transaction[];
  sessions: CheckoutSessionSummary[];
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
