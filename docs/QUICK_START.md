# Roony Alpha - Quick Start Guide

Get your AI agent spending in under 5 minutes.

## What is Roony?

Roony is a financial firewall for AI agents. It lets you:
- Set spending limits for your agents (per transaction, daily, monthly)
- Control which merchants agents can buy from
- Get your agent a payment card only when purchases are approved

## Setup

### 1. Sign Up

Go to your Roony instance and create an account.

### 2. Add a Card

Go to **Settings → Alpha Card** and enter your card details.

> ⚠️ **Important**: Use a virtual card from [Privacy.com](https://privacy.com) or similar service. Set spending limits on that card as a second layer of protection.

### 3. Set Spending Limits

Go to **Settings → Spending Guardrails** and configure:
- Monthly budget for your organization
- Maximum transaction amount
- Require approval above a certain amount

### 4. Create an Agent

Go to **Agents** and create a new agent:
- Give it a name (e.g., "Shopping Assistant")
- Set its spending limits
- Copy the API key (starts with `rk_`)

### 5. Connect to Claude Desktop

Add this to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "roony": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-remote@latest", "https://YOUR_ROONY_URL/api/mcp"],
      "env": {
        "API_KEY": "rk_your_agent_api_key_here"
      }
    }
  }
}
```

Replace:
- `YOUR_ROONY_URL` with your deployed Roony URL
- `rk_your_agent_api_key_here` with your agent's API key

### 6. Restart Claude Desktop

Quit and reopen Claude Desktop. You should see a hammer icon (🔨) indicating MCP tools are available.

### 7. Try It Out

Ask Claude:
> "Check my spending budget"

Or:
> "Buy me a $10 item from Amazon"

Claude will use the Roony MCP tools to check your budget and request purchases.

## Available MCP Tools

Roony provides these tools to AI agents:

| Tool | Description |
|------|-------------|
| `check_budget` | Check remaining budget and spending limits |
| `request_purchase` | Request approval for a purchase |
| `list_transactions` | See recent transaction history |
| `get_policy_info` | View spending rules that apply |

## How It Works

1. **Agent requests purchase** → Calls `request_purchase` with amount, merchant, description
2. **Roony checks rules** → Validates against your spending limits and guardrails
3. **If approved** → Returns your card details to complete the purchase
4. **If denied** → Returns the rejection reason (over limit, blocked merchant, etc.)
5. **If needs approval** → Queued for human review in the dashboard

## Self-Hosting

If you prefer to run Roony yourself:

```bash
git clone https://github.com/YOUR_USERNAME/roony-governance
cd roony-governance
npm install

# Create a .env.local file with:
# DATABASE_URL=postgres://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
# NEXTAUTH_SECRET=your-secret-here
# NEXTAUTH_URL=http://localhost:3000

# Push schema to Supabase
npm run db:push

npm run dev
```

**Database**: You'll need a PostgreSQL database. We recommend [Supabase](https://supabase.com) (free tier available).

Then access at `http://localhost:3000`.

## Troubleshooting

### Claude doesn't show the hammer icon
- Make sure the config file path is correct
- Check that the JSON syntax is valid
- Restart Claude Desktop completely

### "Invalid API key" error
- Verify your agent API key is correct
- Make sure the agent status is "active"

### "No card configured" error
- Go to Settings → Alpha Card and add your card details

## Feedback

This is an alpha release. We'd love your feedback:
- What agents are you building?
- What features would help?
- What's confusing?

Open an issue on GitHub or reach out directly.

