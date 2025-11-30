# Roony API Documentation

## Overview

Roony provides two ways for AI agents to interact:

1. **REST API** - Traditional HTTP API at `/api/v1/purchase_intent`
2. **MCP Protocol** - Model Context Protocol at `/api/mcp` (see [MCP_INTEGRATION.md](MCP_INTEGRATION.md))

This document covers the REST API. For MCP integration, see the dedicated guide.

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

## Agent Endpoints (REST)

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
  "amount": 129.99,
  "currency": "usd",
  "description": "1 month Figma Professional",
  "merchant": {
    "name": "Figma",
    "url": "https://www.figma.com/pricing"
  },
  "metadata": {
    "project_id": "proj_design_system"
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `amount` | ✅ | Purchase amount (e.g., 129.99) |
| `currency` | ✅ | Currency code (e.g., "usd") |
| `description` | ✅ | What is being purchased |
| `merchant.name` | ✅ | Merchant name |
| `merchant.url` | ❌ | Merchant URL |
| `metadata` | ❌ | Additional metadata |
| `agent_id` | ❌ | Optional - uses authenticated agent if omitted |

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

**Pending Approval Response (200):**
```json
{
  "status": "pending_approval",
  "message": "Amount $150.00 exceeds approval threshold of $100.00",
  "purchase_intent_id": "uuid"
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
| Code | Description |
|------|-------------|
| `OVER_TRANSACTION_LIMIT` | Exceeds agent's per-transaction limit |
| `OVER_ORG_MAX_TRANSACTION` | Exceeds org's max transaction amount |
| `DAILY_LIMIT_EXCEEDED` | Agent's daily limit exceeded |
| `MONTHLY_LIMIT_EXCEEDED` | Agent's monthly limit exceeded |
| `ORG_BUDGET_EXCEEDED` | Organization's monthly budget exceeded |
| `MERCHANT_BLOCKED` | Merchant is blocked by agent |
| `MERCHANT_NOT_ALLOWED` | Merchant not in agent's allowed list |
| `CATEGORY_BLOCKED` | Matches org's blocked category |
| `AGENT_NOT_FOUND` | Agent doesn't exist |
| `NO_STRIPE_CONNECTION` | Stripe not connected |
| `STRIPE_CONNECTION_INACTIVE` | Stripe connection inactive |
| `CARD_CREATION_FAILED` | Failed to create virtual card |

---

## Internal Management APIs

All internal APIs require authentication via NextAuth.js session.

### Agents

#### GET /api/internal/agents
List all agents for the organization with spending controls.

**Response:**
```json
{
  "agents": [
    {
      "id": "uuid",
      "name": "Research Agent",
      "description": "Handles research tasks",
      "status": "active",
      "monthlyLimit": 500,
      "dailyLimit": 100,
      "perTransactionLimit": 50,
      "approvalThreshold": 25,
      "flagNewVendors": true,
      "blockedMerchants": ["facebook ads"],
      "allowedMerchants": null,
      "createdAt": "2025-11-28T00:00:00Z"
    }
  ]
}
```

#### POST /api/internal/agents
Create a new agent with spending controls.

**Request:**
```json
{
  "name": "My Agent",
  "description": "Description",
  "monthlyLimit": 500,
  "dailyLimit": 100,
  "perTransactionLimit": 50,
  "approvalThreshold": 25,
  "flagNewVendors": true,
  "blockedMerchants": ["facebook ads"],
  "allowedMerchants": null
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
Update agent settings and spending controls.

**Request:**
```json
{
  "name": "New Name",
  "status": "paused",
  "monthlyLimit": 600,
  "approvalThreshold": 50
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

### Approvals

#### GET /api/internal/approvals
List pending approvals.

**Query Parameters:**
- `status`: "pending" | "approved" | "rejected" | "all" (default: "pending")

**Response:**
```json
{
  "approvals": [
    {
      "id": "uuid",
      "purchaseIntentId": "uuid",
      "agentId": "uuid",
      "agentName": "Research Agent",
      "amount": 150.00,
      "merchantName": "New SaaS Tool",
      "reason": "OVER_THRESHOLD",
      "reasonDetails": "Amount exceeds approval threshold",
      "status": "pending",
      "createdAt": "2025-11-28T00:00:00Z",
      "description": "Monthly subscription",
      "currency": "usd"
    }
  ],
  "counts": {
    "pending": 3,
    "approved": 10,
    "rejected": 2
  }
}
```

#### PUT /api/internal/approvals/:id
Approve or reject a pending approval.

**Request:**
```json
{
  "action": "approve",
  "notes": "Approved for Q4 budget"
}
```

**Response:**
```json
{
  "approval": { ... },
  "message": "Purchase approved successfully"
}
```

---

### Organization Settings

#### GET /api/internal/settings/organization
Get organization settings including budget and guardrails.

**Response:**
```json
{
  "name": "Acme Corp",
  "monthlyBudget": 10000,
  "alertThreshold": 0.8,
  "guardrails": {
    "blockCategories": ["gambling"],
    "requireApprovalAbove": 500,
    "flagAllNewVendors": false,
    "maxTransactionAmount": 1000
  }
}
```

#### PUT /api/internal/settings/organization
Update organization settings.

**Request:**
```json
{
  "monthlyBudget": 15000,
  "alertThreshold": 0.75,
  "guardrails": {
    "blockCategories": ["gambling", "adult"],
    "requireApprovalAbove": 500,
    "flagAllNewVendors": true,
    "maxTransactionAmount": 1000
  }
}
```

---

### Budget

#### GET /api/internal/budget
Get budget utilization info for dashboard.

**Response:**
```json
{
  "orgBudget": 10000,
  "orgSpent": 7200,
  "orgRemaining": 2800,
  "percentUsed": 72,
  "alertThreshold": 80,
  "isOverThreshold": false,
  "pendingApprovals": 3
}
```

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
  "totalPolicies": 0,
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
