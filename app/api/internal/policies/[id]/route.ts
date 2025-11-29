import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/database";
import { policies } from "@/lib/database/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/internal/policies/:id
 * Get policy details
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

    const policy = await db
      .select()
      .from(policies)
      .where(
        and(
          eq(policies.id, params.id),
          eq(policies.organizationId, session.user.organizationId)
        )
      )
      .limit(1);

    if (policy.length === 0) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    return NextResponse.json({
      policy: {
        ...policy[0],
        scopeIds: JSON.parse(policy[0].scopeIds),
        rules: JSON.parse(policy[0].rules),
      },
    });
  } catch (error) {
    console.error("Error fetching policy:", error);
    return NextResponse.json(
      { error: "Failed to fetch policy" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/internal/policies/:id
 * Update policy
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
    const { name, description, scopeType, scopeIds, rules, action, priority, enabled } = body;

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (scopeType !== undefined) updateData.scopeType = scopeType;
    if (scopeIds !== undefined) updateData.scopeIds = JSON.stringify(scopeIds);
    if (rules !== undefined) updateData.rules = JSON.stringify(rules);
    if (action !== undefined) updateData.action = action;
    if (priority !== undefined) updateData.priority = priority;
    if (enabled !== undefined) updateData.enabled = enabled;

    const policy = await db
      .update(policies)
      .set(updateData)
      .where(
        and(
          eq(policies.id, params.id),
          eq(policies.organizationId, session.user.organizationId)
        )
      )
      .returning();

    if (policy.length === 0) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    return NextResponse.json({
      policy: {
        ...policy[0],
        scopeIds: JSON.parse(policy[0].scopeIds),
        rules: JSON.parse(policy[0].rules),
      },
    });
  } catch (error) {
    console.error("Error updating policy:", error);
    return NextResponse.json(
      { error: "Failed to update policy" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/internal/policies/:id
 * Delete policy
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

    const policy = await db
      .delete(policies)
      .where(
        and(
          eq(policies.id, params.id),
          eq(policies.organizationId, session.user.organizationId)
        )
      )
      .returning();

    if (policy.length === 0) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Policy deleted" });
  } catch (error) {
    console.error("Error deleting policy:", error);
    return NextResponse.json(
      { error: "Failed to delete policy" },
      { status: 500 }
    );
  }
}

