# Roony Governance

## Overview

Roony is a financial firewall for AI agents. It sits between your agents and your money, and it decides—in real time—whether an agent is allowed to pay for something, and if yes, it gives them a tightly controlled, just-in-time virtual card.

## Key Features

- **Real-time Policy Evaluation**: Evaluate purchase requests against configurable policies
- **Just-in-Time Virtual Cards**: Issue single-use, constrained virtual cards via Stripe Issuing
- **Secure Payment Infrastructure**: Stripe Connect OAuth flow (no raw API keys)
- **Comprehensive Policy Engine**: Budget limits, merchant controls, MCC filtering, time-based rules, risk triggers
- **Full Audit Trail**: Track all transactions, approvals, and rejections
- **Professional Dashboard**: Blue/white financial professional UI with shadcn/ui

## Current Status

**MVP Complete** ✅ - The application is fully functional and ready for testing.

See **[Development Status](docs/DEVELOPMENT_STATUS.md)** for detailed information on what's built, file structure, and how to test.

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[Development Status](docs/DEVELOPMENT_STATUS.md)** - Current state, what's built, how to test
- **[Architecture](docs/ARCHITECTURE.md)** - System architecture, data flow, component relationships
- **[API Documentation](docs/API.md)** - API specifications for agent endpoints and internal APIs
- **[Policy Engine](docs/POLICY_ENGINE.md)** - Policy engine design, rule DSL, evaluation logic
- **[Stripe Integration](docs/STRIPE_INTEGRATION.md)** - Stripe Connect setup, Issuing API usage, webhook handling
- **[Database Schema](docs/DATABASE_SCHEMA.md)** - Database models, relationships, migrations
- **[UI Components](docs/UI_COMPONENTS.md)** - Component library structure, design system
- **[Deployment](docs/DEPLOYMENT.md)** - Deployment process, environment variables, infrastructure
- **[Contributing](docs/CONTRIBUTING.md)** - Development workflow, coding standards, testing approach

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
│   └── dashboard/           # Dashboard components
├── lib/                     # Core logic
│   ├── stripe/              # Stripe integration
│   ├── policy-engine/       # Policy evaluation
│   └── database/            # Database utilities
├── types/                   # TypeScript types
└── public/                  # Static assets
```

## Technology Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: SQLite (development), PostgreSQL (production)
- **ORM**: Drizzle ORM
- **Payments**: Stripe (Connect + Issuing)
- **UI**: React, shadcn/ui, Tailwind CSS
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
npm run db:migrate   # Run database migrations
npm run db:studio    # Open database studio
```

## How It Works

1. **Connect Stripe**: Customer connects their Stripe account via OAuth (no raw API keys)
2. **Define Policies**: Configure spending rules, budgets, merchant allowlists/blocklists
3. **Agent Requests Purchase**: Agent calls `/api/v1/purchase_intent` with purchase details
4. **Policy Evaluation**: Roony evaluates request against all applicable policies
5. **Card Creation**: If approved, create just-in-time virtual card via Stripe Issuing
6. **Transaction Monitoring**: Track authorizations and settlements via webhooks
7. **Dashboard**: Monitor spend, review transactions, manage policies and agents

## License

ISC

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes.
