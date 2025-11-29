import { MCPToolResult } from "./types";
import { db } from "@/lib/database";
import { policies, purchaseIntents, virtualCards } from "@/lib/database/schema";
import { eq, and, desc } from "drizzle-orm";
import { PolicyEvaluator } from "@/lib/policy-engine/evaluator";
import { getAgentSpend } from "@/lib/budget/tracker";

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
 * Evaluates the purchase against policies and returns a virtual card if approved
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

  // Create purchase request
  const purchaseRequest = {
    agentId,
    amount: amount as number,
    currency: currency as string,
    description: description as string,
    merchant: {
      name: merchant_name as string,
      url: merchant_url as string | undefined,
    },
    metadata: project_id ? { project_id: project_id as string } : undefined,
  };

  // Evaluate against policies using the PolicyEvaluator class
  const evaluator = new PolicyEvaluator();
  const evaluation = await evaluator.evaluate(purchaseRequest, agentId, organizationId);

  if (evaluation.status !== "approved") {
    // Log the blocked attempt
    const intentId = crypto.randomUUID();
    await db.insert(purchaseIntents).values({
      id: intentId,
      organizationId,
      agentId,
      amount: amount as number,
      currency: currency as string,
      description: description as string,
      merchantName: merchant_name as string,
      merchantUrl: (merchant_url as string) || null,
      status: "rejected",
      rejectionCode: evaluation.reasonCode || "POLICY_REJECTED",
      rejectionReason: evaluation.reasonMessage,
    });

    return jsonResult({
      status: "rejected",
      reason_code: evaluation.reasonCode,
      message: evaluation.reasonMessage,
      suggestion: getSuggestion(evaluation.reasonCode),
    });
  }

  // Create purchase intent record
  const intentId = crypto.randomUUID();
  await db.insert(purchaseIntents).values({
    id: intentId,
    organizationId,
    agentId,
    amount: amount as number,
    currency: currency as string,
    description: description as string,
    merchantName: merchant_name as string,
    merchantUrl: (merchant_url as string) || null,
    status: "approved",
  });

  // In production, this would call Stripe Issuing to create a real card
  // For now, return mock card details
  const mockCard = {
    card_id: `card_${crypto.randomUUID().slice(0, 8)}`,
    number: "4242424242424242",
    exp_month: 12,
    exp_year: new Date().getFullYear() + 1,
    cvc: String(Math.floor(Math.random() * 900) + 100),
    billing_zip: "10001",
  };

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Record the virtual card
  await db.insert(virtualCards).values({
    id: crypto.randomUUID(),
    purchaseIntentId: intentId,
    stripeCardId: mockCard.card_id,
    last4: "4242",
    expMonth: mockCard.exp_month,
    expYear: mockCard.exp_year,
    hardLimit: amount as number,
    currency: currency as string,
    status: "active",
    expiresAt,
  });

  return jsonResult({
    status: "approved",
    card: mockCard,
    hard_limit_amount: amount,
    currency: currency,
    expires_at: expiresAt.toISOString(),
    purchase_intent_id: intentId,
    message: `Purchase approved. Use this card to complete your purchase of ${description}.`,
  });
}

/**
 * Execute check_budget tool
 * Returns budget information for the agent
 */
export async function executeCheckBudget(
  agentId: string,
  organizationId: string,
  args: Record<string, unknown>
): Promise<MCPToolResult> {
  const period = (args.period as string) || "all";

  // Get agent's policies
  const agentPolicies = await db
    .select()
    .from(policies)
    .where(and(
      eq(policies.organizationId, organizationId),
      eq(policies.enabled, true)
    ));

  // Calculate limits from policies
  const limits = {
    perTransaction: Infinity,
    daily: Infinity,
    weekly: Infinity,
    monthly: Infinity,
  };

  for (const policy of agentPolicies) {
    const rules = JSON.parse(policy.rules as string) as { budget?: { perTransactionLimit?: number; dailyLimit?: number; weeklyLimit?: number; monthlyLimit?: number } };
    if (rules.budget) {
      if (rules.budget.perTransactionLimit) {
        limits.perTransaction = Math.min(limits.perTransaction, rules.budget.perTransactionLimit);
      }
      if (rules.budget.dailyLimit) {
        limits.daily = Math.min(limits.daily, rules.budget.dailyLimit);
      }
      if (rules.budget.weeklyLimit) {
        limits.weekly = Math.min(limits.weekly, rules.budget.weeklyLimit);
      }
      if (rules.budget.monthlyLimit) {
        limits.monthly = Math.min(limits.monthly, rules.budget.monthlyLimit);
      }
    }
  }

  // Get current spend
  const spend = await getAgentSpend(agentId, organizationId);
  const currentSpend = {
    daily: spend.dailySpent,
    weekly: spend.weeklySpent,
    monthly: spend.monthlySpent,
    lifetime: spend.lifetimeSpent,
  };

  const budgetInfo = {
    agent_id: agentId,
    currency: "usd",
    limits: {
      per_transaction: limits.perTransaction === Infinity ? "unlimited" : limits.perTransaction,
      daily: limits.daily === Infinity ? "unlimited" : limits.daily,
      weekly: limits.weekly === Infinity ? "unlimited" : limits.weekly,
      monthly: limits.monthly === Infinity ? "unlimited" : limits.monthly,
    },
    current_spend: currentSpend,
    remaining: {
      daily: limits.daily === Infinity ? "unlimited" : Math.max(0, limits.daily - currentSpend.daily),
      weekly: limits.weekly === Infinity ? "unlimited" : Math.max(0, limits.weekly - currentSpend.weekly),
      monthly: limits.monthly === Infinity ? "unlimited" : Math.max(0, limits.monthly - currentSpend.monthly),
    },
  };

  if (period !== "all") {
    // Return only the requested period
    const periodKey = period as keyof typeof budgetInfo.limits;
    return jsonResult({
      agent_id: agentId,
      period,
      limit: budgetInfo.limits[periodKey],
      spent: budgetInfo.current_spend[period as keyof typeof budgetInfo.current_spend],
      remaining: budgetInfo.remaining[period as keyof typeof budgetInfo.remaining],
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
 * Returns policy information for the agent
 */
export async function executeGetPolicyInfo(
  agentId: string,
  organizationId: string
): Promise<MCPToolResult> {
  const agentPolicies = await db
    .select()
    .from(policies)
    .where(and(
      eq(policies.organizationId, organizationId),
      eq(policies.enabled, true)
    ))
    .orderBy(policies.priority);

  const policyInfo = agentPolicies.map(p => {
    const rules = JSON.parse(p.rules as string) as {
      budget?: { perTransactionLimit?: number; dailyLimit?: number; weeklyLimit?: number; monthlyLimit?: number };
      merchant?: { allowlist?: string[]; blocklist?: string[] };
      time?: { allowedHours?: { start: number; end: number }; allowedDays?: number[] };
    };

    return {
      name: p.name,
      description: p.description,
      scope: p.scopeType,
      rules: {
        budget_limits: rules.budget ? {
          per_transaction: rules.budget.perTransactionLimit || "unlimited",
          daily: rules.budget.dailyLimit || "unlimited",
          weekly: rules.budget.weeklyLimit || "unlimited",
          monthly: rules.budget.monthlyLimit || "unlimited",
        } : "none",
        merchant_restrictions: rules.merchant ? {
          allowed: rules.merchant.allowlist?.length ? rules.merchant.allowlist : "any",
          blocked: rules.merchant.blocklist?.length ? rules.merchant.blocklist : "none",
        } : "none",
        time_restrictions: rules.time ? {
          allowed_hours: rules.time.allowedHours || "any",
          allowed_days: rules.time.allowedDays || "any",
        } : "none",
      },
    };
  });

  return jsonResult({
    agent_id: agentId,
    policies: policyInfo,
    summary: policyInfo.length === 0 
      ? "No policies configured. All purchases will be evaluated against default limits."
      : `${policyInfo.length} active ${policyInfo.length === 1 ? 'policy' : 'policies'} apply to your purchases.`,
  });
}

// Get helpful suggestion based on rejection reason
function getSuggestion(reasonCode?: string): string {
  switch (reasonCode) {
    case "AMOUNT_TOO_HIGH":
      return "Try a smaller purchase amount or request a limit increase from your administrator.";
    case "DAILY_LIMIT_EXCEEDED":
      return "Your daily spending limit has been reached. Try again tomorrow or request a limit increase.";
    case "WEEKLY_LIMIT_EXCEEDED":
      return "Your weekly spending limit has been reached. Try again next week or request a limit increase.";
    case "MONTHLY_LIMIT_EXCEEDED":
      return "Your monthly spending limit has been reached. Try again next month or request a limit increase.";
    case "MERCHANT_NOT_ALLOWED":
      return "This merchant is not on the approved list. Contact your administrator to add it.";
    case "MERCHANT_BLOCKED":
      return "This merchant has been blocked by policy. Use an alternative merchant.";
    case "TIME_RESTRICTED":
      return "Purchases are only allowed during business hours. Try again during allowed times.";
    case "NO_POLICY":
      return "No spending policy has been configured. Contact your administrator.";
    default:
      return "Contact your administrator for assistance.";
  }
}
