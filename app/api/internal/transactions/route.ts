import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/database";
import { purchaseIntents, agents } from "@/lib/database/schema";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/internal/transactions
 * List all transactions (purchase intents) for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const transactions = await db
      .select({
        id: purchaseIntents.id,
        agentId: purchaseIntents.agentId,
        agentName: agents.name,
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
      .leftJoin(agents, eq(purchaseIntents.agentId, agents.id))
      .where(eq(purchaseIntents.organizationId, session.user.organizationId))
      .orderBy(desc(purchaseIntents.createdAt))
      .limit(100);

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

