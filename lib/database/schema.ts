import { pgTable, text, integer, real, boolean, timestamp, doublePrecision } from "drizzle-orm/pg-core";

// Organizations
export const organizations = pgTable("organizations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  // Budget settings
  monthlyBudget: doublePrecision("monthly_budget"), // Total org budget per month
  alertThreshold: doublePrecision("alert_threshold").default(0.8), // Alert at 80% by default
  // Organization-wide guardrails (JSON)
  guardrails: text("guardrails"), // JSON: { blockCategories, requireApprovalAbove, flagAllNewVendors, maxTransactionAmount }
  // Stripe Customer (for saved payment methods - Phase 0)
  stripeCustomerId: text("stripe_customer_id"), // Stripe Customer ID for saved cards
  billingEmail: text("billing_email"), // Email for billing notifications
  // Alpha: Direct card storage (JSON: {number, exp_month, exp_year, cvc})
  alphaCardDetails: text("alpha_card_details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Users
export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "finance", "developer"] }).notNull().default("developer"),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Teams (for reporting/grouping only)
export const teams = pgTable("teams", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Projects (optional grouping)
export const projects = pgTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Stripe Connections
export const stripeConnections = pgTable("stripe_connections", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  connectedAccountId: text("connected_account_id").notNull(),
  accessTokenEncrypted: text("access_token_encrypted").notNull(),
  refreshTokenEncrypted: text("refresh_token_encrypted"),
  tokenExpiresAt: timestamp("token_expires_at"),
  status: text("status", { enum: ["active", "expired", "revoked"] }).notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Agents - with spending controls directly on the agent
export const agents = pgTable("agents", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  teamId: text("team_id").references(() => teams.id),
  projectId: text("project_id").references(() => projects.id),
  name: text("name").notNull(),
  description: text("description"),
  apiKeyHash: text("api_key_hash").notNull(),
  status: text("status", { enum: ["active", "paused", "suspended"] }).notNull().default("active"),
  
  // Spending limits
  monthlyLimit: doublePrecision("monthly_limit"), // Max spend per month
  dailyLimit: doublePrecision("daily_limit"), // Max spend per day
  perTransactionLimit: doublePrecision("per_transaction_limit"), // Max per single transaction
  
  // Approval rules
  approvalThreshold: doublePrecision("approval_threshold"), // Require approval above this amount
  flagNewVendors: boolean("flag_new_vendors").default(false), // Flag purchases from new merchants
  
  // Merchant restrictions (JSON arrays)
  blockedMerchants: text("blocked_merchants"), // JSON array of blocked merchant names
  allowedMerchants: text("allowed_merchants"), // JSON array - if set, only these merchants allowed
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Known Merchants - track merchant history for new vendor detection
export const knownMerchants = pgTable("known_merchants", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  merchantName: text("merchant_name").notNull(),
  merchantNameNormalized: text("merchant_name_normalized").notNull(), // lowercase, trimmed
  firstSeenAt: timestamp("first_seen_at").notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
  transactionCount: integer("transaction_count").notNull().default(1),
});

// Policies - DEPRECATED: Kept for backward compatibility
// New logic uses agent-level controls instead
export const policies = pgTable("policies", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  scopeType: text("scope_type", { enum: ["agent", "team", "project", "org"] }).notNull(),
  scopeIds: text("scope_ids").notNull(), // JSON array
  rules: text("rules").notNull(), // JSON object
  action: text("action", { enum: ["approve", "reject", "require_approval"] }).notNull(),
  priority: integer("priority").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Purchase Intents
export const purchaseIntents = pgTable("purchase_intents", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  agentId: text("agent_id").notNull().references(() => agents.id),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").notNull().default("usd"),
  description: text("description").notNull(),
  merchantName: text("merchant_name").notNull(),
  merchantUrl: text("merchant_url"),
  metadata: text("metadata"), // JSON object
  status: text("status", { enum: ["pending", "pending_approval", "approved", "rejected", "expired"] }).notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  rejectionCode: text("rejection_code"),
  // Phase 0: Multi-protocol and fee support
  protocol: text("protocol").default("stripe_card"), // 'stripe_card', 'acp', 'ap2', 'x402', 'l402'
  protocolTxId: text("protocol_tx_id"), // External protocol transaction ID
  feeAmount: doublePrecision("fee_amount"), // Roony's fee for this transaction
  stripePreAuthId: text("stripe_pre_auth_id"), // PaymentIntent ID for pre-authorization
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Pending Approvals - queue for human review
export const pendingApprovals = pgTable("pending_approvals", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  purchaseIntentId: text("purchase_intent_id").notNull().references(() => purchaseIntents.id),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  agentId: text("agent_id").notNull().references(() => agents.id),
  amount: doublePrecision("amount").notNull(),
  merchantName: text("merchant_name").notNull(),
  reason: text("reason").notNull(), // "OVER_THRESHOLD", "NEW_VENDOR", "ORG_GUARDRAIL"
  reasonDetails: text("reason_details"), // Additional context
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Virtual Cards
export const virtualCards = pgTable("virtual_cards", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  purchaseIntentId: text("purchase_intent_id").notNull().references(() => purchaseIntents.id),
  stripeCardId: text("stripe_card_id").notNull(),
  last4: text("last4").notNull(),
  expMonth: integer("exp_month").notNull(),
  expYear: integer("exp_year").notNull(),
  hardLimit: doublePrecision("hard_limit").notNull(),
  currency: text("currency").notNull(),
  status: text("status", { enum: ["active", "used", "expired", "canceled"] }).notNull().default("active"),
  expiresAt: timestamp("expires_at"),
  // Phase 0: Subscription support
  isRecurring: boolean("is_recurring").default(false),
  subscriptionId: text("subscription_id"), // Reference to future subscriptions table
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Transactions
export const transactions = pgTable("transactions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  purchaseIntentId: text("purchase_intent_id").notNull().references(() => purchaseIntents.id),
  virtualCardId: text("virtual_card_id").references(() => virtualCards.id),
  stripeChargeId: text("stripe_charge_id").notNull().unique(),
  stripeAuthorizationId: text("stripe_authorization_id"),
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").notNull(),
  merchantName: text("merchant_name").notNull(),
  merchantMcc: text("merchant_mcc"),
  status: text("status", { enum: ["authorized", "captured", "failed", "refunded"] }).notNull(),
  settledAt: timestamp("settled_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Budget Tracking - simplified for org and agent level
export const budgetTracking = pgTable("budget_tracking", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  agentId: text("agent_id").references(() => agents.id),
  teamId: text("team_id").references(() => teams.id),
  projectId: text("project_id").references(() => projects.id),
  periodType: text("period_type", { enum: ["daily", "weekly", "monthly", "lifetime"] }).notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end"),
  amountSpent: doublePrecision("amount_spent").notNull().default(0),
  amountReserved: doublePrecision("amount_reserved").notNull().default(0),
  limit: doublePrecision("limit"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Blocked Attempts
export const blockedAttempts = pgTable("blocked_attempts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  purchaseIntentId: text("purchase_intent_id").notNull().references(() => purchaseIntents.id),
  agentId: text("agent_id").notNull().references(() => agents.id),
  reasonCode: text("reason_code").notNull(),
  reasonMessage: text("reason_message").notNull(),
  policyId: text("policy_id").references(() => policies.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Audit Logs
export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id),
  agentId: text("agent_id").references(() => agents.id),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id").notNull(),
  details: text("details"), // JSON object
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============================================
// Phase 0: New Tables for Saved Cards & Fees
// ============================================

// Customer Payment Methods - replaces stripe_connections for OAuth
export const customerPaymentMethods = pgTable("customer_payment_methods", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  stripePaymentMethodId: text("stripe_payment_method_id").notNull(),
  type: text("type").notNull().default("card"), // 'card', 'bank_account'
  brand: text("brand"), // 'visa', 'mastercard', etc.
  last4: text("last4").notNull(),
  expMonth: integer("exp_month"),
  expYear: integer("exp_year"),
  isDefault: boolean("is_default").default(false),
  status: text("status", { enum: ["active", "expired", "failed"] }).notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Transaction Fees - track Roony's fees per transaction
export const transactionFees = pgTable("transaction_fees", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  purchaseIntentId: text("purchase_intent_id").notNull().references(() => purchaseIntents.id),
  protocol: text("protocol").notNull(), // 'stripe_card', 'acp', 'ap2', 'x402', 'l402'
  transactionAmount: doublePrecision("transaction_amount").notNull(),
  volumeTier: text("volume_tier").notNull(), // 'starter', 'growth', 'business', 'enterprise'
  baseRate: doublePrecision("base_rate").notNull(), // e.g., 0.03 for 3%
  railMultiplier: doublePrecision("rail_multiplier").notNull().default(1.0),
  effectiveRate: doublePrecision("effective_rate").notNull(),
  feeAmount: doublePrecision("fee_amount").notNull(),
  totalCharged: doublePrecision("total_charged").notNull(), // transaction_amount + fee_amount
  stripeChargeId: text("stripe_charge_id"), // ID of the charge to customer's card
  status: text("status", { enum: ["pending", "charged", "failed", "refunded"] }).notNull().default("pending"),
  chargedAt: timestamp("charged_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Monthly Volumes - track org volume for tier calculation
export const monthlyVolumes = pgTable("monthly_volumes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  month: text("month").notNull(), // '2025-12'
  totalVolume: doublePrecision("total_volume").default(0),
  transactionCount: integer("transaction_count").default(0),
  feeRevenue: doublePrecision("fee_revenue").default(0),
  volumeTier: text("volume_tier"), // Current tier based on volume
  byProtocol: text("by_protocol"), // JSON: {"stripe_card": 5000, "x402": 2000}
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Treasury Balances - for crypto rails (Phase 3)
export const treasuryBalances = pgTable("treasury_balances", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  rail: text("rail").notNull().unique(), // 'stripe_issuing', 'usdc_base', 'lightning'
  balance: doublePrecision("balance").notNull().default(0),
  lastRebalanceAt: timestamp("last_rebalance_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================
// Type definitions for JSON fields
// ============================================

export interface OrgGuardrails {
  blockCategories?: string[];
  requireApprovalAbove?: number;
  flagAllNewVendors?: boolean;
  maxTransactionAmount?: number;
}

export interface AgentSpendingControls {
  monthlyLimit?: number;
  dailyLimit?: number;
  perTransactionLimit?: number;
  approvalThreshold?: number;
  flagNewVendors?: boolean;
  blockedMerchants?: string[];
  allowedMerchants?: string[];
}

// Fee calculation types
export interface VolumeTier {
  name: string;
  minVolume: number;
  maxVolume: number;
  baseRate: number;
}

export interface FeeCalculation {
  baseRate: number;
  railMultiplier: number;
  effectiveRate: number;
  amount: number;
}

// Alpha card details (stored as JSON in alphaCardDetails field)
export interface AlphaCardDetails {
  number: string;
  exp_month: string;
  exp_year: string;
  cvc: string;
}
