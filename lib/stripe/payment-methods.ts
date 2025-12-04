/**
 * Stripe Payment Methods Management
 * 
 * Handles attaching, listing, and managing payment methods for customers.
 * Also provides pre-authorization and capture functionality.
 */

import Stripe from "stripe";
import { stripe } from "./client";
import { db } from "@/lib/database";
import { customerPaymentMethods, organizations } from "@/lib/database/schema";
import { eq, and } from "drizzle-orm";

/**
 * Attach a payment method to a customer
 */
export async function attachPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.PaymentMethod> {
  return stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });
}

/**
 * Detach a payment method from a customer
 */
export async function detachPaymentMethod(
  paymentMethodId: string
): Promise<Stripe.PaymentMethod> {
  return stripe.paymentMethods.detach(paymentMethodId);
}

/**
 * List payment methods for a customer
 */
export async function listPaymentMethods(
  customerId: string,
  type: Stripe.PaymentMethodListParams.Type = "card"
): Promise<Stripe.PaymentMethod[]> {
  const result = await stripe.paymentMethods.list({
    customer: customerId,
    type,
  });
  return result.data;
}

/**
 * Set default payment method for a customer
 */
export async function setDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<void> {
  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
}

/**
 * Get a payment method's details
 */
export async function getPaymentMethod(
  paymentMethodId: string
): Promise<Stripe.PaymentMethod> {
  return stripe.paymentMethods.retrieve(paymentMethodId);
}

/**
 * Pre-authorize (hold) an amount on a customer's card
 * Returns a PaymentIntent with capture_method: 'manual'
 */
export async function preAuthorizeCard(
  customerId: string,
  paymentMethodId: string,
  amount: number, // in dollars
  currency: string,
  metadata?: Record<string, string>
): Promise<Stripe.PaymentIntent> {
  const amountInCents = Math.round(amount * 100);
  
  return stripe.paymentIntents.create({
    amount: amountInCents,
    currency,
    customer: customerId,
    payment_method: paymentMethodId,
    capture_method: "manual", // Don't capture yet - just hold
    confirm: true, // Confirm immediately
    automatic_payment_methods: {
      enabled: false,
    },
    metadata: {
      platform: "roony",
      ...metadata,
    },
  });
}

/**
 * Capture a pre-authorized payment
 * Can capture less than the authorized amount
 */
export async function capturePayment(
  paymentIntentId: string,
  amount?: number // in dollars, optional - captures full amount if not specified
): Promise<Stripe.PaymentIntent> {
  const params: Stripe.PaymentIntentCaptureParams = {};
  
  if (amount !== undefined) {
    params.amount_to_capture = Math.round(amount * 100);
  }
  
  return stripe.paymentIntents.capture(paymentIntentId, params);
}

/**
 * Cancel a pre-authorization (release the hold)
 */
export async function cancelPreAuth(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.cancel(paymentIntentId);
}

/**
 * Charge a customer's card directly (for immediate capture)
 */
export async function chargeCard(
  customerId: string,
  paymentMethodId: string,
  amount: number, // in dollars
  currency: string,
  description?: string,
  metadata?: Record<string, string>
): Promise<Stripe.PaymentIntent> {
  const amountInCents = Math.round(amount * 100);
  
  return stripe.paymentIntents.create({
    amount: amountInCents,
    currency,
    customer: customerId,
    payment_method: paymentMethodId,
    confirm: true,
    automatic_payment_methods: {
      enabled: false,
    },
    description,
    metadata: {
      platform: "roony",
      ...metadata,
    },
  });
}

// ============================================
// Database Operations
// ============================================

/**
 * Save a payment method to the database
 */
export async function savePaymentMethodToDb(
  orgId: string,
  stripeCustomerId: string,
  paymentMethod: Stripe.PaymentMethod,
  isDefault: boolean = false
): Promise<string> {
  // If this is being set as default, unset other defaults first
  if (isDefault) {
    await db
      .update(customerPaymentMethods)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(customerPaymentMethods.organizationId, orgId));
  }

  const result = await db
    .insert(customerPaymentMethods)
    .values({
      organizationId: orgId,
      stripeCustomerId,
      stripePaymentMethodId: paymentMethod.id,
      type: paymentMethod.type,
      brand: paymentMethod.card?.brand || null,
      last4: paymentMethod.card?.last4 || "****",
      expMonth: paymentMethod.card?.exp_month || null,
      expYear: paymentMethod.card?.exp_year || null,
      isDefault,
      status: "active",
    })
    .returning({ id: customerPaymentMethods.id });

  return result[0].id;
}

/**
 * Get payment methods for an organization from database
 */
export async function getOrgPaymentMethods(orgId: string) {
  return db
    .select()
    .from(customerPaymentMethods)
    .where(
      and(
        eq(customerPaymentMethods.organizationId, orgId),
        eq(customerPaymentMethods.status, "active")
      )
    )
    .orderBy(customerPaymentMethods.createdAt);
}

/**
 * Get default payment method for an organization
 */
export async function getDefaultPaymentMethod(orgId: string) {
  const methods = await db
    .select()
    .from(customerPaymentMethods)
    .where(
      and(
        eq(customerPaymentMethods.organizationId, orgId),
        eq(customerPaymentMethods.status, "active"),
        eq(customerPaymentMethods.isDefault, true)
      )
    )
    .limit(1);

  if (methods.length > 0) {
    return methods[0];
  }

  // If no default, return the first active payment method
  const anyMethod = await db
    .select()
    .from(customerPaymentMethods)
    .where(
      and(
        eq(customerPaymentMethods.organizationId, orgId),
        eq(customerPaymentMethods.status, "active")
      )
    )
    .limit(1);

  return anyMethod[0] || null;
}

/**
 * Delete a payment method from database
 */
export async function deletePaymentMethodFromDb(
  paymentMethodDbId: string,
  orgId: string
): Promise<boolean> {
  const result = await db
    .delete(customerPaymentMethods)
    .where(
      and(
        eq(customerPaymentMethods.id, paymentMethodDbId),
        eq(customerPaymentMethods.organizationId, orgId)
      )
    )
    .returning();

  return result.length > 0;
}

/**
 * Update payment method status
 */
export async function updatePaymentMethodStatus(
  paymentMethodDbId: string,
  status: "active" | "expired" | "failed"
): Promise<void> {
  await db
    .update(customerPaymentMethods)
    .set({ status, updatedAt: new Date() })
    .where(eq(customerPaymentMethods.id, paymentMethodDbId));
}

/**
 * Set a payment method as the default
 */
export async function setDefaultPaymentMethodInDb(
  paymentMethodDbId: string,
  orgId: string
): Promise<void> {
  // Unset all other defaults for this org
  await db
    .update(customerPaymentMethods)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(eq(customerPaymentMethods.organizationId, orgId));

  // Set the new default
  await db
    .update(customerPaymentMethods)
    .set({ isDefault: true, updatedAt: new Date() })
    .where(
      and(
        eq(customerPaymentMethods.id, paymentMethodDbId),
        eq(customerPaymentMethods.organizationId, orgId)
      )
    );
}

