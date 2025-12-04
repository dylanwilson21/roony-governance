/**
 * Single Payment Method API
 * 
 * GET    /api/internal/payment-methods/[id] - Get payment method details
 * DELETE /api/internal/payment-methods/[id] - Remove a payment method
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import {
  detachPaymentMethod,
  deletePaymentMethodFromDb,
  getOrgPaymentMethods,
  setDefaultPaymentMethodInDb,
} from "@/lib/stripe/payment-methods";
import { db } from "@/lib/database";
import { users, customerPaymentMethods } from "@/lib/database/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/internal/payment-methods/[id]
 * Get details of a specific payment method
 */
export async function GET(
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

    return NextResponse.json({
      id: pm.id,
      stripePaymentMethodId: pm.stripePaymentMethodId,
      type: pm.type,
      brand: pm.brand,
      last4: pm.last4,
      expMonth: pm.expMonth,
      expYear: pm.expYear,
      isDefault: pm.isDefault,
      status: pm.status,
      createdAt: pm.createdAt,
    });
  } catch (error) {
    console.error("Error getting payment method:", error);
    return NextResponse.json(
      { error: "Failed to get payment method" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/internal/payment-methods/[id]
 * Remove a payment method
 */
export async function DELETE(
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

    // Get payment method to find Stripe ID
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

    // Check if this is the only payment method
    const allMethods = await getOrgPaymentMethods(orgId);
    if (allMethods.length === 1) {
      return NextResponse.json(
        { error: "Cannot remove the only payment method. Add another card first." },
        { status: 400 }
      );
    }

    // Detach from Stripe
    try {
      await detachPaymentMethod(pm.stripePaymentMethodId);
    } catch (stripeError) {
      // If it fails in Stripe (already detached), continue with DB deletion
      console.warn("Stripe detach failed (may already be detached):", stripeError);
    }

    // Delete from database
    await deletePaymentMethodFromDb(id, orgId);

    // If this was the default, set another as default
    if (pm.isDefault) {
      const remainingMethods = await getOrgPaymentMethods(orgId);
      if (remainingMethods.length > 0) {
        await setDefaultPaymentMethodInDb(remainingMethods[0].id, orgId);
      }
    }

    return NextResponse.json({ success: true, message: "Payment method removed" });
  } catch (error) {
    console.error("Error removing payment method:", error);
    return NextResponse.json(
      { error: "Failed to remove payment method" },
      { status: 500 }
    );
  }
}

