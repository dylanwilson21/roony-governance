import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/database";
import { stripeConnections } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/stripe/connect/status
 * Check Stripe connection status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connections = await db
      .select()
      .from(stripeConnections)
      .where(eq(stripeConnections.organizationId, session.user.organizationId))
      .limit(1);

    if (connections.length === 0) {
      return NextResponse.json({ connected: false });
    }

    const connection = connections[0];
    return NextResponse.json({
      connected: connection.status === "active",
      status: connection.status,
      accountId: connection.connectedAccountId,
      connectedAt: connection.createdAt,
    });
  } catch (error) {
    console.error("Error checking Stripe status:", error);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stripe/connect/status
 * Disconnect Stripe account
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db
      .delete(stripeConnections)
      .where(eq(stripeConnections.organizationId, session.user.organizationId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting Stripe:", error);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}

