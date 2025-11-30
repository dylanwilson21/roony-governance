# Roony Architecture

## Overview

Roony is a financial firewall for AI agents that sits between agents and payment sources. It evaluates purchase requests in real-time, enforces spending controls, and issues just-in-time virtual cards via Stripe Issuing.

## Governance Model

Roony uses a simplified **2-level hierarchy**:

```
Organization
├── Monthly Budget: $10,000
├── Guardrails (apply to ALL agents)
│   ├── Max transaction: $1,000
│   ├── Require approval above: $500
│   └── Flag all new vendors: true
│
├── Agent "Research Bot"
│   ├── Monthly limit: $500
│   ├── Approval threshold: $100
│   └── Flag new vendors: true
│
└── Agent "Code Assistant"
    ├── Monthly limit: $300
    └── Per-transaction max: $50
```

### Key Concepts

1. **Organization Guardrails** - Rules that apply to ALL agents
2. **Agent Controls** - Spending limits directly on each agent
3. **Approval Queue** - Purchases flagged for human review
4. **Known Merchants** - Track vendors for new merchant detection

## System Architecture

### High-Level Flow

```
AI Agent → Roony API → Spending Checker → [Approved?]
                              ↓                ↓
                         [Requires      [Card Creation]
                          Approval?]         ↓
                              ↓          Virtual Card
                      Approval Queue         ↓
                              ↓           Agent
                      Human Review           ↓
                                         Merchant
```

### Core Components

1. **API Layer** (`app/api/`)
   - `v1/purchase_intent` - Agent-facing REST API
   - `mcp/` - MCP Protocol for AI platforms
   - `internal/` - Dashboard management APIs
   - `webhooks/stripe` - Stripe webhook handler

2. **Spending Checker** (`lib/spending/checker.ts`)
   - Agent-level limit checks (per-transaction, daily, monthly)
   - Organization budget check
   - Merchant restrictions (blocked/allowed)
   - New vendor detection
   - Approval threshold checks

3. **Stripe Integration** (`lib/stripe/`)
   - Connect OAuth flow for delegated access
   - Issuing API for virtual card creation
   - Webhook processing for transaction settlement

4. **Database Layer** (`lib/database/`)
   - SQLite with Drizzle ORM
   - Agents with embedded spending controls
   - Organizations with guardrails JSON
   - Pending approvals queue
   - Known merchants tracking

5. **Dashboard UI** (`app/(dashboard)/`)
   - Agent management with spending controls
   - Organization guardrails settings
   - Approval queue for human review
   - Transaction monitoring
   - Budget utilization display

## Data Flow

### Purchase Request Flow

```
1. Agent sends POST /api/v1/purchase_intent
   └─ { amount, currency, description, merchant }

2. Authenticate agent via API key hash

3. Spending checker evaluates:
   a. Agent per-transaction limit
   b. Org max transaction amount
   c. Agent daily limit
   d. Agent monthly limit
   e. Org monthly budget
   f. Blocked/allowed merchants
   g. Org blocked categories
   h. Approval threshold check
   i. New vendor check

4. Result:
   ├─ REJECTED → Return error with reason code
   ├─ REQUIRES APPROVAL → Queue for human review
   └─ APPROVED → Create virtual card
                  └─ Return card details to agent
```

### Approval Flow

```
1. Purchase triggers approval (threshold/new vendor)
2. Create pending_approval record
3. Update purchase_intent status to "pending_approval"
4. Admin reviews in /dashboard/approvals
5. On approve:
   ├─ Create virtual card
   └─ Return card to agent (via polling or webhook)
6. On reject:
   └─ Update purchase_intent to "rejected"
```

### Webhook Processing Flow

```
1. Stripe sends authorization/capture event
2. Validate webhook signature
3. Match to original purchase intent
4. Update transaction status
5. Update budget tracking
6. Record merchant as known (for new vendor detection)
```

## Database Schema (Key Tables)

### organizations
- `monthlyBudget` - Total org spending limit
- `alertThreshold` - Warning percentage (e.g., 0.8 = 80%)
- `guardrails` - JSON with org-wide rules

### agents
- `monthlyLimit`, `dailyLimit`, `perTransactionLimit`
- `approvalThreshold` - Require approval above this amount
- `flagNewVendors` - Require approval for new merchants
- `blockedMerchants`, `allowedMerchants` - JSON arrays

### pending_approvals
- Links to `purchase_intent`
- `reason` - "OVER_THRESHOLD", "NEW_VENDOR", etc.
- `status` - "pending", "approved", "rejected"
- `reviewedBy`, `reviewedAt`, `reviewNotes`

### known_merchants
- `organizationId`, `merchantName`, `merchantNameNormalized`
- `firstSeenAt`, `lastSeenAt`, `transactionCount`

## Technology Stack

- **Framework**: Next.js 16+ (App Router)
- **Language**: TypeScript
- **Database**: SQLite (dev), PostgreSQL (production)
- **ORM**: Drizzle ORM
- **Payments**: Stripe (Connect + Issuing)
- **UI**: React 18, shadcn/ui, Tailwind CSS
- **Authentication**: NextAuth.js
- **AI Integration**: MCP Protocol

## Security Considerations

- Agent API keys stored as SHA-256 hashes
- Stripe tokens stored encrypted
- All API requests logged for audit
- Rate limiting on agent endpoints
- Webhook signature verification
- Card details never stored (only references)
- Session-based dashboard authentication

## MCP Protocol Integration

Roony exposes tools via Model Context Protocol:

- `request_purchase` - Request a purchase
- `check_budget` - Get remaining budget
- `list_transactions` - View transaction history
- `get_policy_info` - Get spending rules

This allows AI platforms (ChatGPT, Claude, etc.) to interact with Roony natively.
