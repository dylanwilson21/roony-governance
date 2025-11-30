# Roony Governance

## Overview

Roony is a financial firewall for AI agents. It sits between your agents and your money, and it decides—in real time—whether an agent is allowed to pay for something, and if yes, it gives them a tightly controlled, just-in-time virtual card.

## Key Features

- **Simplified Governance**: 2-level hierarchy (Organization → Agents) with spending controls directly on agents
- **Real-time Spending Checks**: Evaluate purchase requests against agent limits and org guardrails
- **Just-in-Time Virtual Cards**: Issue single-use, constrained virtual cards via Stripe Issuing
- **Approval Queue**: Human review for purchases over thresholds or from new vendors
- **MCP Protocol Support**: Native Model Context Protocol integration for AI agent platforms
- **Secure Payment Infrastructure**: Stripe Connect OAuth flow (no raw API keys)
- **Budget Tracking**: Organization and agent-level budget utilization with alerts
- **Professional Dashboard**: Blue/white financial professional UI with shadcn/ui

## Governance Model

```
Organization
├── Monthly Budget: $10,000
├── Guardrails (apply to ALL agents)
│   ├── Max transaction amount
│   ├── Require approval above threshold
│   └── Flag all new vendors
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

## Current Status

**MVP Complete** ✅ - The application is fully functional and ready for testing.

See **[Development Status](docs/DEVELOPMENT_STATUS.md)** for detailed information on what's built, file structure, and how to test.

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[Development Status](docs/DEVELOPMENT_STATUS.md)** - Current state, what's built, how to test
- **[Architecture](docs/ARCHITECTURE.md)** - System architecture, data flow, component relationships
- **[API Documentation](docs/API.md)** - REST API specifications for agent endpoints
- **[MCP Integration](docs/MCP_INTEGRATION.md)** - Model Context Protocol integration guide
- **[Spending Controls](docs/SPENDING_CONTROLS.md)** - Agent controls and org guardrails
- **[Stripe Integration](docs/STRIPE_INTEGRATION.md)** - Stripe Connect setup, Issuing API usage
- **[Database Schema](docs/DATABASE_SCHEMA.md)** - Database models, relationships, migrations
- **[UI Components](docs/UI_COMPONENTS.md)** - Component library structure, design system
- **[Deployment](docs/DEPLOYMENT.md)** - Deployment process, environment variables
- **[Contributing](docs/CONTRIBUTING.md)** - Development workflow, coding standards

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Stripe account with Issuing enabled (for production)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/dylanwilson21/roony-governance.git
cd roony-governance
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your values
```

4. Set up the database:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
roony-governance/
├── docs/                    # Comprehensive documentation
├── app/                     # Next.js App Router
│   ├── api/                 # API routes
│   └── (dashboard)/         # Dashboard pages
├── components/              # React components
│   ├── ui/                  # shadcn components
│   └── layout/              # Layout components
├── lib/                     # Core logic
│   ├── spending/            # Spending checker
│   ├── stripe/              # Stripe integration
│   └── database/            # Database utilities
├── types/                   # TypeScript types
└── public/                  # Static assets
```

## Technology Stack

- **Framework**: Next.js 16+ (App Router)
- **Language**: TypeScript
- **Database**: SQLite (development), PostgreSQL (production)
- **ORM**: Drizzle ORM
- **Payments**: Stripe (Connect + Issuing)
- **UI**: React 18, shadcn/ui, Tailwind CSS
- **Authentication**: NextAuth.js

## Development

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for detailed development guidelines.

### Common Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Check TypeScript
npm run db:push      # Push schema to database
npm run db:studio    # Open database studio
```

## How It Works

1. **Connect Stripe**: Customer connects their Stripe account via OAuth
2. **Set Organization Budget**: Configure monthly budget and guardrails
3. **Create Agents**: Define agents with spending limits and controls
4. **Agent Requests Purchase**: Agent calls API with purchase details
5. **Spending Check**: Roony checks agent limits → org guardrails → approval rules
6. **Card Creation**: If approved, create just-in-time virtual card
7. **Approval Queue**: Flagged purchases go to human review
8. **Dashboard**: Monitor spend, review approvals, manage agents

## Integration Options

### REST API
```bash
POST /api/v1/purchase_intent
Authorization: Bearer rk_your_api_key
```

### MCP Protocol
```bash
POST /api/mcp
Authorization: Bearer rk_your_api_key
```

See [MCP Integration Guide](docs/MCP_INTEGRATION.md) for connecting to workflow builders and AI platforms.

## License

ISC

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes.
