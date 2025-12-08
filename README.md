# Roony

A spending firewall for AI agents. Set limits, and your agent gets a card only when purchases are approved.

## ⚠️ Alpha Warning

This is an early alpha. Card details are stored and returned to agents when approved. **Use a virtual card** (Privacy.com, Revolut, etc.) with its own spending limits.

## How It Works

1. You add a card and set spending limits
2. Your AI agent requests a purchase via MCP
3. Roony checks the request against your limits
4. If approved → agent gets the card to complete purchase
5. If denied → agent gets the rejection reason

## Quick Start

```bash
git clone https://github.com/dylanwilson21/roony-governance.git
cd roony-governance
npm install
npm run db:push
npm run dev
```

Open http://localhost:3000 and:

1. Create an account
2. **Settings → Alpha Card** → Add your virtual card
3. **Settings → Spending Guardrails** → Set your limits
4. **Agents** → Create an agent → Copy the API key

## Connect to Claude Desktop

Add to your Claude config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "roony": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-remote@latest", "https://YOUR_URL/api/mcp"],
      "env": {
        "API_KEY": "rk_your_agent_api_key"
      }
    }
  }
}
```

Restart Claude Desktop. Ask it to check your budget or buy something.

## Spending Controls

**Organization level** (applies to all agents):
- Monthly budget cap
- Max transaction amount
- Require approval above threshold
- Block certain merchants/categories

**Agent level**:
- Monthly/daily/per-transaction limits
- Approval threshold
- Allowed/blocked merchants

## MCP Tools

| Tool | What it does |
|------|--------------|
| `check_budget` | See remaining budget and limits |
| `request_purchase` | Request approval to buy something |
| `list_transactions` | View recent purchases |
| `get_policy_info` | See what rules apply |

## Deploy

Push to GitHub, connect to [Vercel](https://vercel.com), add environment variables:

```
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=https://your-app.vercel.app
```

## Feedback

What agents are you building? What's missing? Open an issue or reach out.

## License

ISC
