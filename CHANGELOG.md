# Changelog

All notable changes to the Roony Governance project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Phase 0: Foundation (December 4, 2025)

Replaced Stripe Connect OAuth model with saved payment methods + transaction-based fees.

#### Added
- **Customer Payment Methods**
  - `customer_payment_methods` table for saved cards
  - `lib/stripe/customers.ts` - Stripe Customer management
  - `lib/stripe/payment-methods.ts` - Payment method CRUD and pre-auth
  - API endpoints: `GET/POST /api/internal/payment-methods`
  - API endpoints: `DELETE /api/internal/payment-methods/[id]`
  - API endpoints: `PUT /api/internal/payment-methods/[id]/default`

- **Transaction-Based Fee System**
  - `transaction_fees` table for fee tracking
  - `monthly_volumes` table for tier calculation
  - `lib/billing/fees.ts` - Fee calculation and volume tracking
  - Volume tiers: Starter (3%), Growth (2.5%), Business (2%), Enterprise (1.5%)
  - Rail multipliers for future protocols (ACP, AP2, x402, L402)

- **New Purchase Flow**
  - Pre-authorize customer's card before creating virtual card
  - Cards issued from Roony's master Stripe Issuing account
  - Capture exact amount + fee on webhook
  - Fee info included in API response

- **Updated Settings UI**
  - Payment Methods tab (add/remove cards, set default)
  - Billing & Fees tab (current tier, pricing info)
  - Removed Stripe Connect tab

- **Database Schema Updates**
  - `organizations.stripe_customer_id` - For saved payment methods
  - `organizations.billing_email` - For billing notifications
  - `purchase_intents.protocol` - Multi-protocol support
  - `purchase_intents.fee_amount` - Transaction fee
  - `purchase_intents.stripe_pre_auth_id` - Pre-auth reference
  - `virtual_cards.is_recurring` - Subscription support
  - `treasury_balances` table - For future crypto rails

#### Removed
- `lib/stripe/connect.ts` - Stripe Connect OAuth library
- `app/api/stripe/connect/route.ts` - OAuth initiation
- `app/api/stripe/connect/callback/route.ts` - OAuth callback
- `app/api/stripe/connect/status/route.ts` - Connection status

#### Changed
- `lib/stripe/issuing.ts` - Now uses Roony's master account, not connected accounts
- `app/api/v1/purchase_intent/route.ts` - Added pre-auth and fee calculation
- `app/api/webhooks/stripe/route.ts` - Added capture logic for pre-auths
- Settings page now has Payment Methods and Billing tabs instead of Stripe Connection

#### Environment Variables
- `ROONY_CARDHOLDER_ID` - Required for issuing cards (Roony's cardholder ID)

---

### Implementation Roadmap v2.0 (December 4, 2025)

Created comprehensive implementation roadmap for transforming Roony into a Universal AI Agent Payment Platform.

#### Added
- **docs/IMPLEMENTATION_ROADMAP.md** - Full 15-week implementation plan including:
  - Executive summary with vision diagram
  - Phase Overview (0-5) with timelines
  - Fee structure documentation (volume tiers, rail multipliers)
  
- **Phase Quick Start Sections** - Each phase now includes:
  - "Why This Phase?" business context
  - Prerequisites checklist
  - Complete file list (CREATE, MODIFY, DELETE)
  - Step-by-step implementation order
  - Testing commands with expected outputs
  - Environment variables to add
  - Common issues and solutions

- **Before You Start Section** - Required reading and codebase orientation:
  - Key files to understand
  - Development environment setup
  - Document cross-references

#### Phases Documented
- **Phase 0**: Foundation - Saved cards, fee system, remove Stripe Connect
- **Phase 1**: Core Protocols - ACP (OpenAI), AP2 (Google), A2A discovery
- **Phase 2**: Critical Features - Refunds, notifications, subscriptions
- **Phase 3**: Crypto Rails - x402 (USDC), L402 (Lightning)
- **Phase 4**: Enterprise - RBAC, compliance, accounting export
- **Phase 5**: Polish & Scale - Anomaly detection, caching, documentation

---

### Simplified Governance Model (November 30, 2025)

Major refactor to simplify the governance model based on real-world expense management best practices.

#### Changed
- **Governance Model**: Replaced complex policy-based system with 2-level hierarchy (Organization → Agents)
- **Agent Controls**: Spending limits now live directly on agents instead of separate policy entities
  - `monthlyLimit`, `dailyLimit`, `perTransactionLimit`
  - `approvalThreshold` - Require human approval above amount
  - `flagNewVendors` - Require approval for first-time merchants
  - `blockedMerchants`, `allowedMerchants` - JSON arrays for restrictions
- **Organization Guardrails**: Org-wide rules stored as JSON in organizations table
  - `monthlyBudget` - Total organization spending cap
  - `alertThreshold` - Warning at percentage of budget
  - `maxTransactionAmount` - Hard cap on any single transaction
  - `requireApprovalAbove` - Org-wide approval threshold
  - `flagAllNewVendors` - Require approval for all new merchants
  - `blockCategories` - Blocked merchant categories
- **Spending Checker**: New simplified `lib/spending/checker.ts` replaces complex policy evaluator
- **Purchase Intent API**: Updated to use new spending checker logic
- **MCP Handlers**: Updated to use new simplified controls

#### Added
- **Approvals Page** (`/dashboard/approvals`)
  - Queue for purchases requiring human review
  - Approve/reject with notes
  - Filter by status (pending/approved/rejected)
- **Approvals API** (`/api/internal/approvals`)
  - List pending approvals
  - Approve/reject purchase requests
- **Organization Settings API** (`/api/internal/settings/organization`)
  - Get/update org budget and guardrails
- **Budget Utilization API** (`/api/internal/budget`)
  - Get current budget usage for dashboard
- **Dashboard Budget Card**
  - Visual progress bar showing org budget utilization
  - Warning when over threshold
  - Link to adjust budget
- **Pending Approvals Alert**
  - Alert banner on dashboard when approvals pending
  - Quick link to approvals page
- **Known Merchants Table**
  - Tracks first-time and repeat merchants
  - Enables new vendor detection
- **Pending Approvals Table**
  - Links purchase intents to approval workflow
  - Tracks reviewer and review notes
- **Agent Creation with Controls**
  - Tabbed form: Basic Info, Spending Limits, Controls
  - Set all limits during agent creation
  - Edit existing agent controls
- **Settings Guardrails Tab**
  - Configure org budget
  - Set guardrails (max transaction, approval threshold, etc.)
  - Toggle org-wide new vendor flagging
- **`pending_approval` Status**
  - New purchase intent status for items awaiting review

#### Deprecated
- **Policies Table**: Kept for data but no longer used in evaluation
- **Policies Page**: Removed from navigation (can be restored as "Advanced")
- **PolicyEvaluator Class**: Replaced by simpler spending checker

---

### Previous Changes

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

### MCP Protocol Integration
- Model Context Protocol (MCP) server implementation
  - MCP endpoint at `/api/mcp`
  - JSON-RPC 2.0 compliant protocol
  - Protocol version 2024-11-05
- MCP Tools available:
  - `request_purchase` - Request purchase approval, receive virtual card
  - `check_budget` - Check remaining budget and spending limits
  - `list_transactions` - List recent transactions
  - `get_policy_info` - Get spending policy information
- MCP Integration documentation
  - Setup guide for workflow builders
  - Example code for TypeScript clients
  - Claude Desktop integration
  - Testing commands
- Full MCP type definitions and handlers
