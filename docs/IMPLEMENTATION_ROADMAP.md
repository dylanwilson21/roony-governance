# Roony v2.0 Implementation Roadmap

## Executive Summary

Transform Roony from a "Stripe Connect governance layer" to a **Universal AI Agent Payment Platform** with:

- **Simplified onboarding**: Saved cards instead of Stripe Connect OAuth
- **Multi-protocol support**: ACP (OpenAI), AP2 (Google), A2A, x402, L402, MCP
- **Transaction-based revenue**: Tiered percentage fees instead of flat SaaS pricing
- **Enterprise features**: RBAC, compliance, accounting integrations
- **Multi-rail payments**: Fiat cards, USDC (x402), Bitcoin Lightning (L402)

### The Vision

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ROONY GOVERNANCE LAYER                           │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  Spending limits • Approvals • Audit • Anomaly Detection       │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                  │                                      │
│         ┌────────────────────────┼────────────────────────┐            │
│         ▼                        ▼                        ▼            │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐       │
│  │    ACP      │         │    AP2      │         │    MCP      │       │
│  │  (OpenAI)   │         │  (Google)   │         │ (Anthropic) │       │
│  └─────────────┘         └─────────────┘         └─────────────┘       │
│         │                        │                        │            │
│         └────────────────────────┼────────────────────────┘            │
│                                  ▼                                      │
│              ┌────────────────────────────────────────┐                │
│              │           PAYMENT RAILS                │                │
│              │  Stripe Cards • x402 (USDC) • L402    │                │
│              └────────────────────────────────────────┘                │
│                                                                         │
│              All funded by customer's saved credit card                 │
│                         + Roony transaction fee                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase Overview

| Phase | Name | Duration | Focus |
|-------|------|----------|-------|
| **0** | Foundation | 2 weeks | Business model pivot, saved cards, fee system |
| **1** | Core Protocols | 3 weeks | ACP + AP2 integration |
| **2** | Critical Features | 3 weeks | Refunds, notifications, subscriptions |
| **3** | Crypto Rails | 2 weeks | x402 + L402 support |
| **4** | Enterprise | 3 weeks | RBAC, compliance, accounting |
| **5** | Polish & Scale | 2 weeks | Anomaly detection, performance |

**Total: ~15 weeks (3.5 months)**

---

## Fee Structure

### Volume Tiers (Base Rate)

| Monthly Volume | Base Rate | Typical Customer |
|----------------|-----------|------------------|
| $0 - $5,000 | 3.0% | Startups, indie devs |
| $5,001 - $25,000 | 2.5% | SMBs, growing teams |
| $25,001 - $100,000 | 2.0% | Mid-market |
| $100,001 - $500,000 | 1.5% | Enterprise |
| $500,000+ | 1.0% | Large enterprise (custom) |

### Rail Multipliers

| Payment Rail | Multiplier | Effective Range | Rationale |
|--------------|------------|-----------------|-----------|
| Stripe Virtual Card | 1.0x | 1.0% - 3.0% | Standard cost basis |
| Visa Intelligent Commerce | 1.0x | 1.0% - 3.0% | Card network |
| Mastercard Agent Pay | 1.0x | 1.0% - 3.0% | Card network |
| ACP (OpenAI) | 1.0x | 1.0% - 3.0% | Fiat settlement |
| AP2 (Google) | 0.8x | 0.8% - 2.4% | Protocol overhead |
| x402 (USDC) | 0.6x | 0.6% - 1.8% | No interchange |
| L402 (Lightning) | 0.5x | 0.5% - 1.5% | Lowest cost |

**Formula**: `EFFECTIVE_FEE = BASE_TIER_RATE × RAIL_MULTIPLIER`

---

# Before You Start Any Phase

## Required Reading

Before implementing any phase, understand the current codebase:

| Document | Purpose |
|----------|---------|
| `docs/ARCHITECTURE.md` | System overview, data flow, component relationships |
| `docs/SPENDING_CONTROLS.md` | Current governance model (org guardrails + agent limits) |
| `docs/STRIPE_INTEGRATION.md` | How Stripe Connect and Issuing work currently |
| `docs/DATABASE_SCHEMA.md` | All existing tables and relationships |
| `docs/API.md` | Current REST and MCP endpoints |
| `docs/MCP_INTEGRATION.md` | How MCP protocol is implemented |

## Key Files to Understand

### Database Layer
- `lib/database/schema.ts` - Drizzle ORM schema definitions (all tables)
- `lib/database/index.ts` - Database connection setup

### Current Stripe Integration
- `lib/stripe/client.ts` - Stripe client initialization
- `lib/stripe/connect.ts` - OAuth flow (BEING REMOVED in Phase 0)
- `lib/stripe/issuing.ts` - Virtual card creation (BEING MODIFIED in Phase 0)

### Current Purchase Flow
- `app/api/v1/purchase_intent/route.ts` - Main agent API endpoint
- `lib/spending/checker.ts` - Spending limit evaluation
- `app/api/webhooks/stripe/route.ts` - Webhook handler

### MCP Protocol (Already Implemented)
- `lib/mcp/server.ts` - MCP server implementation
- `lib/mcp/tools.ts` - Tool definitions
- `lib/mcp/handlers.ts` - Tool execution logic

## Development Environment Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables (copy from .env.example)
cp .env.example .env.local
# Edit .env.local with your Stripe test keys

# 3. Initialize database
npm run db:push

# 4. Start development server
npm run dev

# 5. In another terminal, start Stripe webhook forwarding
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

# Phase 0: Foundation

**Duration**: Weeks 1-2  
**Goal**: Replace Stripe Connect model with saved payment methods + Roony-issued cards

## Phase 0 Quick Start

### Why This Phase?

Currently, customers must:
1. Have their own Stripe account with Issuing enabled (hard to get)
2. Go through Stripe Connect OAuth flow
3. Manage their own card funding

After Phase 0, customers will:
1. Just add a credit/debit card
2. Roony creates virtual cards from our master account
3. Customer's card is charged after purchase + fee

### Prerequisites

- [ ] Stripe test API keys configured in `.env.local`
- [ ] Development database backed up (`cp roony.db roony.db.backup`)
- [ ] Understand current purchase flow (read `app/api/v1/purchase_intent/route.ts`)
- [ ] Roony Stripe Issuing account approved (for production)

### Files You Will CREATE (New Files)

```
lib/stripe/
├── customers.ts              # NEW - Stripe Customer management
└── payment-methods.ts        # NEW - Payment method CRUD

lib/billing/
└── fees.ts                   # NEW - Fee calculation and tiers

app/api/internal/payment-methods/
├── route.ts                  # NEW - GET (list), POST (add card)
└── [id]/
    ├── route.ts              # NEW - DELETE (remove card)
    └── default/
        └── route.ts          # NEW - PUT (set default)

app/(dashboard)/dashboard/settings/
├── payment-methods/
│   └── page.tsx              # NEW - Payment methods UI
└── billing/
    └── page.tsx              # NEW - Billing/fees UI
```

### Files You Will MODIFY (Existing Files)

```
lib/database/schema.ts        # Add new tables
lib/stripe/issuing.ts         # Change to use Roony's master account
app/api/v1/purchase_intent/route.ts  # Add pre-auth flow
app/api/webhooks/stripe/route.ts     # Add capture logic
app/(auth)/register/page.tsx  # Update onboarding flow
```

### Files You Will DELETE

```
app/api/stripe/connect/route.ts
app/api/stripe/connect/callback/route.ts  
app/api/stripe/connect/status/route.ts
lib/stripe/connect.ts
```

### Implementation Order

Execute in this order to avoid dependency issues:

```
Step 1: Database (0.1)
├── Add new tables to lib/database/schema.ts
├── Run: npm run db:push
└── Verify tables created in database

Step 2: Stripe Customer Management
├── Create lib/stripe/customers.ts
└── Create lib/stripe/payment-methods.ts

Step 3: Fee System (0.5)
├── Create lib/billing/fees.ts
└── Test fee calculations

Step 4: Payment Method APIs (0.3)
├── Create app/api/internal/payment-methods/route.ts
├── Create app/api/internal/payment-methods/[id]/route.ts
├── Create app/api/internal/payment-methods/[id]/default/route.ts
└── Test with curl commands

Step 5: Update Issuing (0.4)
├── Modify lib/stripe/issuing.ts
└── Test card creation from Roony account

Step 6: Update Purchase Flow (0.6)
├── Modify app/api/v1/purchase_intent/route.ts
├── Add pre-authorization logic
└── Test full flow

Step 7: Update Webhook Handler (0.6)
├── Modify app/api/webhooks/stripe/route.ts
├── Add capture logic
└── Test with stripe trigger commands

Step 8: Remove Stripe Connect (0.2)
├── Delete OAuth routes
├── Delete lib/stripe/connect.ts
├── Update settings UI to remove Connect button
└── Verify nothing breaks

Step 9: Frontend (0.7)
├── Create payment methods page
├── Create billing page
├── Update onboarding wizard
└── Test full user flow
```

### How to Test Phase 0

#### Test 1: Database Migration
```bash
# After updating schema.ts
npm run db:push

# Verify tables exist
npm run db:studio
# Check for: customer_payment_methods, transaction_fees, monthly_volumes
```

#### Test 2: Add Payment Method API
```bash
# First, get a session cookie by logging in via browser
# Then test the API:

# Create a test payment method in Stripe Dashboard or use:
# pm_card_visa (Stripe test payment method)

curl -X POST http://localhost:3000/api/internal/payment-methods \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d '{"paymentMethodId": "pm_card_visa"}'

# Expected response:
# { "id": "...", "last4": "4242", "brand": "visa", "isDefault": true }
```

#### Test 3: List Payment Methods
```bash
curl http://localhost:3000/api/internal/payment-methods \
  -H "Cookie: next-auth.session-token=YOUR_SESSION"

# Expected: Array of payment methods
```

#### Test 4: Full Purchase Flow
```bash
# Create an agent first via dashboard, get API key

# Make purchase request
curl -X POST http://localhost:3000/api/v1/purchase_intent \
  -H "Authorization: Bearer rk_YOUR_AGENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 25.00,
    "currency": "usd", 
    "description": "Test purchase",
    "merchant": {"name": "Test Merchant"}
  }'

# Expected (if approved):
# {
#   "status": "approved",
#   "card": { "number": "...", "exp_month": ..., "cvc": "..." },
#   "fee": { "amount": 0.75, "rate": "3.0%" }
# }
```

#### Test 5: Webhook Capture
```bash
# Trigger a test webhook
stripe trigger issuing_authorization.created

# Check logs for capture logic execution
# Verify customer card was charged (check Stripe Dashboard)
```

### Environment Variables to Add

```env
# Add to .env.local for Phase 0

# Roony's master Stripe Issuing account
ROONY_CARDHOLDER_ID=ich_xxx  # Create in Stripe Dashboard > Issuing > Cardholders
```

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "No payment method found" | Customer hasn't added a card yet - check onboarding |
| "Pre-auth failed" | Card was declined - handle gracefully, return error to agent |
| "Cannot create virtual card" | Check ROONY_CARDHOLDER_ID env var, verify Issuing is enabled |
| "Webhook not firing" | Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` |
| "Fee calculation wrong" | Check volume tier lookup - verify monthly_volumes table has data |

---

## 0.1 Database Schema Changes

### New Tables

```sql
-- Customer payment methods (replaces stripe_connections for OAuth)
CREATE TABLE customer_payment_methods (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  stripe_customer_id TEXT NOT NULL,
  stripe_payment_method_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'card', -- 'card', 'bank_account'
  brand TEXT, -- 'visa', 'mastercard', etc.
  last4 TEXT NOT NULL,
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active', -- 'active', 'expired', 'failed'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transaction fees tracking
CREATE TABLE transaction_fees (
  id TEXT PRIMARY KEY,
  purchase_intent_id TEXT NOT NULL REFERENCES purchase_intents(id),
  protocol TEXT NOT NULL, -- 'stripe_card', 'acp', 'ap2', 'x402', 'l402'
  transaction_amount REAL NOT NULL,
  volume_tier TEXT NOT NULL, -- 'starter', 'growth', 'business', 'enterprise'
  base_rate REAL NOT NULL, -- e.g., 0.03 for 3%
  rail_multiplier REAL NOT NULL DEFAULT 1.0,
  effective_rate REAL NOT NULL,
  fee_amount REAL NOT NULL,
  total_charged REAL NOT NULL,
  stripe_charge_id TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'charged', 'failed', 'refunded'
  charged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Monthly volume tracking for tier calculation
CREATE TABLE monthly_volumes (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  month TEXT NOT NULL, -- '2025-12'
  total_volume REAL DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  fee_revenue REAL DEFAULT 0,
  volume_tier TEXT,
  by_protocol TEXT, -- JSON: {"stripe_card": 5000, "x402": 2000}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, month)
);

-- Roony's treasury balances (for crypto rails)
CREATE TABLE treasury_balances (
  id TEXT PRIMARY KEY,
  rail TEXT NOT NULL UNIQUE, -- 'stripe_issuing', 'usdc_base', 'lightning'
  balance REAL NOT NULL DEFAULT 0,
  last_rebalance_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Schema Updates

```sql
-- Add to organizations
ALTER TABLE organizations ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE organizations ADD COLUMN billing_email TEXT;

-- Add to purchase_intents  
ALTER TABLE purchase_intents ADD COLUMN protocol TEXT DEFAULT 'stripe_card';
ALTER TABLE purchase_intents ADD COLUMN protocol_tx_id TEXT;
ALTER TABLE purchase_intents ADD COLUMN fee_amount REAL;
ALTER TABLE purchase_intents ADD COLUMN stripe_pre_auth_id TEXT;

-- Add to virtual_cards
ALTER TABLE virtual_cards ADD COLUMN is_recurring BOOLEAN DEFAULT false;
ALTER TABLE virtual_cards ADD COLUMN subscription_id TEXT;
```

## 0.2 Remove Stripe Connect OAuth

### Files to Delete/Deprecate

- `app/api/stripe/connect/route.ts`
- `app/api/stripe/connect/callback/route.ts`
- `app/api/stripe/connect/status/route.ts`
- `lib/stripe/connect.ts`

### Files to Modify

- `lib/stripe/issuing.ts` - Change to use Roony's master account

## 0.3 Payment Method Management

### New API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/internal/payment-methods` | Add a card |
| GET | `/api/internal/payment-methods` | List cards |
| DELETE | `/api/internal/payment-methods/[id]` | Remove card |
| PUT | `/api/internal/payment-methods/[id]/default` | Set default |
| POST | `/api/internal/payment-methods/[id]/verify` | Verify card (3DS) |

### New Files

```
app/api/internal/payment-methods/
├── route.ts                    # GET (list), POST (add)
└── [id]/
    ├── route.ts                # DELETE
    ├── default/route.ts        # PUT (set default)
    └── verify/route.ts         # POST (3DS verification)

lib/stripe/
├── customers.ts                # Stripe Customer management
└── payment-methods.ts          # Payment method CRUD
```

### Implementation: `lib/stripe/payment-methods.ts`

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createCustomer(orgId: string, email: string) {
  return stripe.customers.create({
    email,
    metadata: { organizationId: orgId }
  });
}

export async function attachPaymentMethod(
  customerId: string, 
  paymentMethodId: string
) {
  return stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });
}

export async function listPaymentMethods(customerId: string) {
  return stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });
}

export async function preAuthorizeCard(
  customerId: string,
  paymentMethodId: string,
  amount: number, // in cents
  currency: string
) {
  return stripe.paymentIntents.create({
    amount,
    currency,
    customer: customerId,
    payment_method: paymentMethodId,
    capture_method: 'manual', // Don't capture yet
    confirm: true,
  });
}

export async function capturePayment(
  paymentIntentId: string,
  amount: number // in cents, can be less than authorized
) {
  return stripe.paymentIntents.capture(paymentIntentId, {
    amount_to_capture: amount,
  });
}

export async function cancelPreAuth(paymentIntentId: string) {
  return stripe.paymentIntents.cancel(paymentIntentId);
}
```

## 0.4 Modify Virtual Card Issuance

### Update `lib/stripe/issuing.ts`

```typescript
// BEFORE: Used connected account
const card = await stripe.issuing.cards.create({...}, {
  stripeAccount: connectedAccountId
});

// AFTER: Use Roony's master Issuing account
const card = await stripe.issuing.cards.create({
  cardholder: process.env.ROONY_CARDHOLDER_ID!,
  type: 'virtual',
  currency: 'usd',
  spending_controls: {
    spending_limits: [{
      amount: amountInCents,
      interval: 'all_time'
    }],
  },
  metadata: {
    organizationId,
    agentId,
    purchaseIntentId,
  }
});
```

### New Environment Variables

```env
ROONY_STRIPE_ACCOUNT_ID=acct_roony_master
ROONY_CARDHOLDER_ID=ich_roony_cardholder
ROONY_ISSUING_FUNDING_SOURCE=... # Bank account for funding
```

## 0.5 Fee Calculation Service

### New File: `lib/billing/fees.ts`

```typescript
interface VolumeTier {
  name: string;
  minVolume: number;
  maxVolume: number;
  baseRate: number;
}

const VOLUME_TIERS: VolumeTier[] = [
  { name: 'starter', minVolume: 0, maxVolume: 5000, baseRate: 0.03 },
  { name: 'growth', minVolume: 5001, maxVolume: 25000, baseRate: 0.025 },
  { name: 'business', minVolume: 25001, maxVolume: 100000, baseRate: 0.02 },
  { name: 'enterprise', minVolume: 100001, maxVolume: Infinity, baseRate: 0.015 },
];

const RAIL_MULTIPLIERS: Record<string, number> = {
  'stripe_card': 1.0,
  'acp': 1.0,
  'ap2': 0.8,
  'visa_ic': 1.0,
  'mastercard_ap': 1.0,
  'x402': 0.6,
  'l402': 0.5,
};

export async function getVolumeTier(orgId: string): Promise<VolumeTier> {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const volume = await db.select()
    .from(monthlyVolumes)
    .where(eq(monthlyVolumes.organizationId, orgId))
    .where(eq(monthlyVolumes.month, currentMonth))
    .limit(1);
  
  const totalVolume = volume[0]?.totalVolume || 0;
  
  return VOLUME_TIERS.find(t => 
    totalVolume >= t.minVolume && totalVolume <= t.maxVolume
  ) || VOLUME_TIERS[0];
}

export function calculateFee(
  amount: number,
  tier: VolumeTier,
  protocol: string
): {
  baseRate: number;
  railMultiplier: number;
  effectiveRate: number;
  amount: number;
} {
  const railMultiplier = RAIL_MULTIPLIERS[protocol] || 1.0;
  const effectiveRate = tier.baseRate * railMultiplier;
  const feeAmount = amount * effectiveRate;
  
  return {
    baseRate: tier.baseRate,
    railMultiplier,
    effectiveRate,
    amount: Math.ceil(feeAmount * 100) / 100,
  };
}
```

## 0.6 Updated Purchase Flow

### Flow Diagram

```
1. Agent calls POST /api/v1/purchase_intent
2. Authenticate agent (unchanged)
3. Spending check (unchanged)
4. Get customer's default payment method
5. Pre-authorize customer's card (amount + fee + buffer)
6. Create JIT virtual card from Roony's account
7. Return card to agent
8. Agent uses card at merchant
9. Stripe webhook: issuing_authorization.created
10. Capture pre-auth for actual amount + fee
11. Update monthly volume and fee records
```

### Webhook Handler Update

```typescript
case 'issuing_authorization.created': {
  const auth = event.data.object as Stripe.Issuing.Authorization;
  
  // Find the purchase intent
  const purchaseIntent = await db.select()
    .from(purchaseIntents)
    .where(eq(purchaseIntents.id, auth.metadata.purchaseIntentId))
    .limit(1);
  
  if (purchaseIntent[0] && purchaseIntent[0].stripePreAuthId) {
    // Capture the exact amount + fee from customer's card
    const actualAmount = auth.amount / 100;
    const fee = purchaseIntent[0].feeAmount;
    const totalToCapture = Math.ceil((actualAmount + fee) * 100);
    
    await capturePayment(purchaseIntent[0].stripePreAuthId, totalToCapture);
    
    // Update fee record
    await db.update(transactionFees)
      .set({ status: 'charged', chargedAt: new Date() })
      .where(eq(transactionFees.purchaseIntentId, purchaseIntent[0].id));
    
    // Update monthly volume
    await updateMonthlyVolume(
      purchaseIntent[0].organizationId,
      actualAmount,
      fee
    );
  }
  break;
}
```

## 0.7 Frontend Updates

### New Pages

```
app/(dashboard)/dashboard/settings/
├── page.tsx                    # Update settings layout
├── payment-methods/
│   └── page.tsx                # NEW: Manage payment methods
├── billing/
│   └── page.tsx                # NEW: View fees and invoices
└── guardrails/
    └── page.tsx                # Existing: Move guardrails here
```

### Onboarding Flow Changes

After registration, redirect to onboarding wizard:
1. ~~Connect Stripe~~ → **Add Payment Method**
2. Set Organization Budget
3. Create First Agent

## Phase 0 Checklist

- [ ] Database migrations
  - [ ] customer_payment_methods table
  - [ ] transaction_fees table
  - [ ] monthly_volumes table
  - [ ] Update organizations, purchase_intents, virtual_cards
- [ ] Remove Stripe Connect
  - [ ] Delete OAuth routes
  - [ ] Delete connect.ts lib
  - [ ] Update UI to remove Connect button
- [ ] Payment Method APIs
  - [ ] POST /api/internal/payment-methods
  - [ ] GET /api/internal/payment-methods
  - [ ] DELETE /api/internal/payment-methods/[id]
  - [ ] PUT /api/internal/payment-methods/[id]/default
- [ ] Fee System
  - [ ] lib/billing/fees.ts
  - [ ] Volume tier calculation
  - [ ] Fee recording
- [ ] Purchase Flow Update
  - [ ] Pre-authorize customer card
  - [ ] Issue from Roony account
  - [ ] Capture on webhook
- [ ] Frontend
  - [ ] Payment Methods page
  - [ ] Billing page
  - [ ] Updated onboarding
  - [ ] Fee display in transactions
- [ ] Testing
  - [ ] Full purchase flow
  - [ ] Fee calculation
  - [ ] Pre-auth and capture
  - [ ] Card decline handling

---

# Phase 1: Core Protocols

**Duration**: Weeks 3-5  
**Goal**: Add ACP (OpenAI) and AP2 (Google) protocol support

## Phase 1 Quick Start

### Why This Phase?

Roony currently only supports its own MCP protocol. After Phase 1:
- OpenAI agents can use Roony via the ACP (Agentic Commerce Protocol)
- Google agents can use Roony via AP2 (Agent Payments Protocol)
- Any agent can discover Roony via A2A agent discovery

### Prerequisites

- [ ] Phase 0 fully complete and tested
- [ ] Read ACP spec: https://developers.openai.com/commerce
- [ ] Read AP2 spec: https://github.com/google-agentic-commerce/AP2
- [ ] Read A2A spec: https://google-a2a.wiki

### Files You Will CREATE

```
lib/protocols/
├── types.ts                  # Common protocol interfaces
├── registry.ts               # Protocol registration system
├── acp/
│   ├── index.ts              # ACP protocol handler
│   ├── types.ts              # ACP-specific types
│   └── validator.ts          # Request validation
└── ap2/
    ├── index.ts              # AP2 protocol handler
    ├── types.ts              # AP2-specific types
    └── validator.ts          # Request validation

app/api/acp/
└── delegated-payment/
    └── route.ts              # ACP endpoint

app/api/ap2/
└── payment/
    └── route.ts              # AP2 endpoint

app/api/.well-known/
└── agent.json/
    └── route.ts              # A2A agent discovery
```

### Implementation Order

```
Step 1: Protocol Abstraction (1.1)
├── Create lib/protocols/types.ts
├── Create lib/protocols/registry.ts
└── Test registry works

Step 2: ACP Protocol (1.2)
├── Create lib/protocols/acp/types.ts
├── Create lib/protocols/acp/index.ts
├── Create app/api/acp/delegated-payment/route.ts
├── Register ACP in registry
└── Test with curl

Step 3: AP2 Protocol (1.3)
├── Create lib/protocols/ap2/types.ts
├── Create lib/protocols/ap2/index.ts
├── Create app/api/ap2/payment/route.ts
├── Register AP2 in registry
└── Test with curl

Step 4: A2A Discovery (1.4)
├── Create app/api/.well-known/agent.json/route.ts
└── Test discovery endpoint
```

### How to Test

```bash
# Test A2A Discovery
curl http://localhost:3000/api/.well-known/agent.json

# Test ACP endpoint
curl -X POST http://localhost:3000/api/acp/delegated-payment \
  -H "Content-Type: application/json" \
  -d '{
    "checkout_session": {
      "id": "sess_123",
      "merchant": {"id": "m_1", "name": "Test", "domain": "test.com"},
      "amount": {"value": "25.00", "currency": "usd"},
      "line_items": [{"name": "Widget", "quantity": 1, "unit_price": "25.00"}]
    },
    "agent_credentials": {"type": "api_key", "token": "rk_YOUR_AGENT_KEY"}
  }'

# Test AP2 endpoint
curl -X POST http://localhost:3000/api/ap2/payment \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "req_123",
    "intent": "purchase",
    "amount": {"value": 25.00, "currency": "usd"},
    "merchant": {"name": "Test Merchant"},
    "agent": {"id": "agent_1", "credential": "rk_YOUR_AGENT_KEY"}
  }'
```

---

## 1.1 Protocol Abstraction Layer

### New File: `lib/protocols/types.ts`

```typescript
export interface ProtocolRequest {
  agentId: string;
  amount: number;
  currency: string;
  merchant: {
    id?: string;
    name: string;
    domain?: string;
  };
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  metadata?: Record<string, unknown>;
  protocol: string;
  protocolData?: Record<string, unknown>;
}

export interface ProtocolResponse {
  status: 'authorized' | 'pending_approval' | 'declined';
  protocol: string;
  authorizationId?: string;
  paymentMethod?: {
    type: string;
    details: Record<string, unknown>;
  };
  declineReason?: string;
  expiresAt?: string;
  fee?: {
    amount: number;
    rate: string;
  };
}

export interface PaymentProtocol {
  name: string;
  version: string;
  validateRequest(raw: unknown): ProtocolRequest;
  authorize(request: ProtocolRequest): Promise<ProtocolResponse>;
  formatResponse(response: ProtocolResponse): unknown;
  handleCallback?(event: unknown): Promise<void>;
}
```

### New File: `lib/protocols/registry.ts`

```typescript
import { PaymentProtocol } from './types';

class ProtocolRegistry {
  private protocols = new Map<string, PaymentProtocol>();
  
  register(protocol: PaymentProtocol) {
    this.protocols.set(protocol.name, protocol);
  }
  
  get(name: string): PaymentProtocol | undefined {
    return this.protocols.get(name);
  }
  
  list(): string[] {
    return Array.from(this.protocols.keys());
  }
}

export const protocolRegistry = new ProtocolRegistry();
```

## 1.2 ACP Protocol Implementation

### File Structure

```
lib/protocols/acp/
├── index.ts           # Main ACP protocol handler
├── types.ts           # ACP-specific types
├── validator.ts       # Request validation
└── transformer.ts     # Request/response transforms
```

### ACP Types: `lib/protocols/acp/types.ts`

```typescript
// Based on ACP Delegated Payment Spec
// https://developers.openai.com/commerce/specs/delegated-payment

export interface ACPDelegatedPaymentRequest {
  checkout_session: {
    id: string;
    merchant: {
      id: string;
      name: string;
      domain: string;
    };
    amount: {
      value: string;
      currency: string;
    };
    line_items: Array<{
      name: string;
      description?: string;
      quantity: number;
      unit_price: string;
    }>;
  };
  agent_credentials: {
    type: 'api_key' | 'oauth';
    token: string;
  };
  user_context?: {
    id?: string;
    preferences?: Record<string, unknown>;
  };
}

export interface ACPDelegatedPaymentResponse {
  status: 'authorized' | 'pending_user_action' | 'declined';
  payment_token?: string;
  authorization_id?: string;
  expires_at?: string;
  pending_action?: {
    type: 'approval_required';
    action_url?: string;
    message: string;
  };
  decline?: {
    code: string;
    message: string;
  };
}
```

### ACP Handler: `lib/protocols/acp/index.ts`

```typescript
import { PaymentProtocol, ProtocolRequest, ProtocolResponse } from '../types';
import { ACPDelegatedPaymentRequest, ACPDelegatedPaymentResponse } from './types';
import { checkSpending, createPendingApproval } from '@/lib/spending/checker';
import { authenticateAgentByToken } from '@/lib/auth/agents';
import { createPaymentToken } from '@/lib/payments/tokens';

export class ACPProtocol implements PaymentProtocol {
  name = 'acp';
  version = '1.0';
  
  validateRequest(raw: unknown): ProtocolRequest {
    const acp = raw as ACPDelegatedPaymentRequest;
    
    if (!acp.checkout_session?.id) {
      throw new Error('Missing checkout_session.id');
    }
    if (!acp.agent_credentials?.token) {
      throw new Error('Missing agent_credentials.token');
    }
    
    return {
      agentId: '',
      amount: parseFloat(acp.checkout_session.amount.value),
      currency: acp.checkout_session.amount.currency,
      merchant: {
        id: acp.checkout_session.merchant.id,
        name: acp.checkout_session.merchant.name,
        domain: acp.checkout_session.merchant.domain,
      },
      items: acp.checkout_session.line_items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: parseFloat(item.unit_price),
      })),
      protocol: 'acp',
      protocolData: {
        checkoutSessionId: acp.checkout_session.id,
        agentToken: acp.agent_credentials.token,
      },
    };
  }
  
  async authorize(request: ProtocolRequest): Promise<ProtocolResponse> {
    const agent = await authenticateAgentByToken(
      request.protocolData?.agentToken as string
    );
    if (!agent) {
      return {
        status: 'declined',
        protocol: 'acp',
        declineReason: 'Invalid agent credentials',
      };
    }
    
    const checkResult = await checkSpending({
      agentId: agent.id,
      amount: request.amount,
      currency: request.currency,
      merchantName: request.merchant.name,
      description: request.items?.map(i => i.name).join(', ') || 'ACP Purchase',
    });
    
    if (!checkResult.allowed && !checkResult.requiresApproval) {
      return {
        status: 'declined',
        protocol: 'acp',
        declineReason: checkResult.rejectionMessage,
      };
    }
    
    if (checkResult.requiresApproval) {
      const approvalId = await createPendingApproval(/* ... */);
      return {
        status: 'pending_approval',
        protocol: 'acp',
        authorizationId: approvalId,
      };
    }
    
    const { token, expiresAt, fee } = await createPaymentToken({
      agentId: agent.id,
      organizationId: agent.organizationId,
      amount: request.amount,
      currency: request.currency,
      merchant: request.merchant,
      protocol: 'acp',
    });
    
    return {
      status: 'authorized',
      protocol: 'acp',
      authorizationId: token,
      paymentMethod: {
        type: 'payment_token',
        details: { token },
      },
      expiresAt: expiresAt.toISOString(),
      fee: {
        amount: fee.amount,
        rate: `${(fee.effectiveRate * 100).toFixed(1)}%`,
      },
    };
  }
  
  formatResponse(response: ProtocolResponse): ACPDelegatedPaymentResponse {
    if (response.status === 'declined') {
      return {
        status: 'declined',
        decline: {
          code: 'POLICY_VIOLATION',
          message: response.declineReason || 'Request denied',
        },
      };
    }
    
    if (response.status === 'pending_approval') {
      return {
        status: 'pending_user_action',
        pending_action: {
          type: 'approval_required',
          message: 'This purchase requires approval from an administrator',
        },
        authorization_id: response.authorizationId,
      };
    }
    
    return {
      status: 'authorized',
      payment_token: response.paymentMethod?.details.token as string,
      authorization_id: response.authorizationId,
      expires_at: response.expiresAt,
    };
  }
}
```

### ACP API Endpoint: `app/api/acp/delegated-payment/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { protocolRegistry } from '@/lib/protocols/registry';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const acp = protocolRegistry.get('acp');
    if (!acp) {
      return NextResponse.json(
        { error: 'ACP protocol not available' },
        { status: 503 }
      );
    }
    
    const protocolRequest = acp.validateRequest(body);
    const response = await acp.authorize(protocolRequest);
    const acpResponse = acp.formatResponse(response);
    
    return NextResponse.json(acpResponse);
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'declined',
        decline: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        }
      },
      { status: 500 }
    );
  }
}
```

## 1.3 AP2 Protocol Implementation

### File Structure

```
lib/protocols/ap2/
├── index.ts           # Main AP2 protocol handler
├── types.ts           # AP2-specific types
└── validator.ts       # Request validation
```

### AP2 Types: `lib/protocols/ap2/types.ts`

```typescript
// Based on AP2 Spec
// https://github.com/google-agentic-commerce/AP2

export interface AP2PaymentRequest {
  request_id: string;
  intent: 'purchase' | 'authorization' | 'pre_authorization';
  amount: {
    value: number;
    currency: string;
  };
  merchant: {
    name: string;
    merchant_id?: string;
    url?: string;
    category?: string;
  };
  items?: Array<{
    name: string;
    description?: string;
    quantity: number;
    unit_price: number;
    category?: string;
  }>;
  agent: {
    id: string;
    name?: string;
    credential: string;
  };
  metadata?: Record<string, unknown>;
}

export interface AP2PaymentResult {
  request_id: string;
  status: 'approved' | 'pending' | 'declined';
  authorization?: {
    id: string;
    code: string;
    expires_at: string;
  };
  payment_method?: {
    type: 'virtual_card' | 'crypto' | 'token';
    card?: {
      number: string;
      exp_month: number;
      exp_year: number;
      cvc: string;
    };
    crypto?: {
      address: string;
      network: string;
      asset: string;
    };
  };
  decline_reason?: {
    code: string;
    message: string;
    suggestion?: string;
  };
  fee?: {
    amount: number;
    currency: string;
    rate: string;
  };
}
```

## 1.4 A2A Agent Discovery

### New File: `app/api/.well-known/agent.json/route.ts`

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    name: "Roony Payment Governance",
    description: "Financial governance layer for AI agent spending.",
    url: process.env.NEXT_PUBLIC_APP_URL,
    version: "2.0.0",
    
    capabilities: {
      streaming: false,
      pushNotifications: true,
    },
    
    skills: [
      {
        id: "authorize_payment",
        name: "Authorize Payment",
        description: "Request payment authorization for a purchase.",
        inputModes: ["application/json"],
        outputModes: ["application/json"],
      },
      {
        id: "check_budget",
        name: "Check Budget",
        description: "Get remaining budget and spending limits.",
        inputModes: ["application/json"],
        outputModes: ["application/json"],
      },
    ],
    
    protocols: {
      acp: { version: "1.0", endpoint: "/api/acp/delegated-payment" },
      ap2: { version: "1.0", endpoint: "/api/ap2/payment" },
      mcp: { version: "2024-11-05", endpoint: "/api/mcp" },
    },
    
    paymentRails: ["stripe_card", "x402", "l402"],
  });
}
```

## Phase 1 Checklist

- [ ] Protocol abstraction layer
  - [ ] lib/protocols/types.ts
  - [ ] lib/protocols/registry.ts
- [ ] ACP Protocol
  - [ ] lib/protocols/acp/*
  - [ ] app/api/acp/delegated-payment/route.ts
  - [ ] ACP approval polling endpoint
- [ ] AP2 Protocol
  - [ ] lib/protocols/ap2/*
  - [ ] app/api/ap2/payment/route.ts
- [ ] A2A Discovery
  - [ ] app/api/.well-known/agent.json/route.ts
- [ ] Documentation
  - [ ] Update docs/API.md with new endpoints
  - [ ] Create docs/PROTOCOLS.md
- [ ] Testing
  - [ ] ACP end-to-end test
  - [ ] AP2 end-to-end test
  - [ ] Protocol selection logic

---

# Phase 2: Critical Features

**Duration**: Weeks 6-8  
**Goal**: Add refunds, notifications, and subscription management

## Phase 2 Quick Start

### Why This Phase?

Real-world usage requires handling edge cases. After Phase 2:
- Refunds flow back to customer cards automatically
- Users get notified about important events (approvals, anomalies)
- Subscription payments are tracked and renewed automatically

### Prerequisites

- [ ] Phase 1 fully complete and tested
- [ ] Resend API key for email (https://resend.com)
- [ ] Optional: Slack workspace for testing Slack notifications

### Files You Will CREATE

```
lib/notifications/
├── index.ts                  # Notification dispatcher
├── channels/
│   ├── email.ts              # Resend/SendGrid integration
│   ├── slack.ts              # Slack webhooks
│   └── webhook.ts            # Custom webhook delivery
└── templates/
    ├── approval-required.ts
    ├── purchase-completed.ts
    ├── budget-alert.ts
    └── refund-processed.ts

lib/cron/
└── subscription-renewal.ts   # Daily renewal job

app/api/internal/refunds/
└── route.ts                  # GET (list), POST (manual refund)

app/api/internal/notification-settings/
├── route.ts                  # GET, POST
├── [id]/route.ts             # PUT, DELETE
└── test/route.ts             # POST (send test)

app/api/internal/subscriptions/
├── route.ts                  # GET, POST
└── [id]/
    ├── route.ts              # PUT, DELETE
    └── renew/route.ts        # POST (manual renewal)

app/(dashboard)/dashboard/
├── notifications/page.tsx    # Notification settings UI
└── subscriptions/page.tsx    # Subscription management UI
```

### Environment Variables to Add

```env
# Email (Resend)
RESEND_API_KEY=re_xxx

# Optional: Slack
SLACK_SIGNING_SECRET=xxx
```

### Implementation Order

```
Step 1: Refund System (2.1)
├── Add refunds table to schema
├── Update webhook handler for charge.refunded
├── Create refund API endpoints
└── Test refund flow

Step 2: Notification System (2.2)
├── Add notification tables to schema
├── Create email channel (Resend)
├── Create Slack channel
├── Create webhook channel
├── Create notification dispatcher
├── Integrate into purchase flow
└── Test notifications

Step 3: Subscription Management (2.3)
├── Add subscription tables to schema
├── Create subscription API endpoints
├── Create renewal cron job
├── Create subscription UI
└── Test renewal flow
```

### How to Test

```bash
# Test Refund (after a purchase)
curl -X POST http://localhost:3000/api/internal/refunds \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -H "Content-Type: application/json" \
  -d '{"purchaseIntentId": "pi_xxx", "amount": 25.00, "reason": "Test refund"}'

# Test Notification Settings
curl -X POST http://localhost:3000/api/internal/notification-settings \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "email",
    "config": {"email": "test@example.com"},
    "events": ["approval_required", "purchase_completed"]
  }'

# Test Notification Send
curl -X POST http://localhost:3000/api/internal/notification-settings/test \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -H "Content-Type: application/json" \
  -d '{"settingId": "ns_xxx"}'
```

---

## 2.1 Refund System

### New Table

```sql
CREATE TABLE refunds (
  id TEXT PRIMARY KEY,
  purchase_intent_id TEXT NOT NULL REFERENCES purchase_intents(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  original_amount REAL NOT NULL,
  refund_amount REAL NOT NULL,
  fee_refunded REAL DEFAULT 0,
  reason TEXT,
  source TEXT NOT NULL, -- 'merchant', 'manual', 'chargeback'
  stripe_refund_id TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'processed', 'failed'
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### New API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/internal/refunds` | Manual refund request |
| GET | `/api/internal/refunds` | List refunds |

### Webhook Handler for Refunds

```typescript
case 'charge.refunded': {
  const charge = event.data.object as Stripe.Charge;
  
  const tx = await findTransactionByStripeChargeId(charge.id);
  if (!tx) break;
  
  // Calculate proportional fee refund
  const refundRatio = charge.amount_refunded / charge.amount;
  const feeRefund = tx.feeAmount * refundRatio;
  
  // Create refund record
  await db.insert(refunds).values({
    purchaseIntentId: tx.purchaseIntentId,
    organizationId: tx.organizationId,
    originalAmount: tx.amount,
    refundAmount: charge.amount_refunded / 100,
    feeRefunded: feeRefund,
    source: 'merchant',
    stripeRefundId: charge.refunds.data[0]?.id,
    status: 'processed',
    processedAt: new Date(),
  });
  
  // Refund customer's card
  await stripe.refunds.create({
    payment_intent: tx.customerPaymentIntentId,
    amount: Math.round((charge.amount_refunded / 100 + feeRefund) * 100),
  });
  
  // Restore agent's budget
  await restoreAgentBudget(tx.agentId, charge.amount_refunded / 100);
  
  // Notify customer
  await sendNotification(tx.organizationId, 'refund_processed', {
    amount: charge.amount_refunded / 100,
    merchant: tx.merchantName,
  });
  
  break;
}
```

## 2.2 Notification System

### New Tables

```sql
CREATE TABLE notification_settings (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  channel TEXT NOT NULL, -- 'email', 'slack', 'webhook'
  config TEXT NOT NULL, -- JSON: channel-specific config
  events TEXT NOT NULL, -- JSON array: ['approval_required', ...]
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notification_log (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  user_id TEXT,
  channel TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL, -- JSON
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### File Structure

```
lib/notifications/
├── index.ts           # Main notification dispatcher
├── channels/
│   ├── email.ts       # Email via Resend/SendGrid
│   ├── slack.ts       # Slack webhook
│   └── webhook.ts     # Custom webhook
└── templates/
    ├── approval-required.ts
    ├── purchase-completed.ts
    ├── budget-alert.ts
    └── refund-processed.ts
```

### Notification Dispatcher: `lib/notifications/index.ts`

```typescript
export type NotificationEvent = 
  | 'approval_required'
  | 'purchase_completed'
  | 'purchase_declined'
  | 'budget_threshold'
  | 'refund_processed'
  | 'anomaly_detected';

export async function sendNotification(
  orgId: string,
  event: NotificationEvent,
  data: Record<string, unknown>
) {
  const settings = await db.select()
    .from(notificationSettings)
    .where(eq(notificationSettings.organizationId, orgId))
    .where(eq(notificationSettings.enabled, true));
  
  for (const setting of settings) {
    const events = JSON.parse(setting.events);
    if (!events.includes(event)) continue;
    
    const config = JSON.parse(setting.config);
    
    try {
      switch (setting.channel) {
        case 'email':
          await sendEmail(config.email, event, data);
          break;
        case 'slack':
          await sendSlack(config.webhookUrl, event, data);
          break;
        case 'webhook':
          await sendWebhook(config.url, config.secret, event, data);
          break;
      }
      await logNotification(orgId, setting.userId, setting.channel, event, data, 'sent');
    } catch (error) {
      await logNotification(orgId, setting.userId, setting.channel, event, data, 'failed', error);
    }
  }
}
```

### Notification API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/internal/notification-settings` | List settings |
| POST | `/api/internal/notification-settings` | Create setting |
| PUT | `/api/internal/notification-settings/[id]` | Update setting |
| DELETE | `/api/internal/notification-settings/[id]` | Delete setting |
| POST | `/api/internal/notification-settings/test` | Send test |

## 2.3 Subscription Management

### New Tables

```sql
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  agent_id TEXT NOT NULL REFERENCES agents(id),
  merchant_name TEXT NOT NULL,
  merchant_url TEXT,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  interval TEXT NOT NULL, -- 'monthly', 'yearly', 'weekly'
  next_billing_date DATE NOT NULL,
  card_id TEXT REFERENCES virtual_cards(id),
  status TEXT DEFAULT 'active', -- 'active', 'paused', 'cancelled'
  auto_renew BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subscription_events (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
  event_type TEXT NOT NULL, -- 'created', 'renewed', 'failed', 'cancelled'
  amount REAL,
  purchase_intent_id TEXT REFERENCES purchase_intents(id),
  error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Subscription API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/internal/subscriptions` | List subscriptions |
| POST | `/api/internal/subscriptions` | Register subscription |
| PUT | `/api/internal/subscriptions/[id]` | Update (pause/resume) |
| DELETE | `/api/internal/subscriptions/[id]` | Cancel |
| POST | `/api/internal/subscriptions/[id]/renew` | Manual renewal |

### Renewal Cron Job: `lib/cron/subscription-renewal.ts`

```typescript
// Run daily
export async function processSubscriptionRenewals() {
  const today = new Date().toISOString().split('T')[0];
  
  const dueSubscriptions = await db.select()
    .from(subscriptions)
    .where(eq(subscriptions.status, 'active'))
    .where(eq(subscriptions.autoRenew, true))
    .where(lte(subscriptions.nextBillingDate, today));
  
  for (const sub of dueSubscriptions) {
    try {
      const result = await createPurchaseIntent({
        agentId: sub.agentId,
        amount: sub.amount,
        currency: sub.currency,
        merchant: { name: sub.merchantName },
        metadata: { subscriptionId: sub.id, type: 'renewal' },
      });
      
      if (result.status === 'approved') {
        const nextDate = calculateNextBillingDate(sub.interval);
        await db.update(subscriptions)
          .set({ nextBillingDate: nextDate })
          .where(eq(subscriptions.id, sub.id));
        
        await logSubscriptionEvent(sub.id, 'renewed', sub.amount, result.purchaseIntentId);
      } else {
        await logSubscriptionEvent(sub.id, 'failed', sub.amount, null, result.message);
        await sendNotification(sub.organizationId, 'subscription_renewal_failed', {
          merchant: sub.merchantName,
          reason: result.message,
        });
      }
    } catch (error) {
      await logSubscriptionEvent(sub.id, 'failed', sub.amount, null, error.message);
    }
  }
}
```

## Phase 2 Checklist

- [ ] Refund System
  - [ ] refunds table
  - [ ] Webhook handling for charge.refunded
  - [ ] Customer card refund
  - [ ] Budget restoration
  - [ ] API endpoints
  - [ ] UI: Refund history in transactions
- [ ] Notification System
  - [ ] notification_settings table
  - [ ] notification_log table
  - [ ] Email channel (Resend)
  - [ ] Slack channel
  - [ ] Webhook channel
  - [ ] Settings UI
  - [ ] Integration in purchase flow
- [ ] Subscription Management
  - [ ] subscriptions table
  - [ ] subscription_events table
  - [ ] API endpoints
  - [ ] Renewal cron job
  - [ ] Dashboard: Active subscriptions list
  - [ ] Cancel/pause functionality

---

# Phase 3: Crypto Rails

**Duration**: Weeks 9-10  
**Goal**: Add x402 (USDC) and L402 (Lightning) payment support

## Phase 3 Quick Start

### Why This Phase?

Many AI-native services only accept crypto payments (USDC or Bitcoin Lightning). After Phase 3:
- Agents can pay x402-enabled services (USDC on Base chain)
- Agents can pay L402-enabled services (Bitcoin Lightning)
- Users don't need to understand crypto - their card is charged USD

### Prerequisites

- [ ] Phase 2 fully complete and tested
- [ ] USDC wallet set up on Base network
- [ ] Lightning node or custodial account (Strike, Voltage)
- [ ] Coinbase or Circle API for USD → USDC swaps
- [ ] Read x402 spec: https://www.x402.org/x402-whitepaper.pdf
- [ ] Read L402 spec: https://l402.org

### Files You Will CREATE

```
lib/protocols/x402/
├── index.ts                  # x402 protocol handler
├── types.ts                  # x402 types
├── wallet.ts                 # USDC wallet management (viem)
└── swap.ts                   # USD → USDC conversion

lib/protocols/l402/
├── index.ts                  # L402 protocol handler  
├── types.ts                  # L402/LSAT types
├── lightning.ts              # Lightning node client
└── invoice.ts                # Invoice parsing

lib/treasury/
└── index.ts                  # Balance management across rails
```

### Environment Variables to Add

```env
# x402 / USDC (Base Network)
BASE_RPC_URL=https://mainnet.base.org
ROONY_WALLET_ADDRESS=0x...
ROONY_WALLET_PRIVATE_KEY=...  # Use secrets manager in production!

# Coinbase for swaps
COINBASE_API_KEY=...
COINBASE_API_SECRET=...

# L402 / Lightning
LIGHTNING_NODE_URL=https://your-node.voltage.cloud
LIGHTNING_MACAROON=...
# OR for Strike:
STRIKE_API_KEY=...
```

### Implementation Order

```
Step 1: Treasury Management (3.3)
├── Add treasury_balances table
├── Create lib/treasury/index.ts
└── Test balance queries

Step 2: x402 Protocol (3.1)
├── Create lib/protocols/x402/wallet.ts
├── Create lib/protocols/x402/swap.ts  
├── Create lib/protocols/x402/index.ts
├── Register in protocol registry
└── Test with testnet USDC

Step 3: L402 Protocol (3.2)
├── Create lib/protocols/l402/lightning.ts
├── Create lib/protocols/l402/invoice.ts
├── Create lib/protocols/l402/index.ts
├── Register in protocol registry
└── Test with Lightning testnet
```

### How to Test

```bash
# Test x402 payment (requires testnet setup)
# First, get a 402 response from an x402 service
# Then process through Roony

# Test L402 payment
curl -X POST http://localhost:3000/api/v1/purchase_intent \
  -H "Authorization: Bearer rk_YOUR_AGENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 0.10,
    "currency": "usd",
    "protocol": "l402",
    "protocolData": {
      "invoice": "lnbc100n1p..."
    }
  }'

# Test treasury balances
curl http://localhost:3000/api/internal/treasury/balances \
  -H "Cookie: next-auth.session-token=YOUR_SESSION"
```

### Important Notes

1. **Start with testnet** - Use Base Sepolia for x402 and Lightning testnet for L402
2. **Treasury pre-funding** - You need USDC and BTC in treasury before agents can use crypto rails
3. **Swap latency** - USD → USDC swaps take time; pre-authorize more than needed
4. **Rate volatility** - For L402, fetch BTC/USD rate at time of purchase

---

## 3.1 x402 Protocol Implementation

### File Structure

```
lib/protocols/x402/
├── index.ts           # Main x402 handler
├── types.ts           # x402 types
├── wallet.ts          # USDC wallet management
└── swap.ts            # USD -> USDC conversion
```

### x402 Flow

```
1. Agent hits merchant API -> gets HTTP 402 response
2. 402 response contains: { maxAmountRequired, asset: "USDC", payTo, network }
3. Roony pre-authorizes customer's card (USD amount + buffer)
4. Roony swaps USD -> USDC via Coinbase/Circle
5. Roony signs x402 payment from treasury wallet
6. Agent retries request with signed payment header
7. Merchant validates and returns response
8. Roony captures customer's card for actual amount + fee
```

### Wallet Management: `lib/protocols/x402/wallet.ts`

```typescript
import { createWalletClient, http } from 'viem';
import { base } from 'viem/chains';

const walletClient = createWalletClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL),
});

export async function signX402Payment(
  amount: bigint,
  payTo: `0x${string}`,
  nonce: string
) {
  const signature = await walletClient.signTypedData({
    account: process.env.ROONY_WALLET_ADDRESS as `0x${string}`,
    domain: {
      name: 'x402',
      version: '1',
      chainId: base.id,
    },
    types: {
      Payment: [
        { name: 'amount', type: 'uint256' },
        { name: 'payTo', type: 'address' },
        { name: 'nonce', type: 'string' },
      ],
    },
    primaryType: 'Payment',
    message: { amount, payTo, nonce },
  });
  
  return signature;
}

export async function getUSDCBalance(): Promise<number> {
  // Query USDC balance on Base
}
```

## 3.2 L402 Protocol Implementation

### File Structure

```
lib/protocols/l402/
├── index.ts           # Main L402 handler
├── types.ts           # L402/LSAT types
├── lightning.ts       # Lightning node client
└── invoice.ts         # Invoice parsing
```

### L402 Flow

```
1. Agent hits merchant API -> gets HTTP 402 + Lightning invoice
2. 402 response contains: { invoice, amount_sats, description }
3. Roony pre-authorizes customer's card (USD equivalent + buffer)
4. Roony converts current BTC/USD rate
5. Roony pays Lightning invoice from node/custodial account
6. Merchant returns preimage (proof of payment)
7. Agent retries with preimage in header
8. Roony captures customer's card for actual amount + fee
```

## 3.3 Treasury Management

### New File: `lib/treasury/index.ts`

```typescript
interface TreasuryBalance {
  rail: string;
  balance: number;
  lastUpdated: Date;
}

export async function getBalances(): Promise<TreasuryBalance[]> {
  return [
    { 
      rail: 'stripe_issuing', 
      balance: await getStripeIssuingBalance(), 
      lastUpdated: new Date() 
    },
    { 
      rail: 'usdc_base', 
      balance: await getUSDCBalance(), 
      lastUpdated: new Date() 
    },
    { 
      rail: 'lightning', 
      balance: await getLightningBalance(), 
      lastUpdated: new Date() 
    },
  ];
}

export async function rebalance() {
  // Auto-convert based on usage patterns
}
```

## Phase 3 Checklist

- [ ] x402 Implementation
  - [ ] lib/protocols/x402/*
  - [ ] USDC wallet setup (Base)
  - [ ] USD -> USDC swap integration (Coinbase/Circle)
  - [ ] x402 payment signing
  - [ ] Protocol registration
- [ ] L402 Implementation
  - [ ] lib/protocols/l402/*
  - [ ] Lightning node connection
  - [ ] Invoice payment
  - [ ] Protocol registration
- [ ] Treasury Management
  - [ ] treasury_balances table
  - [ ] Balance monitoring
  - [ ] Auto-rebalancing (future)
  - [ ] Admin dashboard for treasury

---

# Phase 4: Enterprise

**Duration**: Weeks 11-13  
**Goal**: Add RBAC, compliance features, and accounting integrations

## Phase 4 Quick Start

### Why This Phase?

Enterprise customers need team management and compliance. After Phase 4:
- Multiple users per organization with different permissions
- Full audit trails with decision explanations
- Export transactions to accounting software

### Prerequisites

- [ ] Phase 3 fully complete and tested
- [ ] Understand your target enterprise customers' compliance needs
- [ ] Optional: QuickBooks/Xero developer accounts for integrations

### Files You Will CREATE

```
lib/auth/
└── permissions.ts            # Permission checking middleware

lib/export/
├── transactions.ts           # CSV/JSON/QIF export
└── reports.ts                # PDF report generation

app/api/internal/team/
├── route.ts                  # GET (list members), POST (invite)
├── [id]/route.ts             # PUT (update role), DELETE (remove)
└── invites/
    └── [token]/route.ts      # Accept invite

app/api/internal/roles/
├── route.ts                  # GET, POST
└── [id]/route.ts             # PUT, DELETE

app/api/internal/export/
├── transactions/route.ts     # GET (CSV/JSON export)
└── report/route.ts           # GET (PDF report)

app/(dashboard)/dashboard/
├── team/page.tsx             # Team management UI
└── audit/page.tsx            # Audit log viewer
```

### Database Changes

```sql
-- New tables needed
CREATE TABLE roles (...)
CREATE TABLE team_invites (...)

-- Update existing
ALTER TABLE users ADD COLUMN role_id TEXT;
ALTER TABLE audit_logs ADD COLUMN decision_explanation TEXT;
```

### Implementation Order

```
Step 1: RBAC Foundation (4.1)
├── Add roles table
├── Create default roles (Owner, Admin, Finance, Developer, Viewer)
├── Create permission middleware
├── Update all API routes to check permissions
└── Test permission enforcement

Step 2: Team Management
├── Add team_invites table
├── Create invite/accept flow
├── Create team management UI
└── Test invite flow end-to-end

Step 3: Audit Enhancement (4.2)
├── Add decision_explanation to audit logs
├── Update spending checker to generate explanations
├── Create audit viewer UI
└── Test explanation generation

Step 4: Export Features (4.3)
├── Create CSV export
├── Create JSON export
├── Create PDF report (optional)
└── Test exports
```

### How to Test

```bash
# Test role creation
curl -X POST http://localhost:3000/api/internal/roles \
  -H "Cookie: next-auth.session-token=OWNER_SESSION" \
  -H "Content-Type: application/json" \
  -d '{"name": "Custom Role", "permissions": ["agents:view_all", "transactions:view_all"]}'

# Test team invite
curl -X POST http://localhost:3000/api/internal/team \
  -H "Cookie: next-auth.session-token=OWNER_SESSION" \
  -H "Content-Type: application/json" \
  -d '{"email": "newuser@example.com", "roleId": "role_viewer"}'

# Test permission enforcement (should fail as Viewer)
curl -X DELETE http://localhost:3000/api/internal/agents/agent_123 \
  -H "Cookie: next-auth.session-token=VIEWER_SESSION"
# Expected: 403 Forbidden

# Test export
curl "http://localhost:3000/api/internal/export/transactions?format=csv&startDate=2025-01-01&endDate=2025-12-31" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -o transactions.csv
```

---

## 4.1 Role-Based Access Control (RBAC)

### New Table

```sql
CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  permissions TEXT NOT NULL, -- JSON array
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update users table
ALTER TABLE users ADD COLUMN role_id TEXT REFERENCES roles(id);
```

### Default Roles

| Role | Permissions |
|------|-------------|
| Owner | All permissions |
| Admin | All except billing, delete_org |
| Finance | view_all, approve_up_to_limit |
| Developer | manage_own_agents |
| Viewer | read_only |

### Permission Definitions

```typescript
const PERMISSIONS = {
  // Org management
  'org:delete': 'Delete organization',
  'org:settings': 'Modify organization settings',
  'org:billing': 'Manage billing and payment methods',
  
  // Agent management
  'agents:create': 'Create agents',
  'agents:edit_all': 'Edit any agent',
  'agents:edit_own': 'Edit own agents only',
  'agents:delete': 'Delete agents',
  'agents:view_all': 'View all agents',
  
  // Approvals
  'approvals:view': 'View pending approvals',
  'approvals:approve_any': 'Approve any amount',
  'approvals:approve_limited': 'Approve up to threshold',
  
  // Transactions
  'transactions:view_all': 'View all transactions',
  'transactions:view_own': 'View own agents\' transactions',
  'transactions:export': 'Export transactions',
  
  // Team management
  'team:invite': 'Invite team members',
  'team:remove': 'Remove team members',
  'team:edit_roles': 'Modify user roles',
};
```

### Permission Middleware: `lib/auth/permissions.ts`

```typescript
export function requirePermission(permission: string) {
  return async (userId: string, orgId: string) => {
    const user = await getUserWithRole(userId);
    if (!user || user.organizationId !== orgId) return false;
    
    const role = await getRole(user.roleId);
    const permissions = JSON.parse(role.permissions);
    
    return permissions.includes(permission) || permissions.includes('*');
  };
}
```

## 4.2 Audit Log Enhancement

### Schema Updates

```sql
ALTER TABLE audit_logs ADD COLUMN decision_explanation TEXT;
ALTER TABLE audit_logs ADD COLUMN policy_snapshot TEXT;
```

### Decision Explainability

```typescript
interface DecisionExplanation {
  decision: 'approved' | 'rejected' | 'pending_approval';
  checks: Array<{
    name: string;
    passed: boolean;
    details: string;
  }>;
  appliedPolicies: Array<{
    type: string;
    value: unknown;
    result: string;
  }>;
}

export function generateExplanation(
  checkResult: SpendingCheckResult,
  request: SpendingCheckRequest
): DecisionExplanation {
  return {
    decision: checkResult.allowed 
      ? (checkResult.requiresApproval ? 'pending_approval' : 'approved')
      : 'rejected',
    checks: [
      {
        name: 'Per-transaction limit',
        passed: !checkResult.rejectionCode?.includes('TRANSACTION_LIMIT'),
        details: `Amount $${request.amount} vs limit`,
      },
      // ... all checks
    ],
    appliedPolicies: [
      { type: 'agent_monthly_limit', value: 500, result: 'within limit' },
    ],
  };
}
```

## 4.3 Accounting Export

### Export API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/internal/export/transactions` | CSV/JSON export |
| GET | `/api/internal/export/report` | Monthly PDF report |
| POST | `/api/internal/integrations/quickbooks/connect` | QuickBooks OAuth |
| POST | `/api/internal/integrations/xero/connect` | Xero OAuth |

### Export Service: `lib/export/transactions.ts`

```typescript
export async function exportTransactions(
  orgId: string,
  options: {
    format: 'csv' | 'json' | 'qif';
    startDate: Date;
    endDate: Date;
    includeReceipts?: boolean;
  }
) {
  const transactions = await getTransactions(orgId, options.startDate, options.endDate);
  
  switch (options.format) {
    case 'csv':
      return generateCSV(transactions);
    case 'json':
      return JSON.stringify(transactions, null, 2);
    case 'qif':
      return generateQIF(transactions);
  }
}
```

## Phase 4 Checklist

- [ ] RBAC
  - [ ] roles table
  - [ ] Default roles creation
  - [ ] Update users table
  - [ ] Permission middleware
  - [ ] Team management UI
  - [ ] Invite flow
- [ ] Audit Enhancement
  - [ ] Decision explanations
  - [ ] Policy snapshots
  - [ ] Export for auditors
- [ ] Accounting
  - [ ] CSV export
  - [ ] PDF reports
  - [ ] QuickBooks integration (optional)
  - [ ] Category mapping

---

# Phase 5: Polish & Scale

**Duration**: Weeks 14-15  
**Goal**: Anomaly detection, performance optimization, documentation

## Phase 5 Quick Start

### Why This Phase?

Before launch, we need security hardening and scalability. After Phase 5:
- Unusual agent behavior is automatically detected and flagged
- API responses are fast with proper caching
- Rate limiting prevents abuse
- Documentation is complete for users and developers

### Prerequisites

- [ ] Phase 4 fully complete and tested
- [ ] Redis instance (Upstash recommended for serverless)
- [ ] Performance baseline measurements from Phase 0-4

### Files You Will CREATE

```
lib/anomaly/
├── detector.ts               # Anomaly detection rules
├── rules/
│   ├── velocity.ts           # Transaction velocity checks
│   ├── amount.ts             # Unusual amount detection
│   ├── time.ts               # Off-hours detection
│   └── merchant.ts           # New merchant detection
└── actions.ts                # Auto-pause, alerts

lib/cache/
└── redis.ts                  # Redis client setup

lib/rate-limit/
└── index.ts                  # Rate limiting middleware

app/api/internal/anomalies/
├── route.ts                  # GET (list alerts)
└── [id]/
    └── route.ts              # PUT (acknowledge/resolve)

app/(dashboard)/dashboard/
└── anomalies/page.tsx        # Anomaly alerts UI
```

### Environment Variables to Add

```env
# Redis (Upstash)
UPSTASH_REDIS_URL=https://xxx.upstash.io
UPSTASH_REDIS_TOKEN=AXxx...
```

### Implementation Order

```
Step 1: Redis Setup (5.2)
├── Create lib/cache/redis.ts
├── Create lib/rate-limit/index.ts
├── Add rate limiting to API routes
└── Test rate limiting

Step 2: Anomaly Detection (5.1)
├── Add anomaly_alerts table
├── Create detection rules
├── Integrate into purchase flow
├── Create anomaly alerts UI
└── Test detection

Step 3: Caching (5.2)
├── Cache volume tier lookups (1 hour TTL)
├── Cache agent details (5 min TTL)
├── Measure performance improvement
└── Test cache invalidation

Step 4: Documentation (5.3)
├── Update docs/API.md with all new endpoints
├── Create docs/PROTOCOLS.md
├── Create docs/BILLING.md
├── Create docs/ENTERPRISE.md
├── Update CHANGELOG.md
└── Review all existing docs
```

### How to Test

```bash
# Test rate limiting
for i in {1..150}; do
  curl -s http://localhost:3000/api/v1/purchase_intent \
    -H "Authorization: Bearer rk_test" \
    -H "Content-Type: application/json" \
    -d '{"amount": 1, "currency": "usd"}' &
done
# After 100 requests, should see 429 Too Many Requests

# Test anomaly detection (rapid-fire purchases)
# Make 15 purchases in 5 minutes, should trigger velocity alert
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/v1/purchase_intent \
    -H "Authorization: Bearer rk_YOUR_AGENT_KEY" \
    -H "Content-Type: application/json" \
    -d '{"amount": 10, "currency": "usd", "merchant": {"name": "Test"}}'
  sleep 20
done

# Check for anomaly alerts
curl http://localhost:3000/api/internal/anomalies \
  -H "Cookie: next-auth.session-token=YOUR_SESSION"

# Test cache hit (second request should be faster)
time curl http://localhost:3000/api/internal/agents -H "Cookie: ..."
time curl http://localhost:3000/api/internal/agents -H "Cookie: ..."
```

### Documentation Checklist

After Phase 5, all these docs should be updated:

- [ ] `README.md` - Updated with v2.0 features
- [ ] `docs/API.md` - All endpoints including ACP, AP2, new internal APIs
- [ ] `docs/PROTOCOLS.md` - NEW: MCP, ACP, AP2, x402, L402 details
- [ ] `docs/BILLING.md` - NEW: Fee tiers, rail multipliers, billing flow
- [ ] `docs/ENTERPRISE.md` - NEW: RBAC, compliance, integrations
- [ ] `docs/ARCHITECTURE.md` - Updated with new components
- [ ] `docs/SPENDING_CONTROLS.md` - Updated if needed
- [ ] `CHANGELOG.md` - v2.0.0 release notes

---

## 5.1 Anomaly Detection

### New Table

```sql
CREATE TABLE anomaly_alerts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  agent_id TEXT REFERENCES agents(id),
  type TEXT NOT NULL, -- 'velocity', 'amount', 'time', 'merchant', 'pattern'
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  details TEXT NOT NULL, -- JSON
  status TEXT DEFAULT 'open', -- 'open', 'acknowledged', 'resolved', 'false_positive'
  resolved_by TEXT REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Detection Rules: `lib/anomaly/detector.ts`

```typescript
interface AnomalyRule {
  name: string;
  type: string;
  check: (agent: Agent, transaction: Transaction, history: Transaction[]) => AnomalyResult | null;
}

const rules: AnomalyRule[] = [
  {
    name: 'High velocity',
    type: 'velocity',
    check: (agent, tx, history) => {
      const last5Min = history.filter(t => 
        Date.now() - t.createdAt.getTime() < 5 * 60 * 1000
      );
      if (last5Min.length > 10) {
        return {
          severity: 'high',
          message: `${last5Min.length} transactions in 5 minutes`,
        };
      }
      return null;
    },
  },
  {
    name: 'Unusual amount',
    type: 'amount',
    check: (agent, tx, history) => {
      const avgAmount = history.reduce((sum, t) => sum + t.amount, 0) / history.length;
      if (tx.amount > avgAmount * 5) {
        return {
          severity: 'medium',
          message: `Amount $${tx.amount} is 5x higher than average`,
        };
      }
      return null;
    },
  },
  {
    name: 'Off-hours activity',
    type: 'time',
    check: (agent, tx, history) => {
      const hour = new Date().getHours();
      if (hour >= 0 && hour < 6) {
        return {
          severity: 'low',
          message: 'Transaction at unusual hour',
        };
      }
      return null;
    },
  },
];

export async function checkForAnomalies(
  agentId: string,
  transaction: Transaction
): Promise<AnomalyResult[]> {
  const agent = await getAgent(agentId);
  const history = await getAgentTransactions(agentId, { limit: 100 });
  
  const anomalies: AnomalyResult[] = [];
  
  for (const rule of rules) {
    const result = rule.check(agent, transaction, history);
    if (result) {
      anomalies.push({
        ...result,
        type: rule.type,
        ruleName: rule.name,
      });
    }
  }
  
  return anomalies;
}
```

## 5.2 Performance & Caching

### Redis Setup

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

export const rateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
});

// Usage in API routes
const { success, limit, remaining } = await rateLimiter.limit(agentId);
if (!success) {
  return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
}
```

### Caching Strategy

| Data | Cache Duration | Storage |
|------|----------------|---------|
| Volume tiers | 1 hour | Redis |
| Agent details | 5 minutes | Redis |
| Protocol responses | No cache | - |
| Session data | Session lifetime | Redis |

## 5.3 Documentation Updates

### Files to Update/Create

| File | Content |
|------|---------|
| `docs/PROTOCOLS.md` | All supported protocols |
| `docs/API.md` | Updated with new endpoints |
| `docs/BILLING.md` | Fee structure and tiers |
| `docs/ENTERPRISE.md` | RBAC, compliance, integrations |
| `CHANGELOG.md` | v2.0.0 release notes |

## Phase 5 Checklist

- [ ] Anomaly Detection
  - [ ] anomaly_alerts table
  - [ ] Detection rules
  - [ ] Integration with purchase flow
  - [ ] Dashboard alerts
  - [ ] Auto-pause on critical
- [ ] Performance
  - [ ] Redis setup
  - [ ] Rate limiting
  - [ ] Response caching
  - [ ] Database query optimization
- [ ] Documentation
  - [ ] Update all docs
  - [ ] API reference
  - [ ] Integration guides
  - [ ] Changelog

---

# Dependencies & Prerequisites

## Before Starting

1. **Stripe Issuing** approved for Roony's master account
2. **USDC wallet** set up on Base network (for x402)
3. **Lightning node** or custodial account (for L402)
4. **Redis instance** (Upstash or self-hosted)

## Third-Party Services

| Service | Purpose | Required Phase |
|---------|---------|----------------|
| Stripe (Issuing + Payment Methods) | Card payments | Phase 0 |
| Resend or SendGrid | Email notifications | Phase 2 |
| Coinbase/Circle API | USD -> USDC swaps | Phase 3 |
| Strike or Voltage | Lightning payments | Phase 3 |
| Upstash | Redis caching | Phase 5 |

## Environment Variables

```env
# Existing
DATABASE_URL=...
STRIPE_SECRET_KEY=...
STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXTAUTH_URL=...
NEXTAUTH_SECRET=...
NEXT_PUBLIC_APP_URL=...

# New - Phase 0
ROONY_STRIPE_ACCOUNT_ID=acct_roony_master
ROONY_CARDHOLDER_ID=ich_roony_cardholder
ROONY_ISSUING_FUNDING_SOURCE=...

# New - Phase 2
RESEND_API_KEY=...
SLACK_SIGNING_SECRET=...

# New - Phase 3
BASE_RPC_URL=https://mainnet.base.org
ROONY_WALLET_ADDRESS=0x...
ROONY_WALLET_PRIVATE_KEY=...
COINBASE_API_KEY=...
COINBASE_API_SECRET=...
LIGHTNING_NODE_URL=...
LIGHTNING_MACAROON=...

# New - Phase 5
UPSTASH_REDIS_URL=...
UPSTASH_REDIS_TOKEN=...
```

---

# Timeline Summary

```
Week 1-2:   Phase 0 - Foundation (Saved cards, fee model)
Week 3-5:   Phase 1 - Core Protocols (ACP, AP2)
Week 6-8:   Phase 2 - Critical Features (Refunds, notifications, subscriptions)
Week 9-10:  Phase 3 - Crypto Rails (x402, L402)
Week 11-13: Phase 4 - Enterprise (RBAC, compliance, accounting)
Week 14-15: Phase 5 - Polish (Anomaly detection, performance)

Total: ~15 weeks (3.5 months)
```

---

# Protocol Support Matrix

| Protocol | Developer | Roony Role | Target Phase |
|----------|-----------|------------|--------------|
| **MCP** | Anthropic | Tool Provider | Done |
| **ACP** | OpenAI/Stripe | Delegated Payment Provider | Phase 1 |
| **AP2** | Google | Payment Governance Layer | Phase 1 |
| **A2A** | Google | Discoverable Payment Agent | Phase 1 |
| **x402** | Coinbase | Payment Rail | Phase 3 |
| **L402** | Lightning Labs | Payment Rail | Phase 3 |
| **Visa IC** | Visa | Card Network Integration | Future |
| **MC AgentPay** | Mastercard | Card Network Integration | Future |

---

# References

- [ACP Documentation](https://developers.openai.com/commerce)
- [ACP GitHub](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol)
- [AP2 GitHub](https://github.com/google-agentic-commerce/AP2)
- [A2A Protocol](https://google-a2a.wiki)
- [x402 Whitepaper](https://www.x402.org/x402-whitepaper.pdf)
- [L402 Protocol](https://l402.org)
- [MCP Specification](https://modelcontextprotocol.io)

