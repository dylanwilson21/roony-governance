import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/database";
import { pendingApprovals, agents, purchaseIntents } from "@/lib/database/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * GET /api/internal/approvals
 * List pending approvals for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    const approvals = await db
      .select({
        id: pendingApprovals.id,
        purchaseIntentId: pendingApprovals.purchaseIntentId,
        agentId: pendingApprovals.agentId,
        agentName: agents.name,
        amount: pendingApprovals.amount,
        merchantName: pendingApprovals.merchantName,
        reason: pendingApprovals.reason,
        reasonDetails: pendingApprovals.reasonDetails,
        status: pendingApprovals.status,
        reviewedBy: pendingApprovals.reviewedBy,
        reviewedAt: pendingApprovals.reviewedAt,
        reviewNotes: pendingApprovals.reviewNotes,
        createdAt: pendingApprovals.createdAt,
        // Purchase intent details
        description: purchaseIntents.description,
        currency: purchaseIntents.currency,
      })
      .from(pendingApprovals)
      .leftJoin(agents, eq(pendingApprovals.agentId, agents.id))
      .leftJoin(purchaseIntents, eq(pendingApprovals.purchaseIntentId, purchaseIntents.id))
      .where(
        and(
          eq(pendingApprovals.organizationId, session.user.organizationId),
          status !== "all" ? eq(pendingApprovals.status, status as "pending" | "approved" | "rejected") : undefined
        )
      )
      .orderBy(desc(pendingApprovals.createdAt));

    // Count by status
    const allApprovals = await db
      .select({ status: pendingApprovals.status })
      .from(pendingApprovals)
      .where(eq(pendingApprovals.organizationId, session.user.organizationId));

    const counts = {
      pending: allApprovals.filter(a => a.status === "pending").length,
      approved: allApprovals.filter(a => a.status === "approved").length,
      rejected: allApprovals.filter(a => a.status === "rejected").length,
    };

    return NextResponse.json({ approvals, counts });
  } catch (error) {
    console.error("Error fetching approvals:", error);
    return NextResponse.json(
      { error: "Failed to fetch approvals" },
      { status: 500 }
    );
  }
}

