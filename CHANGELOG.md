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

