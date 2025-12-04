/**
 * Set Default Payment Method API
 * 
 * PUT /api/internal/payment-methods/[id]/default - Set as default payment method
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import {
  setDefaultPaymentMethod,
  setDefaultPaymentMethodInDb,
} from "@/lib/stripe/payment-methods";
import { db } from "@/lib/database";
import { users, customerPaymentMethods, organizations } from "@/lib/database/schema";
import { eq, and } from "drizzle-orm";

/**
 * PUT /api/internal/payment-methods/[id]/default
 * Set a payment method as the default
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get user's organization
    const user = await db
      .select({ organizationId: users.organizationId })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const orgId = user[0].organizationId;

    // Get payment method
    const paymentMethods = await db
      .select()
      .from(customerPaymentMethods)
      .where(
        and(
          eq(customerPaymentMethods.id, id),
          eq(customerPaymentMethods.organizationId, orgId)
        )
      )
      .limit(1);

    if (paymentMethods.length === 0) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      );
    }

    const pm = paymentMethods[0];

    // Get Stripe customer ID from org
    const org = await db
      .select({ stripeCustomerId: organizations.stripeCustomerId })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (org[0]?.stripeCustomerId) {
      // Update in Stripe
      await setDefaultPaymentMethod(org[0].stripeCustomerId, pm.stripePaymentMethodId);
    }

    // Update in database
    await setDefaultPaymentMethodInDb(id, orgId);

    return NextResponse.json({
      success: true,
      message: "Default payment method updated",
      id: pm.id,
    });
  } catch (error) {
    console.error("Error setting default payment method:", error);
    return NextResponse.json(
      { error: "Failed to set default payment method" },
      { status: 500 }
    );
  }
}

