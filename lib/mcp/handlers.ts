import { MCPToolResult } from "./types";
import { db } from "@/lib/database";
import { purchaseIntents, virtualCards, agents, organizations } from "@/lib/database/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { checkSpending, createPendingApproval, recordMerchant, getBudgetUtilization } from "@/lib/spending/checker";

// Helper to create text result
function textResult(text: string, isError = false): MCPToolResult {
  return {
    content: [{ type: "text", text }],
    isError,
  };
}

// Helper to create JSON result
function jsonResult(data: unknown, isError = false): MCPToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    isError,
  };
}

/**
 * Execute request_purchase tool
 * Evaluates the purchase against agent controls and org guardrails
 */
export async function executeRequestPurchase(
  agentId: string,
  organizationId: string,
  args: Record<string, unknown>
): Promise<MCPToolResult> {
  const { amount, currency, description, merchant_name, merchant_url, project_id } = args;

  // Validate required args
  if (typeof amount !== "number" || amount <= 0) {
    return textResult("Error: 'amount' must be a positive number", true);
  }
  if (typeof currency !== "string") {
    return textResult("Error: 'currency' is required", true);
  }
  if (typeof description !== "string") {
    return textResult("Error: 'description' is required", true);
  }
  if (typeof merchant_name !== "string") {
    return textResult("Error: 'merchant_name' is required", true);
  }

  // Check spending using simplified agent-level controls
  const checkResult = await checkSpending({
    agentId,
    amount: amount as number,
    currency: currency as string,
    merchantName: merchant_name as string,
    description: description as string,
  });

  // Handle rejection
  if (!checkResult.allowed && !checkResult.requiresApproval) {
    // Log the blocked attempt
    await db.insert(purchaseIntents).values({
      organizationId,
      agentId,
      amount: amount as number,
      currency: currency as string,
      description: description as string,
      merchantName: merchant_name as string,
      merchantUrl: (merchant_url as string) || null,
      metadata: project_id ? JSON.stringify({ project_id }) : null,
      status: "rejected",
      rejectionCode: checkResult.rejectionCode || "POLICY_REJECTED",
      rejectionReason: checkResult.rejectionMessage,
    });

    return jsonResult({
      status: "rejected",
      reason_code: checkResult.rejectionCode,
      message: checkResult.rejectionMessage,
      suggestion: getSuggestion(checkResult.rejectionCode),
    });
  }

  // Handle pending approval
  if (checkResult.requiresApproval) {
    const intent = await db.insert(purchaseIntents).values({
      organizationId,
      agentId,
      amount: amount as number,
      currency: currency as string,
      description: description as string,
      merchantName: merchant_name as string,
      merchantUrl: (merchant_url as string) || null,
      metadata: project_id ? JSON.stringify({ project_id }) : null,
      status: "pending_approval",
    }).returning();

    // Create pending approval record
    const approvalReason = checkResult.approvalReason?.includes("threshold") 
      ? "OVER_THRESHOLD" 
      : checkResult.approvalReason?.includes("vendor") 
        ? "NEW_VENDOR" 
        : "ORG_GUARDRAIL";

    await createPendingApproval(
      intent[0].id,
      organizationId,
      agentId,
      amount as number,
      merchant_name as string,
      approvalReason
    );

    return jsonResult({
      status: "pending_approval",
      message: checkResult.approvalReason || "This purchase requires human approval",
      purchase_intent_id: intent[0].id,
      suggestion: "A human administrator will review this request. You'll be notified of the decision.",
    });
  }

  // Get organization's stored alpha card details
  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const alphaCardDetails = org[0]?.alphaCardDetails 
    ? JSON.parse(org[0].alphaCardDetails) 
    : null;

  if (!alphaCardDetails) {
    return jsonResult({
      status: "rejected",
      reason_code: "NO_CARD",
      message: "No payment card configured. Please add a card in Settings → Alpha Card.",
      suggestion: "Ask an administrator to configure a payment card in the Roony dashboard.",
    });
  }

  // Validate card expiration
  const expMonth = parseInt(alphaCardDetails.exp_month, 10);
  const expYear = parseInt(alphaCardDetails.exp_year, 10);
  
  if (isNaN(expMonth) || expMonth < 1 || expMonth > 12) {
    return jsonResult({
      status: "rejected",
      reason_code: "INVALID_CARD",
      message: "Invalid card expiration month. Must be 1-12.",
      suggestion: "Update your card details in Settings → Alpha Card.",
    });
  }

  if (isNaN(expYear) || expYear < new Date().getFullYear()) {
    return jsonResult({
      status: "rejected",
      reason_code: "INVALID_CARD",
      message: "Invalid or expired card year.",
      suggestion: "Update your card details in Settings → Alpha Card.",
    });
  }

  // Create purchase intent record
  const intent = await db.insert(purchaseIntents).values({
    organizationId,
    agentId,
    amount: amount as number,
    currency: currency as string,
    description: description as string,
    merchantName: merchant_name as string,
    merchantUrl: (merchant_url as string) || null,
    metadata: project_id ? JSON.stringify({ project_id }) : null,
    status: "approved",
  }).returning();

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Record the virtual card (using stored alpha card info)
  await db.insert(virtualCards).values({
    purchaseIntentId: intent[0].id,
    stripeCardId: `alpha_${intent[0].id.slice(0, 8)}`,
    last4: alphaCardDetails.number?.slice(-4) || "****",
    expMonth,
    expYear,
    hardLimit: amount as number,
    currency: currency as string,
    status: "active",
    expiresAt,
  });

  // Record merchant as known for future new vendor checks
  await recordMerchant(organizationId, merchant_name as string);

  return jsonResult({
    status: "approved",
    card: {
      number: alphaCardDetails.number,
      exp_month: alphaCardDetails.exp_month,
      exp_year: alphaCardDetails.exp_year,
      cvc: alphaCardDetails.cvc,
    },
    approved_amount: amount,
    currency: currency,
    expires_at: expiresAt.toISOString(),
    purchase_intent_id: intent[0].id,
    message: `Purchase approved. Use this card to complete your purchase of ${description}.`,
  });
}

/**
 * Execute check_budget tool
 * Returns budget information for the agent using simplified controls
 */
export async function executeCheckBudget(
  agentId: string,
  organizationId: string,
  args: Record<string, unknown>
): Promise<MCPToolResult> {
  const period = (args.period as string) || "all";

  // Get agent's limits
  const agent = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  if (agent.length === 0) {
    return textResult("Error: Agent not found", true);
  }

  const agentData = agent[0];

  // Get current spend by querying purchase intents
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const dailySpendResult = await db
    .select({ total: sql<number>`COALESCE(SUM(${purchaseIntents.amount}), 0)` })
    .from(purchaseIntents)
    .where(and(
      eq(purchaseIntents.agentId, agentId),
      eq(purchaseIntents.status, "approved"),
      gte(purchaseIntents.createdAt, dayStart)
    ));

  const monthlySpendResult = await db
    .select({ total: sql<number>`COALESCE(SUM(${purchaseIntents.amount}), 0)` })
    .from(purchaseIntents)
    .where(and(
      eq(purchaseIntents.agentId, agentId),
      eq(purchaseIntents.status, "approved"),
      gte(purchaseIntents.createdAt, monthStart)
    ));

  const dailySpent = dailySpendResult[0]?.total || 0;
  const monthlySpent = monthlySpendResult[0]?.total || 0;

  // Get org budget info
  const orgBudget = await getBudgetUtilization(organizationId);

  const limits = {
    per_transaction: agentData.perTransactionLimit || "unlimited",
    daily: agentData.dailyLimit || "unlimited",
    monthly: agentData.monthlyLimit || "unlimited",
  };

  const currentSpend = {
    daily: dailySpent,
    monthly: monthlySpent,
  };

  const remaining = {
    daily: agentData.dailyLimit ? Math.max(0, agentData.dailyLimit - dailySpent) : "unlimited",
    monthly: agentData.monthlyLimit ? Math.max(0, agentData.monthlyLimit - monthlySpent) : "unlimited",
  };

  const budgetInfo = {
    agent_id: agentId,
    agent_name: agentData.name,
    currency: "usd",
    limits,
    current_spend: currentSpend,
    remaining,
    organization: {
      monthly_budget: orgBudget.orgBudget || "unlimited",
      org_spent: orgBudget.orgSpent,
      org_remaining: orgBudget.orgRemaining || "unlimited",
      percent_used: orgBudget.percentUsed?.toFixed(1) + "%" || "N/A",
    },
    controls: {
      approval_threshold: agentData.approvalThreshold || "none",
      flag_new_vendors: agentData.flagNewVendors || false,
      has_merchant_restrictions: !!(agentData.blockedMerchants || agentData.allowedMerchants),
    },
  };

  if (period !== "all" && period in currentSpend) {
    const periodKey = period as keyof typeof currentSpend;
    return jsonResult({
      agent_id: agentId,
      period,
      limit: limits[periodKey as keyof typeof limits],
      spent: currentSpend[periodKey],
      remaining: remaining[periodKey],
    });
  }

  return jsonResult(budgetInfo);
}

/**
 * Execute list_transactions tool
 * Returns recent transactions for the agent
 */
export async function executeListTransactions(
  agentId: string,
  organizationId: string,
  args: Record<string, unknown>
): Promise<MCPToolResult> {
  const limit = Math.min(Math.max(1, (args.limit as number) || 10), 50);
  const statusFilter = (args.status as string) || "all";

  const transactions = await db
    .select({
      id: purchaseIntents.id,
      amount: purchaseIntents.amount,
      currency: purchaseIntents.currency,
      description: purchaseIntents.description,
      merchantName: purchaseIntents.merchantName,
      status: purchaseIntents.status,
      rejectionCode: purchaseIntents.rejectionCode,
      rejectionReason: purchaseIntents.rejectionReason,
      createdAt: purchaseIntents.createdAt,
    })
    .from(purchaseIntents)
    .where(and(
      eq(purchaseIntents.organizationId, organizationId),
      eq(purchaseIntents.agentId, agentId)
    ))
    .orderBy(desc(purchaseIntents.createdAt))
    .limit(limit);

  // Filter by status if needed
  const filtered = statusFilter === "all" 
    ? transactions 
    : transactions.filter(t => t.status === statusFilter);

  return jsonResult({
    agent_id: agentId,
    count: filtered.length,
    transactions: filtered.map(t => ({
      id: t.id,
      amount: t.amount,
      currency: t.currency,
      description: t.description,
      merchant: t.merchantName,
      status: t.status,
      rejection_reason: t.rejectionCode ? {
        code: t.rejectionCode,
        message: t.rejectionReason,
      } : null,
      timestamp: t.createdAt?.toISOString(),
    })),
  });
}

/**
 * Execute get_policy_info tool
 * Returns spending controls information for the agent
 */
export async function executeGetPolicyInfo(
  agentId: string,
  organizationId: string
): Promise<MCPToolResult> {
  // Get agent controls
  const agent = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  if (agent.length === 0) {
    return textResult("Error: Agent not found", true);
  }

  // Get org guardrails
  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const agentData = agent[0];
  const orgData = org[0];
  const guardrails = orgData?.guardrails ? JSON.parse(orgData.guardrails) : {};

  const policyInfo = {
    agent_id: agentId,
    agent_name: agentData.name,
    agent_controls: {
      spending_limits: {
        per_transaction: agentData.perTransactionLimit || "unlimited",
        daily: agentData.dailyLimit || "unlimited",
        monthly: agentData.monthlyLimit || "unlimited",
      },
      approval_rules: {
        threshold: agentData.approvalThreshold 
          ? `Purchases over $${agentData.approvalThreshold} require human approval`
          : "No approval threshold",
        new_vendors: agentData.flagNewVendors 
          ? "Purchases from new vendors require human approval"
          : "New vendor purchases allowed",
      },
      merchant_restrictions: {
        blocked: agentData.blockedMerchants 
          ? JSON.parse(agentData.blockedMerchants) 
          : "none",
        allowed_only: agentData.allowedMerchants 
          ? JSON.parse(agentData.allowedMerchants) 
          : "any merchant",
      },
    },
    organization_guardrails: {
      monthly_budget: orgData?.monthlyBudget || "unlimited",
      max_transaction: guardrails.maxTransactionAmount || "unlimited",
      require_approval_above: guardrails.requireApprovalAbove || "none",
      flag_all_new_vendors: guardrails.flagAllNewVendors || false,
      blocked_categories: guardrails.blockCategories?.length 
        ? guardrails.blockCategories 
        : "none",
    },
    summary: getSummary(agentData, guardrails),
  };

  return jsonResult(policyInfo);
}

// Generate a human-readable summary
function getSummary(agent: typeof agents.$inferSelect, guardrails: Record<string, unknown>): string {
  const parts = [];
  
  if (agent.monthlyLimit) {
    parts.push(`You have a monthly budget of $${agent.monthlyLimit}`);
  }
  if (agent.perTransactionLimit) {
    parts.push(`max $${agent.perTransactionLimit} per transaction`);
  }
  if (agent.approvalThreshold) {
    parts.push(`purchases over $${agent.approvalThreshold} need approval`);
  }
  if (agent.flagNewVendors) {
    parts.push(`new vendors require approval`);
  }
  
  if (parts.length === 0) {
    return "No specific limits set. Organization guardrails still apply.";
  }
  
  return parts.join(", ") + ".";
}

// Get helpful suggestion based on rejection reason
function getSuggestion(reasonCode?: string): string {
  switch (reasonCode) {
    case "OVER_TRANSACTION_LIMIT":
      return "Try a smaller purchase amount or request a limit increase from your administrator.";
    case "DAILY_LIMIT_EXCEEDED":
      return "Your daily spending limit has been reached. Try again tomorrow or request a limit increase.";
    case "MONTHLY_LIMIT_EXCEEDED":
      return "Your monthly spending limit has been reached. Try again next month or request a limit increase.";
    case "ORG_BUDGET_EXCEEDED":
      return "The organization's monthly budget has been reached. Contact your administrator.";
    case "OVER_ORG_MAX_TRANSACTION":
      return "This amount exceeds the organization's maximum transaction limit.";
    case "MERCHANT_NOT_ALLOWED":
      return "This merchant is not on the approved list. Contact your administrator to add it.";
    case "MERCHANT_BLOCKED":
      return "This merchant has been blocked. Use an alternative merchant.";
    case "CATEGORY_BLOCKED":
      return "This merchant category is blocked by organization policy.";
    case "AGENT_NOT_FOUND":
      return "Unable to identify the agent. Check your API key configuration.";
    default:
      return "Contact your administrator for assistance.";
  }
}