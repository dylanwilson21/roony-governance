# Spending Controls

## Overview

Roony uses a simplified 2-level governance model where spending controls live directly on agents, and organization-wide guardrails apply to all agents.

## Governance Hierarchy

```
Organization
├── Budget & Guardrails (apply to ALL agents)
│   ├── Monthly budget: $10,000
│   ├── Alert at: 80%
│   ├── Max transaction: $1,000
│   ├── Require approval above: $500
│   ├── Flag all new vendors: true
│   └── Block categories: ["gambling", "adult"]
│
├── Agent "Research Bot"
│   ├── Monthly limit: $500
│   ├── Daily limit: $100
│   ├── Per-transaction max: $50
│   ├── Approval threshold: $25
│   ├── Flag new vendors: true
│   └── Blocked merchants: ["facebook ads"]
│
└── Agent "Code Assistant"
    ├── Monthly limit: $300
    ├── Per-transaction max: $100
    └── Allowed merchants only: ["github", "aws", "figma"]
```

## Organization Settings

### Budget
- **Monthly Budget**: Total spending cap for all agents combined
- **Alert Threshold**: Percentage at which to show budget warning (default: 80%)

### Guardrails

Guardrails are rules that apply to ALL agents in the organization:

| Guardrail | Description |
|-----------|-------------|
| `maxTransactionAmount` | Hard cap on any single transaction (blocks if exceeded) |
| `requireApprovalAbove` | All purchases above this amount need human approval |
| `flagAllNewVendors` | Require approval for first purchase from any new merchant |
| `blockCategories` | Array of blocked categories/merchant keywords |

## Agent Controls

Each agent has its own spending controls set directly on the agent:

### Spending Limits

| Control | Description |
|---------|-------------|
| `monthlyLimit` | Maximum spend per calendar month |
| `dailyLimit` | Maximum spend per day |
| `perTransactionLimit` | Maximum for a single purchase |

### Approval Rules

| Control | Description |
|---------|-------------|
| `approvalThreshold` | Purchases above this amount need human approval |
| `flagNewVendors` | Require approval for first purchase from new vendors |

### Merchant Restrictions

| Control | Description |
|---------|-------------|
| `blockedMerchants` | Array of blocked merchant names (partial match) |
| `allowedMerchants` | If set, ONLY these merchants are allowed (whitelist mode) |

## Evaluation Order

When a purchase request comes in, Roony evaluates in this order:

1. **Agent per-transaction limit** → Block if exceeded
2. **Org max transaction amount** → Block if exceeded
3. **Agent daily limit** → Block if exceeded
4. **Agent monthly limit** → Block if exceeded
5. **Org monthly budget** → Block if exceeded
6. **Agent blocked merchants** → Block if match
7. **Agent allowed merchants** → Block if not in list (when set)
8. **Org blocked categories** → Block if match
9. **Agent approval threshold** → Queue for approval
10. **Org approval threshold** → Queue for approval
11. **Agent flag new vendors** → Queue for approval if new
12. **Org flag all new vendors** → Queue for approval if new
13. **Approved** → Create virtual card

## Result Types

### Approved
Purchase passes all checks. Virtual card is created immediately.

```json
{
  "status": "approved",
  "card": { ... }
}
```

### Pending Approval
Purchase is within limits but triggers an approval rule.

```json
{
  "status": "pending_approval",
  "message": "Amount exceeds approval threshold of $100",
  "purchase_intent_id": "uuid"
}
```

### Rejected
Purchase violates a hard limit.

```json
{
  "status": "rejected",
  "reason_code": "MONTHLY_LIMIT_EXCEEDED",
  "message": "Monthly spend would exceed limit of $500 (current: $480)"
}
```

## Rejection Codes

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

## Approval Reasons

| Reason | Trigger |
|--------|---------|
| `OVER_THRESHOLD` | Amount exceeds approval threshold |
| `NEW_VENDOR` | First purchase from this merchant |
| `ORG_GUARDRAIL` | Triggers org-level approval rule |

## New Vendor Detection

Roony tracks known merchants per organization:
- First purchase from a merchant = "new vendor"
- After successful transaction, merchant is recorded as "known"
- Subsequent purchases from same merchant are not flagged as new

Merchant matching uses normalized names (lowercase, trimmed) for comparison.

## Example Scenarios

### Scenario 1: Under All Limits
- Agent monthly limit: $500 (spent: $100)
- Agent per-tx limit: $50
- Purchase: $30

**Result**: ✅ Approved (all checks pass)

### Scenario 2: Over Approval Threshold
- Agent approval threshold: $100
- Purchase: $150

**Result**: ⏳ Pending Approval (requires human review)

### Scenario 3: Monthly Limit Exceeded
- Agent monthly limit: $500 (spent: $480)
- Purchase: $50

**Result**: ❌ Rejected (MONTHLY_LIMIT_EXCEEDED)

### Scenario 4: New Vendor with Flag
- Agent `flagNewVendors`: true
- Merchant: "New SaaS Tool" (never seen before)
- Purchase: $20

**Result**: ⏳ Pending Approval (NEW_VENDOR)

### Scenario 5: Blocked Merchant
- Agent blocked merchants: ["facebook ads", "google ads"]
- Merchant: "Facebook Ads"

**Result**: ❌ Rejected (MERCHANT_BLOCKED)

## Dashboard UI

### Agent Creation/Edit
- Basic Info tab: Name, description
- Spending Limits tab: Monthly, daily, per-transaction limits
- Controls tab: Approval threshold, new vendor flag, merchant lists

### Settings → Spending Guardrails
- Organization budget
- Alert threshold percentage
- Max transaction amount
- Require approval above
- Flag all new vendors toggle
- Blocked categories input

### Approvals Page
- List of pending purchases awaiting review
- Approve/reject with notes
- Filter by status (pending/approved/rejected)

### Dashboard
- Budget utilization card with progress bar
- Pending approvals alert when items need review

