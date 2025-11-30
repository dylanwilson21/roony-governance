# MCP Integration Guide

Roony supports the **Model Context Protocol (MCP)**, allowing AI agents to integrate with Roony using the standardized MCP protocol. This enables seamless integration with MCP-compatible platforms and AI systems.

## What is MCP?

The Model Context Protocol (MCP) is an open standard developed by Anthropic that allows AI models to interact with external tools and services in a standardized way. Instead of building custom integrations, MCP provides a common interface for:

- **Tool discovery**: AI agents can discover what tools are available
- **Tool execution**: Standard format for calling tools and receiving results
- **Context sharing**: Share resources and prompts with AI agents

## Connecting to Roony via MCP

### Endpoint

```
POST https://your-roony-domain.com/api/mcp
```

### Authentication

Include your Roony API key in the Authorization header:

```
Authorization: Bearer rk_your_api_key_here
```

### Server Info

```
GET https://your-roony-domain.com/api/mcp
```

Returns server capabilities and available tools.

## Available Tools

Roony exposes the following tools via MCP:

### 1. `request_purchase`

Request approval for a purchase. If approved, returns a virtual card. May return `pending_approval` if the purchase needs human review.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `amount` | number | ✅ | Purchase amount (e.g., 49.99) |
| `currency` | string | ✅ | ISO currency code (e.g., "usd") |
| `description` | string | ✅ | What is being purchased |
| `merchant_name` | string | ✅ | Name of the merchant |
| `merchant_url` | string | ❌ | Merchant website URL |
| `project_id` | string | ❌ | Project ID for tracking |

**Example:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "request_purchase",
    "arguments": {
      "amount": 49.99,
      "currency": "usd",
      "description": "Monthly GitHub Copilot subscription",
      "merchant_name": "GitHub"
    }
  }
}
```

**Success Response (Approved):**
```json
{
  "status": "approved",
  "card": {
    "card_id": "card_abc123",
    "number": "4242424242424242",
    "exp_month": 12,
    "exp_year": 2026,
    "cvc": "123",
    "billing_zip": "10001"
  },
  "hard_limit_amount": 49.99,
  "currency": "usd",
  "expires_at": "2025-11-29T12:00:00Z",
  "purchase_intent_id": "uuid",
  "message": "Purchase approved. Use this card to complete your purchase."
}
```

**Pending Approval Response:**
```json
{
  "status": "pending_approval",
  "message": "Amount $150.00 exceeds approval threshold of $100.00",
  "purchase_intent_id": "uuid",
  "suggestion": "A human administrator will review this request. You'll be notified of the decision."
}
```

**Rejection Response:**
```json
{
  "status": "rejected",
  "reason_code": "MONTHLY_LIMIT_EXCEEDED",
  "message": "Monthly spend would exceed limit of $500.00",
  "suggestion": "Your monthly spending limit has been reached. Try again next month or request a limit increase."
}
```

### 2. `check_budget`

Check remaining budget, spending limits, and organization budget.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | string | ❌ | "daily", "monthly", or "all" (default: "all") |

**Example:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "check_budget",
    "arguments": {}
  }
}
```

**Response (all periods):**
```json
{
  "agent_id": "uuid",
  "agent_name": "Research Bot",
  "currency": "usd",
  "limits": {
    "per_transaction": 50,
    "daily": 100,
    "monthly": 500
  },
  "current_spend": {
    "daily": 25.00,
    "monthly": 350.50
  },
  "remaining": {
    "daily": 75.00,
    "monthly": 149.50
  },
  "organization": {
    "monthly_budget": 10000,
    "org_spent": 7200,
    "org_remaining": 2800,
    "percent_used": "72.0%"
  },
  "controls": {
    "approval_threshold": 100,
    "flag_new_vendors": true,
    "has_merchant_restrictions": false
  }
}
```

**Response (single period):**
```json
{
  "agent_id": "uuid",
  "period": "monthly",
  "limit": 500,
  "spent": 350.50,
  "remaining": 149.50
}
```

### 3. `list_transactions`

List recent transactions for this agent.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | ❌ | Max transactions to return (default: 10, max: 50) |
| `status` | string | ❌ | Filter: "approved", "rejected", "pending_approval", "all" |

**Example:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "list_transactions",
    "arguments": {
      "limit": 5,
      "status": "approved"
    }
  }
}
```

**Response:**
```json
{
  "agent_id": "uuid",
  "count": 5,
  "transactions": [
    {
      "id": "uuid",
      "amount": 49.99,
      "currency": "usd",
      "description": "Monthly subscription",
      "merchant": "GitHub",
      "status": "approved",
      "rejection_reason": null,
      "timestamp": "2025-11-28T10:00:00Z"
    }
  ]
}
```

### 4. `get_policy_info`

Get information about spending controls that apply to this agent.

**Parameters:** None

**Example:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "get_policy_info",
    "arguments": {}
  }
}
```

**Response:**
```json
{
  "agent_id": "uuid",
  "agent_name": "Research Bot",
  "agent_controls": {
    "spending_limits": {
      "per_transaction": 50,
      "daily": 100,
      "monthly": 500
    },
    "approval_rules": {
      "threshold": "Purchases over $100 require human approval",
      "new_vendors": "Purchases from new vendors require human approval"
    },
    "merchant_restrictions": {
      "blocked": ["facebook ads"],
      "allowed_only": "any merchant"
    }
  },
  "organization_guardrails": {
    "monthly_budget": 10000,
    "max_transaction": 1000,
    "require_approval_above": 500,
    "flag_all_new_vendors": false,
    "blocked_categories": ["gambling"]
  },
  "summary": "You have a monthly budget of $500, max $50 per transaction, purchases over $100 need approval, new vendors require approval."
}
```

## MCP Protocol Messages

### Initialize Session

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "my-ai-agent",
      "version": "1.0.0"
    }
  }
}
```

### List Available Tools

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

### Call a Tool

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": { ... }
  }
}
```

## Integration Examples

### Connecting from an MCP Client (TypeScript)

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { HttpClientTransport } from "@modelcontextprotocol/sdk/client/http.js";

const transport = new HttpClientTransport({
  url: "https://your-roony-domain.com/api/mcp",
  headers: {
    "Authorization": "Bearer rk_your_api_key"
  }
});

const client = new Client({
  name: "my-agent",
  version: "1.0.0"
});

await client.connect(transport);

// Check budget first
const budget = await client.callTool({
  name: "check_budget",
  arguments: {}
});
console.log("Budget:", budget);

// Request a purchase
const result = await client.callTool({
  name: "request_purchase",
  arguments: {
    amount: 29.99,
    currency: "usd",
    description: "Monthly subscription",
    merchant_name: "Example SaaS"
  }
});

if (result.status === "approved") {
  console.log("Card number:", result.card.number);
} else if (result.status === "pending_approval") {
  console.log("Waiting for approval:", result.message);
} else {
  console.log("Rejected:", result.message);
}
```

### Connecting from a Workflow Builder

In visual workflow builders that support MCP:

1. **URL**: `https://your-roony-domain.com/api/mcp`
2. **Label**: `roony`
3. **Description**: `Financial firewall for AI agent purchases`
4. **Authentication**: Access token / API key
5. **Token**: Your Roony agent API key (`rk_...`)

### Using with Claude Desktop

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "roony": {
      "command": "curl",
      "args": [
        "-X", "POST",
        "-H", "Authorization: Bearer rk_your_api_key",
        "-H", "Content-Type: application/json",
        "https://your-roony-domain.com/api/mcp"
      ]
    }
  }
}
```

*Note: For production use, consider using a proper MCP client library instead of curl.*

## Error Handling

MCP errors follow the JSON-RPC 2.0 error format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32600,
    "message": "Invalid Request"
  }
}
```

**Error Codes:**
| Code | Meaning |
|------|---------|
| -32700 | Parse error |
| -32600 | Invalid request |
| -32601 | Method not found |
| -32602 | Invalid params |
| -32603 | Internal error |
| -32000 | Authentication error |

## Rejection Reason Codes

When a purchase is rejected, the `reason_code` indicates why:

| Code | Description |
|------|-------------|
| `OVER_TRANSACTION_LIMIT` | Exceeds agent's per-transaction limit |
| `OVER_ORG_MAX_TRANSACTION` | Exceeds org's max transaction amount |
| `DAILY_LIMIT_EXCEEDED` | Agent's daily budget exceeded |
| `MONTHLY_LIMIT_EXCEEDED` | Agent's monthly budget exceeded |
| `ORG_BUDGET_EXCEEDED` | Organization's monthly budget exceeded |
| `MERCHANT_NOT_ALLOWED` | Merchant not on agent's allowed list |
| `MERCHANT_BLOCKED` | Merchant is blocked by agent |
| `CATEGORY_BLOCKED` | Matches org's blocked category |
| `AGENT_NOT_FOUND` | Agent doesn't exist |

## Best Practices

1. **Check budget before purchasing**: Call `check_budget` to verify you have sufficient budget before attempting a purchase.

2. **Handle all three statuses**: A purchase can be `approved`, `pending_approval`, or `rejected`. Handle each case appropriately.

3. **Use project IDs**: Include `project_id` in purchases for better spend tracking and reporting.

4. **Cache policy info**: Call `get_policy_info` at startup to understand spending rules.

5. **Implement retries**: For network errors, implement exponential backoff retry logic.

6. **Handle pending approvals**: If status is `pending_approval`, inform the user that a human will review the request.

## Security Considerations

- API keys authenticate at the agent level
- Each agent has its own spending limits
- Virtual cards are single-use and amount-limited
- All transactions are logged for audit
- Pending approvals require human review

## Testing

To test the MCP integration locally:

```bash
# Initialize
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer rk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'

# List tools
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer rk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# Check budget
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer rk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"check_budget","arguments":{}}}'

# Request purchase
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer rk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"request_purchase","arguments":{"amount":25,"currency":"usd","description":"Test","merchant_name":"Test Co"}}}'
```
