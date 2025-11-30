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

    // Parse JSON fields for the response
    const parsedAgents = agentsList.map(agent => ({
      ...agent,
      blockedMerchants: agent.blockedMerchants ? JSON.parse(agent.blockedMerchants) : null,
      allowedMerchants: agent.allowedMerchants ? JSON.parse(agent.allowedMerchants) : null,
    }));

    return NextResponse.json({ agents: parsedAgents });
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
 * Create a new agent with spending controls
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      description,
      teamId, 
      projectId,
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
        description: description || null,
        organizationId: session.user.organizationId,
        teamId: teamId || null,
        projectId: projectId || null,
        apiKeyHash,
        status: "active",
        // Spending limits
        monthlyLimit: monthlyLimit || null,
        dailyLimit: dailyLimit || null,
        perTransactionLimit: perTransactionLimit || null,
        // Controls
        approvalThreshold: approvalThreshold || null,
        flagNewVendors: flagNewVendors || false,
        blockedMerchants: blockedMerchants ? JSON.stringify(blockedMerchants) : null,
        allowedMerchants: allowedMerchants ? JSON.stringify(allowedMerchants) : null,
      })
      .returning();

    // Parse JSON fields for response
    const parsedAgent = {
      ...agent[0],
      blockedMerchants: agent[0].blockedMerchants ? JSON.parse(agent[0].blockedMerchants) : null,
      allowedMerchants: agent[0].allowedMerchants ? JSON.parse(agent[0].allowedMerchants) : null,
    };

    return NextResponse.json({
      agent: parsedAgent,
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
