import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/database";
import { pendingApprovals, purchaseIntents } from "@/lib/database/schema";
import { eq, and } from "drizzle-orm";

/**
 * PUT /api/internal/approvals/:id
 * Approve or reject a pending approval
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, notes } = body;

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    // Get the pending approval
    const existing = await db
      .select()
      .from(pendingApprovals)
      .where(
        and(
          eq(pendingApprovals.id, id),
          eq(pendingApprovals.organizationId, session.user.organizationId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Approval not found" }, { status: 404 });
    }

    if (existing[0].status !== "pending") {
      return NextResponse.json(
        { error: "This approval has already been processed" },
        { status: 400 }
      );
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    // Update the pending approval
    const updated = await db
      .update(pendingApprovals)
      .set({
        status: newStatus,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        reviewNotes: notes || null,
        updatedAt: new Date(),
      })
      .where(eq(pendingApprovals.id, id))
      .returning();

    // Update the purchase intent status
    const purchaseIntentStatus = action === "approve" ? "approved" : "rejected";
    await db
      .update(purchaseIntents)
      .set({
        status: purchaseIntentStatus,
        rejectionReason: action === "reject" ? (notes || "Rejected by reviewer") : null,
        rejectionCode: action === "reject" ? "MANUALLY_REJECTED" : null,
        updatedAt: new Date(),
      })
      .where(eq(purchaseIntents.id, existing[0].purchaseIntentId));

    return NextResponse.json({
      approval: updated[0],
      message: `Purchase ${action === "approve" ? "approved" : "rejected"} successfully`,
    });
  } catch (error) {
    console.error("Error processing approval:", error);
    return NextResponse.json(
      { error: "Failed to process approval" },
      { status: 500 }
    );
  }
}

