import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/database";
import { purchaseIntents, agents } from "@/lib/database/schema";
import { eq, sql, and, gte, count } from "drizzle-orm";

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
    const totalSpendResult = await db
      .select({ total: sql<number>`COALESCE(SUM(${purchaseIntents.amount}), 0)` })
      .from(purchaseIntents)
      .where(
        and(
          eq(purchaseIntents.organizationId, orgId),
          eq(purchaseIntents.status, "approved")
        )
      );

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

    return NextResponse.json({
      totalSpend: totalSpendResult[0]?.total || 0,
      activeAgents: activeAgentsResult[0]?.count || 0,
      todayTransactions: todayTransactionsResult[0]?.count || 0,
      blockedAttempts: blockedAttemptsResult[0]?.count || 0,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

