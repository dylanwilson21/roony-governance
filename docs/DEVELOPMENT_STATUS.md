# Development Status

**Last Updated**: November 28, 2025

## Project Overview

Roony is a financial firewall for AI agents. It sits between AI agents and payment systems, evaluating purchase requests in real-time and issuing just-in-time virtual cards via Stripe Issuing.

## Current Status: MVP Complete ✅

The MVP is fully functional and ready for testing/deployment.

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
- `GET/POST /api/internal/agents` - List/create agents
- `GET/PUT/DELETE /api/internal/agents/[id]` - Agent CRUD
- `POST /api/internal/agents/[id]/regenerate-key` - Regenerate API key
- `GET/POST /api/internal/policies` - List/create policies
- `GET/PUT/DELETE /api/internal/policies/[id]` - Policy CRUD
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
- `lib/database/schema.ts` - Drizzle ORM schema (all tables)
- `lib/database/index.ts` - Database connection
- `lib/policy-engine/evaluator.ts` - Policy evaluation logic
- `lib/policy-engine/types.ts` - TypeScript types for policies
- `lib/budget/tracker.ts` - Budget tracking and enforcement
- `lib/stripe/client.ts` - Stripe client
- `lib/stripe/connect.ts` - Stripe Connect OAuth
- `lib/stripe/issuing.ts` - Virtual card creation
- `lib/mcp/server.ts` - MCP protocol server implementation
- `lib/mcp/tools.ts` - MCP tool definitions
- `lib/mcp/handlers.ts` - MCP tool execution handlers
- `lib/mcp/types.ts` - MCP TypeScript types

### Frontend (100% Complete)

#### Pages
- `/` - Landing page
- `/login` - Login page
- `/register` - Registration page
- `/dashboard` - Dashboard home with analytics
- `/dashboard/agents` - Agent management
- `/dashboard/policies` - Policy management
- `/dashboard/transactions` - Transaction history
- `/dashboard/analytics` - Analytics dashboard
- `/dashboard/settings` - Stripe connection & API docs

#### Components
- `components/layout/DashboardLayout.tsx` - Sidebar layout
- `components/providers/SessionProvider.tsx` - Auth provider
- `components/ui/*` - shadcn/ui components (button, card, table, dialog, etc.)

### Database Schema

Tables implemented in `lib/database/schema.ts`:
- `organizations` - Top-level orgs
- `users` - User accounts
- `teams` - Agent groupings
- `projects` - Project groupings
- `stripe_connections` - Stripe OAuth tokens
- `agents` - AI agents with API keys
- `policies` - Spending rules
- `purchase_intents` - Purchase requests
- `virtual_cards` - Created cards
- `transactions` - Settled transactions
- `budget_tracking` - Spend tracking
- `blocked_attempts` - Rejection logs
- `audit_logs` - Audit trail

## File Structure

```
roony-governance/
├── app/
│   ├── (auth)/              # Auth pages (login, register)
│   ├── (dashboard)/         # Dashboard pages
│   ├── api/
│   │   ├── auth/            # NextAuth endpoints
│   │   ├── internal/        # Dashboard APIs
│   │   ├── mcp/             # MCP Protocol endpoint
│   │   ├── stripe/          # Stripe Connect
│   │   ├── v1/              # REST Agent API
│   │   └── webhooks/        # Stripe webhooks
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── layout/
│   ├── providers/
│   └── ui/                  # shadcn components
├── docs/                    # Documentation
├── drizzle/                 # Database migrations
├── lib/
│   ├── auth/
│   ├── budget/
│   ├── database/
│   ├── mcp/                 # MCP Protocol implementation
│   ├── policy-engine/
│   ├── stripe/
│   └── utils.ts
├── types/
│   └── next-auth.d.ts
├── middleware.ts            # Route protection
├── drizzle.config.ts
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

## Environment Variables Required

```env
# Database
DATABASE_URL=file:./roony.db

# Stripe (get from dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...
NEXT_PUBLIC_STRIPE_CONNECT_CLIENT_ID=ca_...

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

# Open http://localhost:3000
```

## How to Test the Flow

1. Register at `/register`
2. Go to `/dashboard/agents` and create an agent (save the API key!)
3. Go to `/dashboard/policies` and create a policy
4. Test via REST API:

```bash
curl -X POST http://localhost:3000/api/v1/purchase_intent \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "YOUR_AGENT_ID",
    "amount": 50.00,
    "currency": "usd",
    "description": "Test purchase",
    "merchant": {"name": "Test Merchant"}
  }'
```

5. Or test via MCP Protocol:

```bash
# List available tools
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Request a purchase via MCP
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":2,
    "method":"tools/call",
    "params":{
      "name":"request_purchase",
      "arguments":{
        "amount":50.00,
        "currency":"usd",
        "description":"Test purchase",
        "merchant_name":"Test Merchant"
      }
    }
  }'
```

## What Could Be Added (Post-MVP)

1. **Charts** - Install recharts for analytics visualizations
2. **Email notifications** - Alert on blocked transactions
3. **Team/Project management** - UI for team-based policies
4. **MCC filtering** - Merchant category code support
5. **Approval workflow** - Human approval for flagged transactions
6. **Dark mode** - Theme toggle
7. **Export functionality** - CSV export of transactions
8. **Rate limiting** - API rate limits

## Known Limitations

1. Stripe Issuing requires a business account and approval
2. Virtual card creation is currently mocked without real Stripe connection
3. No email verification on registration
4. No password reset flow
5. Single organization per user (no multi-org support)

## Tech Stack

- **Framework**: Next.js 14.2.15 (App Router)
- **Language**: TypeScript 5.6.3
- **Database**: SQLite with Drizzle ORM
- **Auth**: NextAuth.js 4.24.10
- **Payments**: Stripe 17.2.0
- **UI**: React 18, shadcn/ui, Tailwind CSS 3.4.14
- **Icons**: Lucide React

