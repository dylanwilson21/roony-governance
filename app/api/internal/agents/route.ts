import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/database";
import { agents } from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

/**
 * GET /api/internal/agents
 * List all agents for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agentsList = await db
      .select()
      .from(agents)
      .where(eq(agents.organizationId, session.user.organizationId));

    return NextResponse.json({ agents: agentsList });
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/internal/agents
 * Create a new agent
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, teamId, projectId } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Generate API key
    const apiKey = `rk_${crypto.randomBytes(32).toString("hex")}`;
    const apiKeyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

    const agent = await db
      .insert(agents)
      .values({
        name,
        organizationId: session.user.organizationId,
        teamId: teamId || null,
        projectId: projectId || null,
        apiKeyHash,
        status: "active",
      })
      .returning();

    return NextResponse.json({
      agent: agent[0],
      apiKey, // Return the raw API key only on creation
    });
  } catch (error) {
    console.error("Error creating agent:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    );
  }
}

