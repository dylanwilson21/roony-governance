import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getBudgetUtilization } from "@/lib/spending/checker";
import { db } from "@/lib/database";
import { pendingApprovals } from "@/lib/database/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/internal/budget
 * Get budget utilization info for the dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const budgetInfo = await getBudgetUtilization(session.user.organizationId);

    // Get pending approvals count
    const pending = await db
      .select()
      .from(pendingApprovals)
      .where(
        and(
          eq(pendingApprovals.organizationId, session.user.organizationId),
          eq(pendingApprovals.status, "pending")
        )
      );

    return NextResponse.json({
      ...budgetInfo,
      pendingApprovals: pending.length,
    });
  } catch (error) {
    console.error("Error fetching budget:", error);
    return NextResponse.json(
      { error: "Failed to fetch budget info" },
      { status: 500 }
    );
  }
}

