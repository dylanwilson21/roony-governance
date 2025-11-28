# Policy Engine

## Overview

The policy engine is the core decision-making component of Roony. It evaluates purchase requests against configured policies and determines whether to approve or reject them.

## Policy Structure

A policy consists of:

1. **Scope** - Who/what it applies to (agent_id, team_id, project_id, org-wide)
2. **Rules** - What constraints to enforce
3. **Actions** - What to do on match (approve, reject, require human approval)

## Policy Dimensions

### Budget Limits

- **Per-transaction limit**: Maximum amount for a single transaction
- **Daily limit**: Maximum spend per day
- **Weekly limit**: Maximum spend per week
- **Monthly limit**: Maximum spend per month
- **Lifetime limit**: Maximum total spend

### Merchant Controls

- **Allowlist**: Only these merchants are allowed
- **Blocklist**: These merchants are blocked
- **New vendor policy**: Rules for first-time purchases from a merchant

### Category Controls (MCC)

- **Allowed MCCs**: Only these merchant category codes
- **Blocked MCCs**: These MCCs are not allowed
- **Examples**: SaaS (5734), Cloud Infrastructure (4814), Dev Tools (7372)

### Time-Based Rules

- **Business hours only**: Only allow during specific hours
- **Day of week**: Only allow on specific days
- **Timezone**: Timezone for time-based rules

### Risk Triggers

- **Velocity checks**: Too many requests in short time
- **Unusual amount**: Amount significantly different from history
- **New vendor**: First purchase from a merchant
- **Pattern detection**: Suspicious spending patterns

## Policy Evaluation Flow

1. **Collect applicable policies**
   - Policies matching agent_id, team_id, project_id, or org-wide
   - Ordered by specificity (agent > team > project > org)

2. **Evaluate each policy**
   - Check budget limits (query current spend)
   - Check merchant allowlist/blocklist
   - Check MCC restrictions
   - Check time-based rules
   - Check risk triggers

3. **Determine outcome**
   - If any policy rejects → REJECTED
   - If any policy requires approval → PENDING_APPROVAL
   - If all policies approve → APPROVED

4. **Return result**
   - Status (approved/rejected/pending)
   - Reason code if rejected
   - Which policy triggered the decision

## Policy Priority

When multiple policies apply:

1. Most specific policy wins (agent > team > project > org)
2. Rejections override approvals
3. Human approval requirements override auto-approvals

## Budget Tracking

Budgets are tracked at multiple levels:

- **Agent level**: Per-agent spending
- **Project level**: All agents in a project
- **Team level**: All agents in a team
- **Organization level**: All spending

Budgets are updated:
- On card creation (reserve amount)
- On transaction settlement (deduct from budget)
- On transaction failure (release reservation)

## Implementation Details

### Policy Storage

Policies are stored in the database with a JSON structure:

```typescript
interface Policy {
  id: string;
  name: string;
  scope: {
    type: 'agent' | 'team' | 'project' | 'org';
    ids: string[];
  };
  rules: {
    budget?: BudgetRules;
    merchant?: MerchantRules;
    mcc?: MCCRules;
    time?: TimeRules;
    risk?: RiskRules;
  };
  action: 'approve' | 'reject' | 'require_approval';
  priority: number;
  enabled: boolean;
}
```

### Evaluation Service

The `PolicyEvaluator` service:

1. Loads applicable policies from database
2. Evaluates each policy rule
3. Aggregates results
4. Returns decision with reasoning

### Caching

- Policy definitions cached (invalidate on update)
- Budget queries cached with short TTL (5 seconds)
- Merchant lookups cached

## Example Policies

### Policy 1: Research Agent Budget
```json
{
  "name": "Research Agent Monthly Budget",
  "scope": { "type": "agent", "ids": ["research_agent_1"] },
  "rules": {
    "budget": {
      "monthly_limit": 300,
      "per_transaction_limit": 50
    },
    "mcc": {
      "allowed": ["5734", "4814", "7372"]
    }
  },
  "action": "approve"
}
```

### Policy 2: New Vendor Approval
```json
{
  "name": "New Vendor Over $500",
  "scope": { "type": "org" },
  "rules": {
    "merchant": {
      "new_vendor_threshold": 500
    }
  },
  "action": "require_approval"
}
```

### Policy 3: Business Hours Only
```json
{
  "name": "Business Hours Restriction",
  "scope": { "type": "team", "ids": ["team_marketing"] },
  "rules": {
    "time": {
      "business_hours": {
        "start": "09:00",
        "end": "17:00",
        "timezone": "America/New_York",
        "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
      }
    }
  },
  "action": "reject"
}
```

