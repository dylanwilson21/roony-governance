# Roony API Documentation

## Overview

Roony provides a RESTful API for AI agents to request purchases and for internal management of policies, agents, and transactions.

## Base URL

- Development: `http://localhost:3000`
- Production: `https://api.roony.com`

## Authentication

### Agent API Keys

Agents authenticate using Bearer tokens in the Authorization header:

```
Authorization: Bearer AGENT_API_KEY
```

API keys are generated in the dashboard and can be scoped to specific agents or teams.

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
  "agent_id": "agent_123",
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
  "reason_code": "MERCHANT_NOT_ALLOWED",
  "message": "This agent is not allowed to purchase from new SaaS vendors over $100 without human review."
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing API key
- `400 Bad Request` - Invalid request format
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## Internal Management Endpoints

### Policies

- `GET /api/internal/policies` - List all policies
- `POST /api/internal/policies` - Create a policy
- `GET /api/internal/policies/:id` - Get policy details
- `PUT /api/internal/policies/:id` - Update a policy
- `DELETE /api/internal/policies/:id` - Delete a policy

### Agents

- `GET /api/internal/agents` - List all agents
- `POST /api/internal/agents` - Create an agent
- `GET /api/internal/agents/:id` - Get agent details
- `PUT /api/internal/agents/:id` - Update an agent
- `POST /api/internal/agents/:id/pause` - Pause an agent
- `POST /api/internal/agents/:id/resume` - Resume an agent

### Transactions

- `GET /api/internal/transactions` - List transactions with filters
- `GET /api/internal/transactions/:id` - Get transaction details

### Analytics

- `GET /api/internal/analytics/spend` - Get spend analytics
- `GET /api/internal/analytics/blocked` - Get blocked attempts analytics

## Webhook Endpoints

### POST /api/webhooks/stripe

Receives webhooks from Stripe for:
- Authorization events
- Capture/settlement events
- Card status updates

**Note**: This endpoint verifies webhook signatures before processing.

## Rate Limiting

- Agent endpoints: 100 requests per minute per API key
- Internal endpoints: 1000 requests per minute per user
- Webhook endpoints: No rate limit (signature verified)

## Error Codes

### Rejection Reason Codes

- `BUDGET_EXCEEDED` - Agent/project/org budget limit reached
- `MERCHANT_NOT_ALLOWED` - Merchant not in allowlist or in blocklist
- `MCC_BLOCKED` - Merchant category code not allowed
- `AMOUNT_TOO_HIGH` - Transaction amount exceeds policy limit
- `TIME_RESTRICTED` - Purchase outside allowed time window
- `RISK_TRIGGERED` - Suspicious pattern detected
- `HUMAN_APPROVAL_REQUIRED` - Requires manual approval
- `AGENT_PAUSED` - Agent is currently paused

