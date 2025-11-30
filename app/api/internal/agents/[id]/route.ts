import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/database";
import { agents } from "@/lib/database/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/internal/agents/:id
 * Get agent details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agent = await db
      .select()
      .from(agents)
      .where(
        and(
          eq(agents.id, id),
          eq(agents.organizationId, session.user.organizationId)
        )
      )
      .limit(1);

    if (agent.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Parse JSON fields
    const parsedAgent = {
      ...agent[0],
      blockedMerchants: agent[0].blockedMerchants ? JSON.parse(agent[0].blockedMerchants) : null,
      allowedMerchants: agent[0].allowedMerchants ? JSON.parse(agent[0].allowedMerchants) : null,
    };

    return NextResponse.json({ agent: parsedAgent });
  } catch (error) {
    console.error("Error fetching agent:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/internal/agents/:id
 * Update agent including spending controls
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      description,
      status,
      teamId,
      // Spending limits
      monthlyLimit,
      dailyLimit,
      perTransactionLimit,
      // Controls
      approvalThreshold,
      flagNewVendors,
      blockedMerchants,
      allowedMerchants,
    } = body;

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (teamId !== undefined) updateData.teamId = teamId;
    
    // Spending limits
    if (monthlyLimit !== undefined) updateData.monthlyLimit = monthlyLimit;
    if (dailyLimit !== undefined) updateData.dailyLimit = dailyLimit;
    if (perTransactionLimit !== undefined) updateData.perTransactionLimit = perTransactionLimit;
    
    // Controls
    if (approvalThreshold !== undefined) updateData.approvalThreshold = approvalThreshold;
    if (flagNewVendors !== undefined) updateData.flagNewVendors = flagNewVendors;
    if (blockedMerchants !== undefined) {
      updateData.blockedMerchants = blockedMerchants ? JSON.stringify(blockedMerchants) : null;
    }
    if (allowedMerchants !== undefined) {
      updateData.allowedMerchants = allowedMerchants ? JSON.stringify(allowedMerchants) : null;
    }

    const agent = await db
      .update(agents)
      .set(updateData)
      .where(
        and(
          eq(agents.id, id),
          eq(agents.organizationId, session.user.organizationId)
        )
      )
      .returning();

    if (agent.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Parse JSON fields for response
    const parsedAgent = {
      ...agent[0],
      blockedMerchants: agent[0].blockedMerchants ? JSON.parse(agent[0].blockedMerchants) : null,
      allowedMerchants: agent[0].allowedMerchants ? JSON.parse(agent[0].allowedMerchants) : null,
    };

    return NextResponse.json({ agent: parsedAgent });
  } catch (error) {
    console.error("Error updating agent:", error);
    return NextResponse.json(
      { error: "Failed to update agent" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/internal/agents/:id
 * Delete agent
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agent = await db
      .delete(agents)
      .where(
        and(
          eq(agents.id, id),
          eq(agents.organizationId, session.user.organizationId)
        )
      )
      .returning();

    if (agent.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Agent deleted" });
  } catch (error) {
    console.error("Error deleting agent:", error);
    return NextResponse.json(
      { error: "Failed to delete agent" },
      { status: 500 }
    );
  }
}
