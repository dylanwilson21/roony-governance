import { db } from "@/lib/database";
import { budgetTracking, purchaseIntents } from "@/lib/database/schema";
import { eq, and, gte, sql } from "drizzle-orm";

export interface BudgetInfo {
  dailySpent: number;
  weeklySpent: number;
  monthlySpent: number;
  lifetimeSpent: number;
}

/**
 * Get current spend for an agent across different time periods
 */
export async function getAgentSpend(
  agentId: string,
  organizationId: string
): Promise<BudgetInfo> {
  const now = new Date();
  
  // Calculate period starts
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get all approved transactions for this agent
  const transactions = await db
    .select({
      amount: purchaseIntents.amount,
      createdAt: purchaseIntents.createdAt,
    })
    .from(purchaseIntents)
    .where(
      and(
        eq(purchaseIntents.agentId, agentId),
        eq(purchaseIntents.organizationId, organizationId),
        eq(purchaseIntents.status, "approved")
      )
    );

  let dailySpent = 0;
  let weeklySpent = 0;
  let monthlySpent = 0;
  let lifetimeSpent = 0;

  for (const tx of transactions) {
    const txDate = new Date(tx.createdAt);
    const amount = tx.amount;

    lifetimeSpent += amount;

    if (txDate >= monthStart) {
      monthlySpent += amount;
    }

    if (txDate >= weekStart) {
      weeklySpent += amount;
    }

    if (txDate >= dayStart) {
      dailySpent += amount;
    }
  }

  return {
    dailySpent,
    weeklySpent,
    monthlySpent,
    lifetimeSpent,
  };
}

/**
 * Get organization-wide spend
 */
export async function getOrganizationSpend(
  organizationId: string
): Promise<BudgetInfo> {
  const now = new Date();
  
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const transactions = await db
    .select({
      amount: purchaseIntents.amount,
      createdAt: purchaseIntents.createdAt,
    })
    .from(purchaseIntents)
    .where(
      and(
        eq(purchaseIntents.organizationId, organizationId),
        eq(purchaseIntents.status, "approved")
      )
    );

  let dailySpent = 0;
  let weeklySpent = 0;
  let monthlySpent = 0;
  let lifetimeSpent = 0;

  for (const tx of transactions) {
    const txDate = new Date(tx.createdAt);
    const amount = tx.amount;

    lifetimeSpent += amount;

    if (txDate >= monthStart) {
      monthlySpent += amount;
    }

    if (txDate >= weekStart) {
      weeklySpent += amount;
    }

    if (txDate >= dayStart) {
      dailySpent += amount;
    }
  }

  return {
    dailySpent,
    weeklySpent,
    monthlySpent,
    lifetimeSpent,
  };
}

/**
 * Check if a new transaction would exceed budget limits
 */
export async function checkBudgetLimits(
  agentId: string,
  organizationId: string,
  amount: number,
  limits: {
    perTransactionLimit?: number;
    dailyLimit?: number;
    weeklyLimit?: number;
    monthlyLimit?: number;
    lifetimeLimit?: number;
  }
): Promise<{ allowed: boolean; reasonCode?: string; message?: string }> {
  // Check per-transaction limit
  if (limits.perTransactionLimit && amount > limits.perTransactionLimit) {
    return {
      allowed: false,
      reasonCode: "AMOUNT_TOO_HIGH",
      message: `Transaction amount $${amount.toFixed(2)} exceeds per-transaction limit of $${limits.perTransactionLimit.toFixed(2)}`,
    };
  }

  // Get current spend
  const spend = await getAgentSpend(agentId, organizationId);

  // Check daily limit
  if (limits.dailyLimit && spend.dailySpent + amount > limits.dailyLimit) {
    return {
      allowed: false,
      reasonCode: "DAILY_LIMIT_EXCEEDED",
      message: `Daily spend would exceed limit of $${limits.dailyLimit.toFixed(2)} (current: $${spend.dailySpent.toFixed(2)})`,
    };
  }

  // Check weekly limit
  if (limits.weeklyLimit && spend.weeklySpent + amount > limits.weeklyLimit) {
    return {
      allowed: false,
      reasonCode: "WEEKLY_LIMIT_EXCEEDED",
      message: `Weekly spend would exceed limit of $${limits.weeklyLimit.toFixed(2)} (current: $${spend.weeklySpent.toFixed(2)})`,
    };
  }

  // Check monthly limit
  if (limits.monthlyLimit && spend.monthlySpent + amount > limits.monthlyLimit) {
    return {
      allowed: false,
      reasonCode: "MONTHLY_LIMIT_EXCEEDED",
      message: `Monthly spend would exceed limit of $${limits.monthlyLimit.toFixed(2)} (current: $${spend.monthlySpent.toFixed(2)})`,
    };
  }

  // Check lifetime limit
  if (limits.lifetimeLimit && spend.lifetimeSpent + amount > limits.lifetimeLimit) {
    return {
      allowed: false,
      reasonCode: "LIFETIME_LIMIT_EXCEEDED",
      message: `Lifetime spend would exceed limit of $${limits.lifetimeLimit.toFixed(2)} (current: $${spend.lifetimeSpent.toFixed(2)})`,
    };
  }

  return { allowed: true };
}

