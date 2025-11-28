# Roony Architecture

## Overview

Roony is a financial firewall for AI agents that sits between agents and payment sources. It evaluates purchase requests in real-time, enforces policies, and issues just-in-time virtual cards via Stripe Issuing.

## System Architecture

### High-Level Flow

```
AI Agent → Roony API → Policy Engine → Stripe Issuing → Virtual Card → Agent → Merchant
                ↓
         Dashboard UI (Monitoring & Configuration)
```

### Core Components

1. **API Layer** (`app/api/`)
   - Agent-facing purchase intent endpoint
   - Internal management APIs
   - Stripe webhook handlers

2. **Policy Engine** (`lib/policy-engine/`)
   - Rule evaluation
   - Budget tracking
   - Risk assessment

3. **Stripe Integration** (`lib/stripe/`)
   - Connect OAuth flow
   - Issuing API wrapper
   - Webhook processing

4. **Database Layer** (`lib/database/`)
   - SQLite with Drizzle ORM
   - Models: Users, Agents, Policies, Transactions, Cards

5. **Dashboard UI** (`app/(dashboard)/`)
   - Policy management
   - Agent management
   - Transaction monitoring
   - Analytics

## Data Flow

### Purchase Request Flow

1. Agent sends `POST /api/v1/purchase_intent` with purchase details
2. API validates request and authenticates agent
3. Policy engine evaluates request against all applicable policies
4. If approved:
   - Create virtual card via Stripe Issuing
   - Return card details to agent
   - Log transaction
5. If rejected:
   - Return structured error with reason code
   - Log blocked attempt

### Webhook Processing Flow

1. Stripe sends webhook event (authorization, capture, etc.)
2. Webhook handler validates event signature
3. Match event to original purchase intent
4. Update transaction status and budgets
5. Verify merchant/amount/MCC match expectations
6. Flag discrepancies if any

## Technology Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: SQLite (development), PostgreSQL (production)
- **ORM**: Drizzle ORM
- **Payments**: Stripe (Connect + Issuing)
- **UI**: React, shadcn/ui, Tailwind CSS
- **Authentication**: NextAuth.js

## Security Considerations

- Agent API keys stored hashed
- Stripe tokens stored encrypted
- All API requests logged for audit
- Rate limiting on agent endpoints
- Webhook signature verification
- Card details never stored (only references)

## Scalability Considerations

- Policy evaluation is stateless (can be parallelized)
- Database queries optimized with indexes
- Webhook processing is idempotent
- Caching for policy lookups
- Background jobs for reconciliation

