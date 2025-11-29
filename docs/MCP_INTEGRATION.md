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

Request approval for a purchase. If approved, returns a virtual card.

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

**Success Response:**
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
  "message": "Purchase approved. Use this card to complete your purchase."
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

Check remaining budget and spending limits.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | string | ❌ | "daily", "weekly", "monthly", or "all" (default: "all") |

**Example:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "check_budget",
    "arguments": {
      "period": "monthly"
    }
  }
}
```

**Response:**
```json
{
  "agent_id": "agent_123",
  "period": "monthly",
  "limit": 1000,
  "spent": 350.50,
  "remaining": 649.50
}
```

### 3. `list_transactions`

List recent transactions for this agent.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | ❌ | Max transactions to return (default: 10, max: 50) |
| `status` | string | ❌ | Filter: "approved", "rejected", "pending", "all" |

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

### 4. `get_policy_info`

Get information about spending policies that apply to this agent.

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

// List available tools
const tools = await client.listTools();
console.log(tools);

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

console.log(result);
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

### Using with OpenAI Assistants

While OpenAI doesn't natively support MCP, you can:

1. Create a function that wraps the MCP call
2. Use the Roony REST API directly (see API.md)

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
| `AMOUNT_TOO_HIGH` | Exceeds per-transaction limit |
| `DAILY_LIMIT_EXCEEDED` | Daily budget exceeded |
| `WEEKLY_LIMIT_EXCEEDED` | Weekly budget exceeded |
| `MONTHLY_LIMIT_EXCEEDED` | Monthly budget exceeded |
| `LIFETIME_LIMIT_EXCEEDED` | Lifetime budget exceeded |
| `MERCHANT_NOT_ALLOWED` | Merchant not on allowlist |
| `MERCHANT_BLOCKED` | Merchant is blocklisted |
| `TIME_RESTRICTED` | Outside allowed hours |
| `NO_POLICY` | No policy configured |
| `AGENT_PAUSED` | Agent is paused |

## Best Practices

1. **Check budget before purchasing**: Call `check_budget` to verify you have sufficient budget before attempting a purchase.

2. **Handle rejections gracefully**: Parse the `reason_code` and `suggestion` to provide helpful feedback to users.

3. **Use project IDs**: Include `project_id` in purchases for better spend tracking and reporting.

4. **Cache policy info**: Call `get_policy_info` at startup to understand spending rules.

5. **Implement retries**: For network errors, implement exponential backoff retry logic.

## Security Considerations

- API keys authenticate at the agent level
- Each agent has its own policies and budget limits
- Virtual cards are single-use and amount-limited
- All transactions are logged for audit

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
```

