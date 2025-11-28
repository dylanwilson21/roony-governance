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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agent = await db
      .select()
      .from(agents)
      .where(
        and(
          eq(agents.id, params.id),
          eq(agents.organizationId, session.user.organizationId)
        )
      )
      .limit(1);

    if (agent.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({ agent: agent[0] });
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
 * Update agent
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, status } = body;

    const agent = await db
      .update(agents)
      .set({
        ...(name && { name }),
        ...(status && { status }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(agents.id, params.id),
          eq(agents.organizationId, session.user.organizationId)
        )
      )
      .returning();

    if (agent.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({ agent: agent[0] });
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agent = await db
      .delete(agents)
      .where(
        and(
          eq(agents.id, params.id),
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

