import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/database";
import { agents } from "@/lib/database/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

/**
 * POST /api/internal/agents/:id/regenerate-key
 * Regenerate API key for an agent
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate new API key
    const apiKey = `rk_${crypto.randomBytes(32).toString("hex")}`;
    const apiKeyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

    const agent = await db
      .update(agents)
      .set({
        apiKeyHash,
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

    return NextResponse.json({
      agent: agent[0],
      apiKey, // Return the new raw API key
    });
  } catch (error) {
    console.error("Error regenerating API key:", error);
    return NextResponse.json(
      { error: "Failed to regenerate API key" },
      { status: 500 }
    );
  }
}

