import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/database";
import { organizations } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/internal/settings/organization
 * Get organization settings including budget and guardrails
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, session.user.organizationId))
      .limit(1);

    if (org.length === 0) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const guardrails = org[0].guardrails ? JSON.parse(org[0].guardrails) : {};

    return NextResponse.json({
      name: org[0].name,
      monthlyBudget: org[0].monthlyBudget,
      alertThreshold: org[0].alertThreshold || 0.8,
      guardrails,
    });
  } catch (error) {
    console.error("Error fetching org settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization settings" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/internal/settings/organization
 * Update organization settings
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, monthlyBudget, alertThreshold, guardrails } = body;

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (monthlyBudget !== undefined) updateData.monthlyBudget = monthlyBudget;
    if (alertThreshold !== undefined) updateData.alertThreshold = alertThreshold;
    if (guardrails !== undefined) updateData.guardrails = JSON.stringify(guardrails);

    const org = await db
      .update(organizations)
      .set(updateData)
      .where(eq(organizations.id, session.user.organizationId))
      .returning();

    if (org.length === 0) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const parsedGuardrails = org[0].guardrails ? JSON.parse(org[0].guardrails) : {};

    return NextResponse.json({
      name: org[0].name,
      monthlyBudget: org[0].monthlyBudget,
      alertThreshold: org[0].alertThreshold || 0.8,
      guardrails: parsedGuardrails,
    });
  } catch (error) {
    console.error("Error updating org settings:", error);
    return NextResponse.json(
      { error: "Failed to update organization settings" },
      { status: 500 }
    );
  }
}

