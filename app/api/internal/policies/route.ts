import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/database";
import { policies } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/internal/policies
 * List all policies for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const policiesList = await db
      .select()
      .from(policies)
      .where(eq(policies.organizationId, session.user.organizationId));

    return NextResponse.json({
      policies: policiesList.map((p) => ({
        ...p,
        scopeIds: JSON.parse(p.scopeIds),
        rules: JSON.parse(p.rules),
      })),
    });
  } catch (error) {
    console.error("Error fetching policies:", error);
    return NextResponse.json(
      { error: "Failed to fetch policies" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/internal/policies
 * Create a new policy
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, scopeType, scopeIds, rules, action, priority } = body;

    if (!name || !scopeType || !rules || !action) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const policy = await db
      .insert(policies)
      .values({
        name,
        description: description || null,
        organizationId: session.user.organizationId,
        scopeType,
        scopeIds: JSON.stringify(scopeIds || []),
        rules: JSON.stringify(rules),
        action,
        priority: priority || 0,
        enabled: true,
      })
      .returning();

    return NextResponse.json({
      policy: {
        ...policy[0],
        scopeIds: JSON.parse(policy[0].scopeIds),
        rules: JSON.parse(policy[0].rules),
      },
    });
  } catch (error) {
    console.error("Error creating policy:", error);
    return NextResponse.json(
      { error: "Failed to create policy" },
      { status: 500 }
    );
  }
}

