/**
 * Simplified Spending Checker
 * 
 * Evaluates purchase requests using agent-level controls and org guardrails.
 * Replaces the complex policy-based evaluation with direct checks.
 */

import { db } from "@/lib/database";
import { 
  agents, 
  organizations, 
  purchaseIntents, 
  knownMerchants,
  pendingApprovals,
  type OrgGuardrails 
} from "@/lib/database/schema";
import { eq, and, gte, sql } from "drizzle-orm";

export interface SpendingCheckRequest {
  agentId: string;
  amount: number;
  currency: string;
  merchantName: string;
  description: string;
}

export interface SpendingCheckResult {
  allowed: boolean;
  requiresApproval: boolean;
  approvalReason?: string;
  rejectionCode?: string;
  rejectionMessage?: string;
}

interface AgentWithOrg {
  agent: {
    id: string;
    organizationId: string;
    monthlyLimit: number | null;
    dailyLimit: number | null;
    perTransactionLimit: number | null;
    approvalThreshold: number | null;
    flagNewVendors: boolean | null;
    blockedMerchants: string | null;
    allowedMerchants: string | null;
  };
  org: {
    id: string;
    monthlyBudget: number | null;
    guardrails: string | null;
  };
}

/**
 * Main spending checker function
 */
export async function checkSpending(request: SpendingCheckRequest): Promise<SpendingCheckResult> {
  // 1. Load agent and org data
  const data = await getAgentWithOrg(request.agentId);
  if (!data) {
    return {
      allowed: false,
      requiresApproval: false,
      rejectionCode: "AGENT_NOT_FOUND",
      rejectionMessage: "Agent not found",
    };
  }

  const { agent, org } = data;
  const guardrails = parseGuardrails(org.guardrails);

  // 2. Check per-transaction limit (agent level)
  if (agent.perTransactionLimit && request.amount > agent.perTransactionLimit) {
    return {
      allowed: false,
      requiresApproval: false,
      rejectionCode: "OVER_TRANSACTION_LIMIT",
      rejectionMessage: `Amount $${request.amount.toFixed(2)} exceeds per-transaction limit of $${agent.perTransactionLimit.toFixed(2)}`,
    };
  }

  // 3. Check org max transaction amount (guardrail)
  if (guardrails.maxTransactionAmount && request.amount > guardrails.maxTransactionAmount) {
    return {
      allowed: false,
      requiresApproval: false,
      rejectionCode: "OVER_ORG_MAX_TRANSACTION",
      rejectionMessage: `Amount $${request.amount.toFixed(2)} exceeds organization maximum of $${guardrails.maxTransactionAmount.toFixed(2)}`,
    };
  }

  // 4. Check agent's daily limit
  if (agent.dailyLimit) {
    const dailySpend = await getAgentSpend(agent.id, "daily");
    if (dailySpend + request.amount > agent.dailyLimit) {
      return {
        allowed: false,
        requiresApproval: false,
        rejectionCode: "DAILY_LIMIT_EXCEEDED",
        rejectionMessage: `Daily spend would exceed limit of $${agent.dailyLimit.toFixed(2)} (current: $${dailySpend.toFixed(2)})`,
      };
    }
  }

  // 5. Check agent's monthly limit
  if (agent.monthlyLimit) {
    const monthlySpend = await getAgentSpend(agent.id, "monthly");
    if (monthlySpend + request.amount > agent.monthlyLimit) {
      return {
        allowed: false,
        requiresApproval: false,
        rejectionCode: "MONTHLY_LIMIT_EXCEEDED",
        rejectionMessage: `Monthly spend would exceed limit of $${agent.monthlyLimit.toFixed(2)} (current: $${monthlySpend.toFixed(2)})`,
      };
    }
  }

  // 6. Check organization's monthly budget
  if (org.monthlyBudget) {
    const orgSpend = await getOrgSpend(org.id, "monthly");
    if (orgSpend + request.amount > org.monthlyBudget) {
      return {
        allowed: false,
        requiresApproval: false,
        rejectionCode: "ORG_BUDGET_EXCEEDED",
        rejectionMessage: `Organization monthly budget of $${org.monthlyBudget.toFixed(2)} would be exceeded (current: $${orgSpend.toFixed(2)})`,
      };
    }
  }

  // 7. Check blocked merchants (agent level)
  const blockedMerchants = parseJsonArray(agent.blockedMerchants);
  if (blockedMerchants.length > 0) {
    const merchantLower = request.merchantName.toLowerCase();
    const isBlocked = blockedMerchants.some(blocked => 
      merchantLower.includes(blocked.toLowerCase())
    );
    if (isBlocked) {
      return {
        allowed: false,
        requiresApproval: false,
        rejectionCode: "MERCHANT_BLOCKED",
        rejectionMessage: `Merchant "${request.merchantName}" is blocked for this agent`,
      };
    }
  }

  // 8. Check allowed merchants (agent level - if set, only these are allowed)
  const allowedMerchants = parseJsonArray(agent.allowedMerchants);
  if (allowedMerchants.length > 0) {
    const merchantLower = request.merchantName.toLowerCase();
    const isAllowed = allowedMerchants.some(allowed => 
      merchantLower.includes(allowed.toLowerCase())
    );
    if (!isAllowed) {
      return {
        allowed: false,
        requiresApproval: false,
        rejectionCode: "MERCHANT_NOT_ALLOWED",
        rejectionMessage: `Merchant "${request.merchantName}" is not in the allowed list`,
      };
    }
  }

  // 9. Check blocked categories (org guardrail)
  if (guardrails.blockCategories && guardrails.blockCategories.length > 0) {
    const merchantLower = request.merchantName.toLowerCase();
    const isBlockedCategory = guardrails.blockCategories.some(cat => 
      merchantLower.includes(cat.toLowerCase())
    );
    if (isBlockedCategory) {
      return {
        allowed: false,
        requiresApproval: false,
        rejectionCode: "CATEGORY_BLOCKED",
        rejectionMessage: `Merchant "${request.merchantName}" matches a blocked category`,
      };
    }
  }

  // --- Approval checks (allowed but needs review) ---

  // 10. Check approval threshold (agent level)
  if (agent.approvalThreshold && request.amount > agent.approvalThreshold) {
    return {
      allowed: true,
      requiresApproval: true,
      approvalReason: `Amount $${request.amount.toFixed(2)} exceeds approval threshold of $${agent.approvalThreshold.toFixed(2)}`,
    };
  }

  // 11. Check org-level approval threshold (guardrail)
  if (guardrails.requireApprovalAbove && request.amount > guardrails.requireApprovalAbove) {
    return {
      allowed: true,
      requiresApproval: true,
      approvalReason: `Amount $${request.amount.toFixed(2)} exceeds organization approval threshold of $${guardrails.requireApprovalAbove.toFixed(2)}`,
    };
  }

  // 12. Check new vendor (agent level)
  if (agent.flagNewVendors) {
    const isNew = await isNewVendor(org.id, request.merchantName);
    if (isNew) {
      return {
        allowed: true,
        requiresApproval: true,
        approvalReason: `First purchase from new vendor "${request.merchantName}"`,
      };
    }
  }

  // 13. Check org-level new vendor flagging (guardrail)
  if (guardrails.flagAllNewVendors) {
    const isNew = await isNewVendor(org.id, request.merchantName);
    if (isNew) {
      return {
        allowed: true,
        requiresApproval: true,
        approvalReason: `First purchase from new vendor "${request.merchantName}" (org policy)`,
      };
    }
  }

  // All checks passed - approved
  return {
    allowed: true,
    requiresApproval: false,
  };
}

/**
 * Get agent with organization data
 */
async function getAgentWithOrg(agentId: string): Promise<AgentWithOrg | null> {
  const result = await db
    .select({
      agent: {
        id: agents.id,
        organizationId: agents.organizationId,
        monthlyLimit: agents.monthlyLimit,
        dailyLimit: agents.dailyLimit,
        perTransactionLimit: agents.perTransactionLimit,
        approvalThreshold: agents.approvalThreshold,
        flagNewVendors: agents.flagNewVendors,
        blockedMerchants: agents.blockedMerchants,
        allowedMerchants: agents.allowedMerchants,
      },
      org: {
        id: organizations.id,
        monthlyBudget: organizations.monthlyBudget,
        guardrails: organizations.guardrails,
      },
    })
    .from(agents)
    .innerJoin(organizations, eq(agents.organizationId, organizations.id))
    .where(eq(agents.id, agentId))
    .limit(1);

  return result[0] || null;
}

/**
 * Get agent spend for a period
 */
async function getAgentSpend(agentId: string, period: "daily" | "monthly"): Promise<number> {
  const now = new Date();
  let periodStart: Date;

  if (period === "daily") {
    periodStart = new Date(now);
    periodStart.setHours(0, 0, 0, 0);
  } else {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${purchaseIntents.amount}), 0)`,
    })
    .from(purchaseIntents)
    .where(
      and(
        eq(purchaseIntents.agentId, agentId),
        eq(purchaseIntents.status, "approved"),
        gte(purchaseIntents.createdAt, periodStart)
      )
    );

  return result[0]?.total || 0;
}

/**
 * Get organization spend for a period
 */
async function getOrgSpend(orgId: string, period: "daily" | "monthly"): Promise<number> {
  const now = new Date();
  let periodStart: Date;

  if (period === "daily") {
    periodStart = new Date(now);
    periodStart.setHours(0, 0, 0, 0);
  } else {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${purchaseIntents.amount}), 0)`,
    })
    .from(purchaseIntents)
    .where(
      and(
        eq(purchaseIntents.organizationId, orgId),
        eq(purchaseIntents.status, "approved"),
        gte(purchaseIntents.createdAt, periodStart)
      )
    );

  return result[0]?.total || 0;
}

/**
 * Check if merchant is new to the organization
 */
async function isNewVendor(orgId: string, merchantName: string): Promise<boolean> {
  const normalized = merchantName.toLowerCase().trim();
  
  const existing = await db
    .select()
    .from(knownMerchants)
    .where(
      and(
        eq(knownMerchants.organizationId, orgId),
        eq(knownMerchants.merchantNameNormalized, normalized)
      )
    )
    .limit(1);

  return existing.length === 0;
}

/**
 * Record a merchant as known (call after successful transaction)
 */
export async function recordMerchant(orgId: string, merchantName: string): Promise<void> {
  const normalized = merchantName.toLowerCase().trim();
  
  const existing = await db
    .select()
    .from(knownMerchants)
    .where(
      and(
        eq(knownMerchants.organizationId, orgId),
        eq(knownMerchants.merchantNameNormalized, normalized)
      )
    )
    .limit(1);

  if (existing.length === 0) {
    await db.insert(knownMerchants).values({
      organizationId: orgId,
      merchantName,
      merchantNameNormalized: normalized,
      transactionCount: 1,
    });
  } else {
    await db
      .update(knownMerchants)
      .set({
        lastSeenAt: new Date(),
        transactionCount: existing[0].transactionCount + 1,
      })
      .where(eq(knownMerchants.id, existing[0].id));
  }
}

/**
 * Create a pending approval record
 */
export async function createPendingApproval(
  purchaseIntentId: string,
  orgId: string,
  agentId: string,
  amount: number,
  merchantName: string,
  reason: string
): Promise<string> {
  const result = await db
    .insert(pendingApprovals)
    .values({
      purchaseIntentId,
      organizationId: orgId,
      agentId,
      amount,
      merchantName,
      reason,
      reasonDetails: reason,
      status: "pending",
    })
    .returning({ id: pendingApprovals.id });

  return result[0].id;
}

/**
 * Get budget utilization for dashboard
 */
export async function getBudgetUtilization(orgId: string): Promise<{
  orgBudget: number | null;
  orgSpent: number;
  orgRemaining: number | null;
  percentUsed: number | null;
  alertThreshold: number;
  isOverThreshold: boolean;
}> {
  const org = await db
    .select({
      monthlyBudget: organizations.monthlyBudget,
      alertThreshold: organizations.alertThreshold,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  const orgData = org[0];
  const spent = await getOrgSpend(orgId, "monthly");
  
  const budget = orgData?.monthlyBudget || null;
  const threshold = orgData?.alertThreshold || 0.8;
  const percentUsed = budget ? (spent / budget) * 100 : null;
  
  return {
    orgBudget: budget,
    orgSpent: spent,
    orgRemaining: budget ? budget - spent : null,
    percentUsed,
    alertThreshold: threshold * 100,
    isOverThreshold: percentUsed !== null && percentUsed >= threshold * 100,
  };
}

// Helper functions
function parseGuardrails(json: string | null): OrgGuardrails {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function parseJsonArray(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

