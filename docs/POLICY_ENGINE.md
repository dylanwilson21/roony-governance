# Policy Engine (DEPRECATED)

> ⚠️ **DEPRECATED**: This document describes the old policy-based system. As of November 2025, Roony uses a simplified governance model where spending controls live directly on agents and organizations.
>
> **See [SPENDING_CONTROLS.md](SPENDING_CONTROLS.md) for the current documentation.**

---

## What Changed?

The complex policy system was replaced with a simpler 2-level hierarchy:

### Old System (Deprecated)
- Separate `policies` table with complex rule definitions
- Multiple policy types: agent, team, project, org
- JSON-based rule DSL with budget, merchant, MCC, and time rules
- Policy priority system for conflict resolution

### New System
- **Agent controls**: Spending limits directly on each agent
  - Monthly, daily, per-transaction limits
  - Approval threshold
  - New vendor flagging
  - Blocked/allowed merchants
- **Organization guardrails**: Rules that apply to ALL agents
  - Monthly budget
  - Max transaction amount
  - Require approval above threshold
  - Flag all new vendors
  - Blocked categories

## Migration

The `policies` table still exists in the database but is no longer used for evaluation. If you have existing policies, you should:

1. Review each policy's rules
2. Apply equivalent limits directly to agents via the dashboard
3. Set organization-level guardrails in Settings → Spending Guardrails

## Why the Change?

The policy system was:
- Confusing for users (what does "default action" mean?)
- Complex to manage (policy priority, overlapping rules)
- Overkill for most use cases

The new system:
- Uses familiar concepts from corporate expense management
- Controls live where you'd expect them (on the agent)
- Simpler UI with clear form fields
- Human approval queue for purchases that need review

---

*For the current spending controls documentation, see [SPENDING_CONTROLS.md](SPENDING_CONTROLS.md).*
