# Database Schema

## Overview

Roony uses SQLite for development (easily switchable to PostgreSQL for production) with Drizzle ORM for type-safe database access.

## Tables

### organizations

Top-level organization/company with budget settings and guardrails.

```typescript
{
  id: string (primary key, uuid)
  name: string
  slug: string (unique)
  monthly_budget: number (nullable) // Total org spending limit
  alert_threshold: number (default 0.8) // Alert at 80%
  guardrails: string (JSON) // Org-wide rules
  created_at: timestamp
  updated_at: timestamp
}
```

**Guardrails JSON structure:**
```typescript
{
  blockCategories?: string[]        // ["gambling", "adult"]
  requireApprovalAbove?: number     // e.g., 500
  flagAllNewVendors?: boolean       // true/false
  maxTransactionAmount?: number     // Hard cap
}
```

### users

Stores user accounts for the dashboard.

```typescript
{
  id: string (primary key, uuid)
  email: string (unique)
  name: string
  password_hash: string
  role: 'admin' | 'finance' | 'developer'
  organization_id: string (foreign key → organizations.id)
  created_at: timestamp
  updated_at: timestamp
}
```

### agents

AI agents with spending controls built-in.

```typescript
{
  id: string (primary key, uuid)
  organization_id: string (foreign key → organizations.id)
  team_id: string (foreign key → teams.id, nullable)
  project_id: string (foreign key → projects.id, nullable)
  name: string
  description: string (nullable)
  api_key_hash: string (hashed API key)
  status: 'active' | 'paused' | 'suspended'
  
  // Spending limits
  monthly_limit: number (nullable)
  daily_limit: number (nullable)
  per_transaction_limit: number (nullable)
  
  // Approval rules
  approval_threshold: number (nullable)
  flag_new_vendors: boolean (default false)
  
  // Merchant restrictions (JSON arrays)
  blocked_merchants: string (JSON array, nullable)
  allowed_merchants: string (JSON array, nullable)
  
  created_at: timestamp
  updated_at: timestamp
}
```

### teams

Groups of agents (for reporting/organization).

```typescript
{
  id: string (primary key, uuid)
  organization_id: string (foreign key → organizations.id)
  name: string
  description: string (nullable)
  created_at: timestamp
  updated_at: timestamp
}
```

### projects

Project groupings for agents (optional).

```typescript
{
  id: string (primary key, uuid)
  organization_id: string (foreign key → organizations.id)
  name: string
  created_at: timestamp
  updated_at: timestamp
}
```

### stripe_connections

Stores Stripe Connect connections.

```typescript
{
  id: string (primary key, uuid)
  organization_id: string (foreign key → organizations.id)
  connected_account_id: string (Stripe account ID)
  access_token_encrypted: string (encrypted Stripe token)
  refresh_token_encrypted: string (encrypted refresh token)
  token_expires_at: timestamp
  status: 'active' | 'expired' | 'revoked'
  created_at: timestamp
  updated_at: timestamp
}
```

### known_merchants

Tracks merchants for new vendor detection.

```typescript
{
  id: string (primary key, uuid)
  organization_id: string (foreign key → organizations.id)
  merchant_name: string
  merchant_name_normalized: string (lowercase, trimmed)
  first_seen_at: timestamp
  last_seen_at: timestamp
  transaction_count: number (default 1)
}
```

### purchase_intents

Purchase requests from agents.

```typescript
{
  id: string (primary key, uuid)
  agent_id: string (foreign key → agents.id)
  organization_id: string (foreign key → organizations.id)
  amount: number (decimal)
  currency: string
  description: string
  merchant_name: string
  merchant_url: string (nullable)
  metadata: object (JSON - additional metadata)
  status: 'pending' | 'pending_approval' | 'approved' | 'rejected' | 'expired'
  rejection_reason: string (nullable)
  rejection_code: string (nullable)
  created_at: timestamp
  updated_at: timestamp
}
```

### pending_approvals

Queue for purchases requiring human review.

```typescript
{
  id: string (primary key, uuid)
  purchase_intent_id: string (foreign key → purchase_intents.id)
  organization_id: string (foreign key → organizations.id)
  agent_id: string (foreign key → agents.id)
  amount: number (decimal)
  merchant_name: string
  reason: string // "OVER_THRESHOLD", "NEW_VENDOR", "ORG_GUARDRAIL"
  reason_details: string (nullable)
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by: string (foreign key → users.id, nullable)
  reviewed_at: timestamp (nullable)
  review_notes: string (nullable)
  created_at: timestamp
  updated_at: timestamp
}
```

### virtual_cards

Virtual cards created via Stripe Issuing.

```typescript
{
  id: string (primary key, uuid)
  purchase_intent_id: string (foreign key → purchase_intents.id)
  stripe_card_id: string (Stripe card ID)
  last4: string
  exp_month: number
  exp_year: number
  hard_limit: number (decimal)
  currency: string
  status: 'active' | 'used' | 'expired' | 'canceled'
  expires_at: timestamp
  created_at: timestamp
  updated_at: timestamp
}
```

### transactions

Settled transactions from Stripe webhooks.

```typescript
{
  id: string (primary key, uuid)
  purchase_intent_id: string (foreign key → purchase_intents.id)
  virtual_card_id: string (foreign key → virtual_cards.id)
  stripe_charge_id: string (Stripe charge ID)
  stripe_authorization_id: string (Stripe authorization ID, nullable)
  amount: number (decimal)
  currency: string
  merchant_name: string
  merchant_mcc: string (merchant category code)
  status: 'authorized' | 'captured' | 'failed' | 'refunded'
  settled_at: timestamp (nullable)
  created_at: timestamp
  updated_at: timestamp
}
```

### budget_tracking

Tracks spending against budgets.

```typescript
{
  id: string (primary key, uuid)
  organization_id: string (foreign key → organizations.id)
  agent_id: string (foreign key → agents.id, nullable)
  team_id: string (foreign key → teams.id, nullable)
  project_id: string (foreign key → projects.id, nullable)
  period_type: 'daily' | 'weekly' | 'monthly' | 'lifetime'
  period_start: timestamp
  period_end: timestamp (nullable)
  amount_spent: number (decimal)
  amount_reserved: number (decimal)
  limit: number (decimal, nullable)
  created_at: timestamp
  updated_at: timestamp
}
```

### blocked_attempts

Log of blocked purchase attempts.

```typescript
{
  id: string (primary key, uuid)
  purchase_intent_id: string (foreign key → purchase_intents.id)
  agent_id: string (foreign key → agents.id)
  reason_code: string
  reason_message: string
  policy_id: string (foreign key → policies.id, nullable) // Deprecated
  created_at: timestamp
}
```

### policies (DEPRECATED)

*This table is deprecated. Spending controls are now directly on agents and organizations.*

```typescript
{
  id: string (primary key, uuid)
  organization_id: string (foreign key → organizations.id)
  name: string
  description: string (nullable)
  scope_type: 'agent' | 'team' | 'project' | 'org'
  scope_ids: string[] (JSON array of IDs)
  rules: object (JSON - policy rules)
  action: 'approve' | 'reject' | 'require_approval'
  priority: number
  enabled: boolean
  created_at: timestamp
  updated_at: timestamp
}
```

### audit_logs

Audit trail of all actions.

```typescript
{
  id: string (primary key, uuid)
  user_id: string (foreign key → users.id, nullable)
  agent_id: string (foreign key → agents.id, nullable)
  action: string
  resource_type: string
  resource_id: string
  details: object (JSON - action details)
  ip_address: string (nullable)
  user_agent: string (nullable)
  created_at: timestamp
}
```

## Relationships

```
organizations
  ├── users (one-to-many)
  ├── stripe_connections (one-to-many)
  ├── agents (one-to-many)
  ├── teams (one-to-many)
  ├── projects (one-to-many)
  ├── known_merchants (one-to-many)
  └── pending_approvals (one-to-many)

agents
  ├── purchase_intents (one-to-many)
  ├── pending_approvals (one-to-many)
  └── budget_tracking (one-to-many)

purchase_intents
  ├── virtual_cards (one-to-one)
  ├── pending_approvals (one-to-one)
  └── transactions (one-to-many)
```

## Indexes

- `users.email` (unique)
- `organizations.slug` (unique)
- `agents.api_key_hash` (for lookups)
- `purchase_intents.agent_id` (for filtering)
- `purchase_intents.status` (for filtering)
- `transactions.stripe_charge_id` (unique, for webhook idempotency)
- `known_merchants.organization_id, merchant_name_normalized` (composite)
- `pending_approvals.organization_id, status` (composite)
- `budget_tracking.organization_id, agent_id, period_type, period_start` (composite)

## Migrations

Use Drizzle migrations:

```bash
npm run db:generate  # Generate migration
npm run db:migrate   # Run migrations
npm run db:push      # Push schema changes directly
npm run db:studio    # Open Drizzle Studio
```
