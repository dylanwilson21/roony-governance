import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/database";
import { purchaseIntents, agents, policies } from "@/lib/database/schema";
import { eq, and, gte, count, sql, desc } from "drizzle-orm";

/**
 * GET /api/internal/analytics
 * Get analytics data for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.user.organizationId;

    // Get total spend (approved transactions)
    const approvedTransactions = await db
      .select({
        amount: purchaseIntents.amount,
      })
      .from(purchaseIntents)
      .where(
        and(
          eq(purchaseIntents.organizationId, orgId),
          eq(purchaseIntents.status, "approved")
        )
      );

    const totalSpend = approvedTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    // Get active agents count
    const activeAgentsResult = await db
      .select({ count: count() })
      .from(agents)
      .where(
        and(
          eq(agents.organizationId, orgId),
          eq(agents.status, "active")
        )
      );

    // Get today's transactions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayTransactionsResult = await db
      .select({ count: count() })
      .from(purchaseIntents)
      .where(
        and(
          eq(purchaseIntents.organizationId, orgId),
          gte(purchaseIntents.createdAt, today)
        )
      );

    // Get blocked attempts count
    const blockedAttemptsResult = await db
      .select({ count: count() })
      .from(purchaseIntents)
      .where(
        and(
          eq(purchaseIntents.organizationId, orgId),
          eq(purchaseIntents.status, "rejected")
        )
      );

    // Get total policies count
    const policiesResult = await db
      .select({ count: count() })
      .from(policies)
      .where(eq(policies.organizationId, orgId));

    // Get monthly spend data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const monthlyTransactions = await db
      .select({
        amount: purchaseIntents.amount,
        createdAt: purchaseIntents.createdAt,
      })
      .from(purchaseIntents)
      .where(
        and(
          eq(purchaseIntents.organizationId, orgId),
          eq(purchaseIntents.status, "approved"),
          gte(purchaseIntents.createdAt, thirtyDaysAgo)
        )
      );

    // Get spend by agent
    const spendByAgent = await db
      .select({
        agentId: purchaseIntents.agentId,
        agentName: agents.name,
        totalSpend: sql<number>`SUM(${purchaseIntents.amount})`.as('total_spend'),
      })
      .from(purchaseIntents)
      .leftJoin(agents, eq(purchaseIntents.agentId, agents.id))
      .where(
        and(
          eq(purchaseIntents.organizationId, orgId),
          eq(purchaseIntents.status, "approved")
        )
      )
      .groupBy(purchaseIntents.agentId, agents.name);

    return NextResponse.json({
      totalSpend,
      activeAgents: activeAgentsResult[0]?.count || 0,
      todayTransactions: todayTransactionsResult[0]?.count || 0,
      blockedAttempts: blockedAttemptsResult[0]?.count || 0,
      totalPolicies: policiesResult[0]?.count || 0,
      monthlySpend: monthlyTransactions.reduce((sum, tx) => sum + tx.amount, 0),
      spendByAgent: spendByAgent.map(s => ({
        agentId: s.agentId,
        agentName: s.agentName || "Unknown",
        totalSpend: s.totalSpend || 0,
      })),
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
