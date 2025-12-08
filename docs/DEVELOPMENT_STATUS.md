# Development Status

**Last Updated**: December 8, 2025

## Project Overview

Roony is a financial firewall for AI agents. It sits between AI agents and payment systems, evaluating purchase requests in real-time against spending limits and guardrails.

## Current Status: Alpha Ready ✅

The alpha version is ready for early testers. Users can add a card, set spending limits, and their AI agents will receive the card details when purchases are approved.

### What's New in Alpha

- **Alpha Card Storage** - Users can paste card details directly (stored in org settings)
- **Real Card on Approval** - MCP endpoint returns actual card details when purchases pass governance
- **Quick Start Guide** - `docs/QUICK_START.md` with Claude Desktop setup instructions
- **Simplified Flow** - No Stripe Issuing required, works with any card (virtual recommended)

### Alpha Warning

This is an early alpha. Card details are stored and returned to agents on approval. Users should use a virtual card service (Privacy.com, etc.) with its own spending limits as a second layer of protection.

## Governance Model

Roony uses a **2-level hierarchy**: Organization → Agents

### Organization Level
- **Monthly budget** - Total spending cap for all agents combined
- **Guardrails** - Rules that apply to ALL agents:
  - Maximum transaction amount (hard cap)
  - Require approval above threshold
  - Flag all new vendor purchases
  - Blocked categories/merchants

### Agent Level
Each agent has direct spending controls:
- **Monthly limit** - Max spend per month
- **Daily limit** - Max spend per day
- **Per-transaction limit** - Max single purchase
- **Approval threshold** - Require human approval above amount
- **Flag new vendors** - Require approval for first-time merchants
- **Blocked/Allowed merchants** - Merchant restrictions

### Approval Queue
Purchases that require human review go to the **Approvals** page where admins can approve or reject them.

## What's Built

### Backend (100% Complete)

#### Authentication
- NextAuth.js with credentials provider
- User registration with organization creation
- JWT session management
- Route protection middleware (`middleware.ts`)

#### API Endpoints

**Agent API** (for AI agents):
- `POST /api/v1/purchase_intent` - REST API for purchase requests
- `POST /api/mcp` - MCP Protocol endpoint for AI platforms
- `GET /api/mcp` - MCP server info and capabilities

**Internal APIs** (for dashboard):
- `GET/POST /api/internal/agents` - List/create agents with spending controls
- `GET/PUT/DELETE /api/internal/agents/[id]` - Agent CRUD
- `POST /api/internal/agents/[id]/regenerate-key` - Regenerate API key
- `GET/POST /api/internal/approvals` - List pending approvals
- `PUT /api/internal/approvals/[id]` - Approve/reject purchase
- `GET/PUT /api/internal/settings/organization` - Org settings & guardrails
- `GET /api/internal/budget` - Budget utilization
- `GET /api/internal/transactions` - Transaction history
- `GET /api/internal/analytics` - Dashboard analytics

**Payment Methods APIs** (Phase 0+):
- `GET/POST /api/internal/payment-methods` - List/add payment methods
- `DELETE /api/internal/payment-methods/[id]` - Remove payment method
- `PUT /api/internal/payment-methods/[id]/default` - Set default

**Stripe APIs**:
- `POST /api/webhooks/stripe` - Webhook handler (enhanced for pre-auth capture)

**Auth APIs**:
- `POST /api/auth/register` - User registration
- NextAuth endpoints at `/api/auth/*`

#### Core Libraries

- `lib/auth/config.ts` - NextAuth configuration
- `lib/database/schema.ts` - Drizzle ORM schema (updated for Phase 0)
- `lib/database/index.ts` - Database connection
- `lib/spending/checker.ts` - Simplified spending checks
- `lib/budget/tracker.ts` - Budget tracking
- `lib/stripe/client.ts` - Stripe client
- `lib/stripe/customers.ts` - **Phase 0** Stripe Customer management
- `lib/stripe/payment-methods.ts` - **Phase 0** Payment method CRUD + pre-auth
- `lib/stripe/issuing.ts` - Virtual card creation (updated for Roony master account)
- `lib/billing/fees.ts` - **Phase 0** Fee calculation and volume tracking
- `lib/mcp/server.ts` - MCP protocol server
- `lib/mcp/tools.ts` - MCP tool definitions
- `lib/mcp/handlers.ts` - MCP tool execution

### Frontend (100% Complete)

#### Pages
- `/` - Landing page
- `/login` - Login page
- `/register` - Registration page
- `/dashboard` - Dashboard with budget utilization + pending alerts
- `/dashboard/agents` - Agent management with spending controls
- `/dashboard/approvals` - **NEW** Human approval queue
- `/dashboard/transactions` - Transaction history
- `/dashboard/analytics` - Analytics dashboard
- `/dashboard/settings` - Guardrails, Stripe connection, API docs

#### Components
- `components/layout/DashboardLayout.tsx` - Sidebar layout
- `components/providers/SessionProvider.tsx` - Auth provider
- `components/ui/*` - shadcn/ui components

### Database Schema

Tables in `lib/database/schema.ts`:
- `organizations` - Orgs with `monthlyBudget`, `alertThreshold`, `guardrails`, `stripeCustomerId`
- `users` - User accounts
- `teams` - Agent groupings (for reporting)
- `projects` - Project groupings
- `stripe_connections` - Legacy Stripe OAuth tokens (deprecated)
- `agents` - AI agents with spending controls built-in
- `known_merchants` - Tracks merchants for new vendor detection
- `pending_approvals` - Human review queue
- `purchase_intents` - Purchase requests (with `protocol`, `feeAmount`, `stripePreAuthId`)
- `virtual_cards` - Created cards (with `isRecurring`, `subscriptionId`)
- `transactions` - Settled transactions
- `budget_tracking` - Spend tracking
- `blocked_attempts` - Rejection logs
- `audit_logs` - Audit trail
- `policies` - **DEPRECATED** Old policy system
- `customer_payment_methods` - **Phase 0** Saved payment methods
- `transaction_fees` - **Phase 0** Fee records per transaction
- `monthly_volumes` - **Phase 0** Volume tracking for tier calculation
- `treasury_balances` - **Phase 0** Treasury for future crypto rails

## File Structure

```
roony-governance/
├── app/
│   ├── (auth)/              # Auth pages (login, register)
│   ├── (dashboard)/
│   │   └── dashboard/
│   │       ├── page.tsx        # Dashboard with budget card
│   │       ├── agents/         # Agent management
│   │       ├── approvals/      # NEW: Approval queue
│   │       ├── transactions/
│   │       ├── analytics/
│   │       └── settings/       # Guardrails + Stripe
│   ├── api/
│   │   ├── auth/
│   │   ├── internal/
│   │   │   ├── agents/
│   │   │   ├── approvals/     # NEW
│   │   │   ├── budget/        # NEW
│   │   │   ├── settings/      # NEW
│   │   │   └── ...
│   │   ├── mcp/
│   │   ├── stripe/
│   │   ├── v1/
│   │   └── webhooks/
│   └── ...
├── components/
├── docs/
├── lib/
│   ├── spending/            # NEW: Simplified checker
│   ├── mcp/
│   └── ...
└── ...
```

## Environment Variables Required

```env
# Database
DATABASE_URL=file:./roony.db

# Stripe (get from dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Phase 0: Roony's Issuing Account
ROONY_CARDHOLDER_ID=ich_xxx  # Create in Stripe Dashboard > Issuing > Cardholders

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## How to Run

```bash
# Install dependencies
npm install

# Initialize database
npm run db:push

# Start dev server
npm run dev

# Start Stripe webhook forwarding (in another terminal)
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Open http://localhost:3000
```

## Demo Mode (For Investor Demos)

For a quick demo with pre-populated data:

```bash
# 1. Install dependencies
npm install

# 2. Initialize fresh database
npm run db:push

# 3. Seed demo data
npm run db:seed-demo

# 4. Start the server
npm run dev

# 5. Login with demo credentials:
#    Email: demo@acme.ai
#    Password: demo123
```

The demo includes:
- **4 agents** with different spending limits and controls
- **14 transactions** (approved, rejected, pending approval)
- **10 known merchants** (GitHub, AWS, OpenAI, etc.)
- **3 pending approvals** waiting for review
- **Organization budget** set to $10,000/month

**Demo Mode Banner**: When no payment methods are configured, a banner appears explaining that spending checks work fully, but virtual card creation requires Stripe Issuing approval.

## How to Test

### 1. Setup
1. Register at `/register`
2. Go to `/dashboard/settings` → "Spending Guardrails"
3. Set organization monthly budget (e.g., $10,000)
4. Set any guardrails (e.g., max transaction $1000, approval above $500)

### 2. Add Payment Method (Phase 0+)
1. Go to `/dashboard/settings` → "Payment Methods"
2. In development, payment methods can be added via API:
```bash
# This requires a Stripe PaymentMethod ID (pm_xxx)
# In test mode, use Stripe's test payment method tokens
```

### 3. Create Agent
1. Go to `/dashboard/agents`
2. Click "Create Agent"
3. Set spending limits (e.g., $500/month, $100/day, $50/transaction)
4. Set approval threshold (e.g., $25)
5. Enable "Flag new vendor purchases"
6. Save and copy the API key!

### 4. Test Purchase

```bash
# Should be approved (under all limits)
curl -X POST http://localhost:3000/api/v1/purchase_intent \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 20.00,
    "currency": "usd",
    "description": "Test purchase",
    "merchant": {"name": "Test Merchant"}
  }'

# Response now includes fee info:
# {
#   "status": "approved",
#   "card": { ... },
#   "fee": { "amount": 0.60, "rate": "3.0%", "tier": "starter" }
# }

# Or:
# - "pending_approval" if triggers review
# - "rejected" with reason (including "NO_PAYMENT_METHOD" if no card added)
```

### 4. Review Approvals
If a purchase triggers approval:
1. Go to `/dashboard/approvals`
2. Review pending purchases
3. Approve or reject with notes

### MCP Protocol Testing

```bash
# List available tools
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Check budget
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0","id":2,
    "method":"tools/call",
    "params":{"name":"check_budget","arguments":{}}
  }'
```

## Roadmap: v2.0 Universal AI Agent Payment Platform

A comprehensive implementation plan exists in `docs/IMPLEMENTATION_ROADMAP.md` to transform Roony into a universal platform supporting multiple protocols and payment rails.

### Key Transformations Planned

| Current (v1.0) | Future (v2.0) |
|----------------|---------------|
| Stripe Connect OAuth required | Just add a credit/debit card |
| MCP protocol only | MCP + ACP (OpenAI) + AP2 (Google) + A2A |
| Stripe cards only | Stripe + x402 (USDC) + L402 (Lightning) |
| No fee revenue | Transaction-based fees (1-3%) |
| Single user per org | RBAC with roles (Owner, Admin, Finance, etc.) |

### Phases Overview

| Phase | Duration | Focus | Status |
|-------|----------|-------|--------|
| **0** | 2 weeks | Saved cards model, fee system | ✅ **Complete** |
| **1** | 3 weeks | ACP + AP2 protocol support | Pending |
| **2** | 3 weeks | Refunds, notifications, subscriptions | Pending |
| **3** | 2 weeks | Crypto rails (x402, L402) | Pending |
| **4** | 3 weeks | RBAC, compliance, accounting | Pending |
| **5** | 2 weeks | Anomaly detection, performance | Pending |

**Total: ~15 weeks** (Phase 0 complete, ~13 weeks remaining)

See `docs/IMPLEMENTATION_ROADMAP.md` for full implementation details including:
- Quick start guide for each phase
- File lists (create/modify/delete)
- Database schemas
- API endpoints
- Testing commands

## Legacy Enhancement Ideas (Superseded by Roadmap)

These items are now covered in the v2.0 roadmap:

1. ~~**Charts**~~ - Phase 5 includes analytics improvements
2. ~~**Email notifications**~~ - Phase 2: Notification system
3. ~~**Slack integration**~~ - Phase 2: Notification channels
4. ~~**MCC filtering**~~ - Phase 4: Enhanced compliance
5. **Dark mode** - Future UI enhancement
6. ~~**Export functionality**~~ - Phase 4: Accounting export
7. ~~**Rate limiting**~~ - Phase 5: Performance
8. ~~**Multi-org support**~~ - Phase 4: RBAC

## Known Limitations

1. Stripe Issuing requires a business account and approval
2. Virtual card creation requires Stripe Issuing to be enabled
3. No email verification on registration
4. No password reset flow
5. Single organization per user

## Tech Stack

- **Framework**: Next.js 16.x (App Router)
- **Language**: TypeScript 5.x
- **Database**: SQLite with Drizzle ORM
- **Auth**: NextAuth.js 4.x
- **Payments**: Stripe 17.x
- **UI**: React 18, shadcn/ui, Tailwind CSS 3.x
- **Icons**: Lucide React
