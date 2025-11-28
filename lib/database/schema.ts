import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Organizations
export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Users
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "finance", "developer"] }).notNull().default("developer"),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Teams
export const teams = sqliteTable("teams", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Projects
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Stripe Connections
export const stripeConnections = sqliteTable("stripe_connections", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  connectedAccountId: text("connected_account_id").notNull(),
  accessTokenEncrypted: text("access_token_encrypted").notNull(),
  refreshTokenEncrypted: text("refresh_token_encrypted"),
  tokenExpiresAt: integer("token_expires_at", { mode: "timestamp" }),
  status: text("status", { enum: ["active", "expired", "revoked"] }).notNull().default("active"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Agents
export const agents = sqliteTable("agents", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  teamId: text("team_id").references(() => teams.id),
  projectId: text("project_id").references(() => projects.id),
  name: text("name").notNull(),
  apiKeyHash: text("api_key_hash").notNull(),
  status: text("status", { enum: ["active", "paused", "suspended"] }).notNull().default("active"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Policies
export const policies = sqliteTable("policies", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  scopeType: text("scope_type", { enum: ["agent", "team", "project", "org"] }).notNull(),
  scopeIds: text("scope_ids").notNull(), // JSON array
  rules: text("rules").notNull(), // JSON object
  action: text("action", { enum: ["approve", "reject", "require_approval"] }).notNull(),
  priority: integer("priority").notNull().default(0),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Purchase Intents
export const purchaseIntents = sqliteTable("purchase_intents", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  agentId: text("agent_id").notNull().references(() => agents.id),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("usd"),
  description: text("description").notNull(),
  merchantName: text("merchant_name").notNull(),
  merchantUrl: text("merchant_url"),
  metadata: text("metadata"), // JSON object
  status: text("status", { enum: ["pending", "approved", "rejected", "expired"] }).notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  rejectionCode: text("rejection_code"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Virtual Cards
export const virtualCards = sqliteTable("virtual_cards", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  purchaseIntentId: text("purchase_intent_id").notNull().references(() => purchaseIntents.id),
  stripeCardId: text("stripe_card_id").notNull(),
  last4: text("last4").notNull(),
  expMonth: integer("exp_month").notNull(),
  expYear: integer("exp_year").notNull(),
  hardLimit: real("hard_limit").notNull(),
  currency: text("currency").notNull(),
  status: text("status", { enum: ["active", "used", "expired", "canceled"] }).notNull().default("active"),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Transactions
export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  purchaseIntentId: text("purchase_intent_id").notNull().references(() => purchaseIntents.id),
  virtualCardId: text("virtual_card_id").references(() => virtualCards.id),
  stripeChargeId: text("stripe_charge_id").notNull().unique(),
  stripeAuthorizationId: text("stripe_authorization_id"),
  amount: real("amount").notNull(),
  currency: text("currency").notNull(),
  merchantName: text("merchant_name").notNull(),
  merchantMcc: text("merchant_mcc"),
  status: text("status", { enum: ["authorized", "captured", "failed", "refunded"] }).notNull(),
  settledAt: integer("settled_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Budget Tracking
export const budgetTracking = sqliteTable("budget_tracking", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  agentId: text("agent_id").references(() => agents.id),
  teamId: text("team_id").references(() => teams.id),
  projectId: text("project_id").references(() => projects.id),
  periodType: text("period_type", { enum: ["daily", "weekly", "monthly", "lifetime"] }).notNull(),
  periodStart: integer("period_start", { mode: "timestamp" }).notNull(),
  periodEnd: integer("period_end", { mode: "timestamp" }),
  amountSpent: real("amount_spent").notNull().default(0),
  amountReserved: real("amount_reserved").notNull().default(0),
  limit: real("limit"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Blocked Attempts
export const blockedAttempts = sqliteTable("blocked_attempts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  purchaseIntentId: text("purchase_intent_id").notNull().references(() => purchaseIntents.id),
  agentId: text("agent_id").notNull().references(() => agents.id),
  reasonCode: text("reason_code").notNull(),
  reasonMessage: text("reason_message").notNull(),
  policyId: text("policy_id").references(() => policies.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Audit Logs
export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id),
  agentId: text("agent_id").references(() => agents.id),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id").notNull(),
  details: text("details"), // JSON object
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

