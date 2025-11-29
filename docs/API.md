# Roony API Documentation

## Overview

Roony provides a RESTful API for AI agents to request purchases and for internal management of policies, agents, and transactions.

## Base URL

- Development: `http://localhost:3000`
- Production: `https://your-domain.com`

## Authentication

### Agent API Keys

Agents authenticate using Bearer tokens in the Authorization header:

```
Authorization: Bearer rk_xxxxxxxxxxxxx
```

API keys are generated when creating an agent in the dashboard. Keys start with `rk_` prefix.

### Internal APIs

Internal APIs require a valid NextAuth.js session. Users must be logged in via the dashboard.

---

## Agent Endpoints

### POST /api/v1/purchase_intent

Request a purchase approval and receive a virtual card if approved.

**Request Headers:**
```
Authorization: Bearer AGENT_API_KEY
Content-Type: application/json
```

**Request Body:**
```json
{
  "agent_id": "uuid-of-agent",
  "amount": 129.99,
  "currency": "usd",
  "description": "1 month Figma Professional",
  "merchant": {
    "name": "Figma",
    "url": "https://www.figma.com/pricing"
  },
  "metadata": {
    "project_id": "proj_design_system",
    "user_id": "user_456"
  }
}
```

**Success Response (200):**
```json
{
  "status": "approved",
  "card": {
    "card_id": "card_123",
    "number": "4242424242424242",
    "exp_month": 12,
    "exp_year": 2030,
    "cvc": "123",
    "billing_zip": "10001"
  },
  "hard_limit_amount": 129.99,
  "currency": "usd",
  "expires_at": "2025-11-27T00:00:00Z"
}
```

**Rejection Response (200):**
```json
{
  "status": "rejected",
  "reason_code": "MONTHLY_LIMIT_EXCEEDED",
  "message": "Monthly spend would exceed limit of $500.00 (current: $450.00)"
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing API key
- `400 Bad Request` - Invalid request format
- `500 Internal Server Error` - Server error

**Rejection Reason Codes:**
- `NO_POLICY` - No policy configured for this agent
- `AMOUNT_TOO_HIGH` - Exceeds per-transaction limit
- `DAILY_LIMIT_EXCEEDED` - Daily spend limit exceeded
- `WEEKLY_LIMIT_EXCEEDED` - Weekly spend limit exceeded
- `MONTHLY_LIMIT_EXCEEDED` - Monthly spend limit exceeded
- `LIFETIME_LIMIT_EXCEEDED` - Lifetime spend limit exceeded
- `MERCHANT_NOT_ALLOWED` - Merchant blocked or not in allowlist
- `TIME_RESTRICTED` - Outside allowed hours
- `AGENT_PAUSED` - Agent is paused
- `NO_STRIPE_CONNECTION` - Stripe not connected

---

## Internal Management APIs

All internal APIs require authentication via NextAuth.js session.

### Agents

#### GET /api/internal/agents
List all agents for the organization.

**Response:**
```json
{
  "agents": [
    {
      "id": "uuid",
      "name": "Research Agent",
      "status": "active",
      "createdAt": "2025-11-28T00:00:00Z"
    }
  ]
}
```

#### POST /api/internal/agents
Create a new agent.

**Request:**
```json
{
  "name": "My Agent"
}
```

**Response:**
```json
{
  "agent": { "id": "uuid", "name": "My Agent", ... },
  "apiKey": "rk_xxxxxxxxxxxxxxxx"
}
```

#### GET /api/internal/agents/:id
Get agent details.

#### PUT /api/internal/agents/:id
Update agent (name, status).

**Request:**
```json
{
  "name": "New Name",
  "status": "paused"
}
```

#### DELETE /api/internal/agents/:id
Delete an agent.

#### POST /api/internal/agents/:id/regenerate-key
Regenerate API key.

**Response:**
```json
{
  "agent": { ... },
  "apiKey": "rk_new_key_here"
}
```

---

### Policies

#### GET /api/internal/policies
List all policies.

**Response:**
```json
{
  "policies": [
    {
      "id": "uuid",
      "name": "Monthly Budget",
      "scopeType": "org",
      "scopeIds": [],
      "rules": {
        "budget": {
          "monthlyLimit": 1000,
          "perTransactionLimit": 100
        },
        "merchant": {
          "allowlist": ["figma", "github"],
          "blocklist": ["facebook ads"]
        }
      },
      "action": "approve",
      "enabled": true,
      "priority": 0
    }
  ]
}
```

#### POST /api/internal/policies
Create a policy.

**Request:**
```json
{
  "name": "Monthly Budget",
  "description": "Limit monthly spend",
  "scopeType": "org",
  "scopeIds": [],
  "rules": {
    "budget": {
      "monthlyLimit": 1000,
      "perTransactionLimit": 100
    }
  },
  "action": "approve"
}
```

#### GET /api/internal/policies/:id
Get policy details.

#### PUT /api/internal/policies/:id
Update policy.

#### DELETE /api/internal/policies/:id
Delete policy.

---

### Transactions

#### GET /api/internal/transactions
List transactions.

**Response:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "agentId": "uuid",
      "agentName": "Research Agent",
      "amount": 50.00,
      "currency": "usd",
      "description": "Monthly subscription",
      "merchantName": "Figma",
      "status": "approved",
      "rejectionCode": null,
      "createdAt": "2025-11-28T00:00:00Z"
    }
  ]
}
```

---

### Analytics

#### GET /api/internal/analytics
Get dashboard analytics.

**Response:**
```json
{
  "totalSpend": 1500.00,
  "activeAgents": 3,
  "todayTransactions": 5,
  "blockedAttempts": 2,
  "totalPolicies": 4,
  "monthlySpend": 800.00,
  "spendByAgent": [
    { "agentId": "uuid", "agentName": "Agent 1", "totalSpend": 500.00 }
  ]
}
```

---

### Stripe Connection

#### GET /api/stripe/connect
Initiates Stripe Connect OAuth flow. Redirects to Stripe.

#### GET /api/stripe/connect/status
Check connection status.

**Response:**
```json
{
  "connected": true,
  "status": "active",
  "accountId": "acct_xxxxx",
  "connectedAt": "2025-11-28T00:00:00Z"
}
```

#### DELETE /api/stripe/connect/status
Disconnect Stripe account.

---

## Webhook Endpoints

### POST /api/webhooks/stripe
Receives Stripe webhook events. Verifies signature before processing.

**Events Handled:**
- `issuing_authorization.request`
- `issuing_authorization.created`
- `charge.succeeded`
- `issuing_card.created`
- `issuing_card.updated`

---

## Error Format

All errors return JSON:
```json
{
  "error": "Error message here"
}
```

Or for purchase intents:
```json
{
  "status": "rejected",
  "reason_code": "ERROR_CODE",
  "message": "Human-readable message"
}
```
