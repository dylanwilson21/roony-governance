# Development Status

**Last Updated**: November 30, 2025

## Project Overview

Roony is a financial firewall for AI agents. It sits between AI agents and payment systems, evaluating purchase requests in real-time and issuing just-in-time virtual cards via Stripe Issuing.

## Current Status: MVP Complete + Simplified Governance ✅

The MVP is fully functional with a recently simplified governance model.

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

**Stripe APIs**:
- `GET /api/stripe/connect` - Initiate OAuth
- `GET /api/stripe/connect/callback` - OAuth callback
- `GET/DELETE /api/stripe/connect/status` - Connection status
- `POST /api/webhooks/stripe` - Webhook handler

**Auth APIs**:
- `POST /api/auth/register` - User registration
- NextAuth endpoints at `/api/auth/*`

#### Core Libraries

- `lib/auth/config.ts` - NextAuth configuration
- `lib/database/schema.ts` - Drizzle ORM schema
- `lib/database/index.ts` - Database connection
- `lib/spending/checker.ts` - **NEW** Simplified spending checks
- `lib/budget/tracker.ts` - Budget tracking
- `lib/stripe/client.ts` - Stripe client
- `lib/stripe/connect.ts` - Stripe Connect OAuth
- `lib/stripe/issuing.ts` - Virtual card creation
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
- `organizations` - Orgs with `monthlyBudget`, `alertThreshold`, `guardrails`
- `users` - User accounts
- `teams` - Agent groupings (for reporting)
- `projects` - Project groupings
- `stripe_connections` - Stripe OAuth tokens
- `agents` - AI agents with spending controls built-in
- `known_merchants` - **NEW** Tracks merchants for new vendor detection
- `pending_approvals` - **NEW** Human review queue
- `purchase_intents` - Purchase requests
- `virtual_cards` - Created cards
- `transactions` - Settled transactions
- `budget_tracking` - Spend tracking
- `blocked_attempts` - Rejection logs
- `audit_logs` - Audit trail
- `policies` - **DEPRECATED** Old policy system (kept for data)

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
STRIPE_CONNECT_CLIENT_ID=ca_...

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

## How to Test

### 1. Setup
1. Register at `/register`
2. Go to `/dashboard/settings` → "Spending Guardrails"
3. Set organization monthly budget (e.g., $10,000)
4. Set any guardrails (e.g., max transaction $1000, approval above $500)

### 2. Create Agent
1. Go to `/dashboard/agents`
2. Click "Create Agent"
3. Set spending limits (e.g., $500/month, $100/day, $50/transaction)
4. Set approval threshold (e.g., $25)
5. Enable "Flag new vendor purchases"
6. Save and copy the API key!

### 3. Test Purchase

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

# Response will be:
# - "approved" with card details, OR
# - "pending_approval" if triggers review, OR
# - "rejected" with reason
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

## What Could Be Added (Post-MVP)

1. **Charts** - Install recharts for analytics visualizations
2. **Email notifications** - Alert on purchases needing approval
3. **Slack integration** - Approval notifications in Slack
4. **MCC filtering** - Merchant category code support
5. **Dark mode** - Theme toggle
6. **Export functionality** - CSV export of transactions
7. **Rate limiting** - API rate limits
8. **Multi-org support** - Users in multiple organizations

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
