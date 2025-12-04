/**
 * Payment Methods API
 * 
 * GET  /api/internal/payment-methods - List payment methods
 * POST /api/internal/payment-methods - Add a new payment method
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getOrCreateCustomer } from "@/lib/stripe/customers";
import {
  attachPaymentMethod,
  listPaymentMethods,
  savePaymentMethodToDb,
  getOrgPaymentMethods,
  setDefaultPaymentMethod,
} from "@/lib/stripe/payment-methods";
import { db } from "@/lib/database";
import { users, organizations } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/internal/payment-methods
 * List all payment methods for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Get payment methods from database
    const paymentMethods = await getOrgPaymentMethods(orgId);

    return NextResponse.json({
      paymentMethods: paymentMethods.map((pm) => ({
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
      })),
    });
  } catch (error) {
    console.error("Error listing payment methods:", error);
    return NextResponse.json(
      { error: "Failed to list payment methods" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/internal/payment-methods
 * Add a new payment method (attach to Stripe customer and save to DB)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { paymentMethodId } = body;

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: "paymentMethodId is required" },
        { status: 400 }
      );
    }

    // Get user and organization
    const userData = await db
      .select({
        organizationId: users.organizationId,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!userData[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const orgId = userData[0].organizationId;
    const email = userData[0].email;

    // Get or create Stripe customer
    const customerId = await getOrCreateCustomer(orgId, email);

    // Attach payment method to customer
    const paymentMethod = await attachPaymentMethod(customerId, paymentMethodId);

    // Check if this is the first payment method (make it default)
    const existingMethods = await getOrgPaymentMethods(orgId);
    const isDefault = existingMethods.length === 0;

    // If default, also set in Stripe
    if (isDefault) {
      await setDefaultPaymentMethod(customerId, paymentMethodId);
    }

    // Save to database
    const dbId = await savePaymentMethodToDb(
      orgId,
      customerId,
      paymentMethod,
      isDefault
    );

    return NextResponse.json({
      id: dbId,
      stripePaymentMethodId: paymentMethod.id,
      type: paymentMethod.type,
      brand: paymentMethod.card?.brand || null,
      last4: paymentMethod.card?.last4 || "****",
      expMonth: paymentMethod.card?.exp_month || null,
      expYear: paymentMethod.card?.exp_year || null,
      isDefault,
      status: "active",
    });
  } catch (error) {
    console.error("Error adding payment method:", error);
    
    // Handle specific Stripe errors
    if (error instanceof Error) {
      if (error.message.includes("already been attached")) {
        return NextResponse.json(
          { error: "This card is already added to your account" },
          { status: 400 }
        );
      }
      if (error.message.includes("invalid")) {
        return NextResponse.json(
          { error: "Invalid payment method" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to add payment method" },
      { status: 500 }
    );
  }
}

