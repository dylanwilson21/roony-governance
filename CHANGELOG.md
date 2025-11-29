# Changelog

All notable changes to the Roony Governance project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup with Next.js 14+ (App Router), TypeScript, and Tailwind CSS
- Comprehensive documentation structure (ARCHITECTURE.md, API.md, POLICY_ENGINE.md, STRIPE_INTEGRATION.md, DATABASE_SCHEMA.md, UI_COMPONENTS.md, DEPLOYMENT.md, CONTRIBUTING.md)
- CHANGELOG.md for tracking changes
- Database schema with Drizzle ORM (SQLite)
  - Organizations, Users, Teams, Projects
  - Agents with API key authentication
  - Policies with rule engine support
  - Purchase Intents, Virtual Cards, Transactions
  - Budget Tracking and Blocked Attempts
  - Audit Logs
- shadcn/ui component library setup
- Blue/white financial professional theme configuration
- Project structure and folder organization
- Environment variable template (.env.example)
- Stripe integration foundation
  - Stripe client setup
  - Stripe Connect OAuth flow
  - Stripe Issuing virtual card creation
- Policy engine implementation
  - Policy evaluation logic
  - Budget checking
  - Merchant allowlist/blocklist
  - Time-based rules
- Purchase Intent API endpoint (`/api/v1/purchase_intent`)
  - Agent authentication via API keys
  - Policy evaluation
  - Virtual card creation on approval
  - Structured rejection responses
- Stripe webhook handler (`/api/webhooks/stripe`)
  - Authorization event handling
  - Charge settlement tracking
  - Card status updates
- Dashboard UI structure
  - Dashboard layout with sidebar navigation
  - Dashboard home page with overview cards
  - Agents management page
  - Policies management page
  - Transactions history page
  - Analytics page
  - Settings page with Stripe connection
- Blue/white financial professional theme
  - Primary blue color scheme (#1e40af)
  - Professional typography and spacing
  - Responsive layout
- Authentication system with NextAuth.js
  - Credentials provider for email/password login
  - User registration with organization creation
  - Session management with JWT
  - Protected dashboard routes
- Internal API endpoints
  - `/api/internal/agents` - Agent CRUD operations
  - `/api/internal/policies` - Policy management
  - `/api/internal/transactions` - Transaction history
  - `/api/internal/analytics` - Dashboard analytics
- Stripe Connect OAuth callback handler
- Interactive dashboard components
  - Agent creation with API key display
  - Policy builder with budget limits
  - Transaction search and filtering
  - Real-time analytics cards
- shadcn/ui components
  - Button, Card, Input, Label, Table
  - Badge, Dialog, Tabs, Dropdown Menu

### MVP Completion Features
- Route protection middleware for dashboard
- Complete Stripe Connect OAuth flow
  - Initiate OAuth redirect
  - Handle callback and store tokens
  - Check connection status
  - Disconnect functionality
- Full Policy CRUD operations
  - Create, Read, Update, Delete policies
  - Toggle policy enabled/disabled
  - Edit policy with merchant allowlist/blocklist
- Agent API key management
  - Create agents with API key generation
  - Regenerate API keys
  - Pause/activate agents
  - Delete agents
- Budget tracking implementation
  - Track daily, weekly, monthly, lifetime spend
  - Enforce budget limits in policy evaluation
  - Real-time spend calculation
- Enhanced dashboard
  - Quick start guide
  - Real analytics data
  - Monthly spend tracking
  - Links to relevant sections
- Loading states and error handling

