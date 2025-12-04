/**
 * Stripe Customer Management
 * 
 * Manages Stripe Customer records for organizations.
 * Each organization gets a Stripe Customer for storing payment methods.
 */

import { stripe } from "./client";
import { db } from "@/lib/database";
import { organizations } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

/**
 * Create a new Stripe Customer for an organization
 */
export async function createCustomer(
  orgId: string,
  email: string,
  name?: string
): Promise<string> {
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: {
      organizationId: orgId,
      platform: "roony",
    },
  });

  // Update organization with Stripe customer ID
  await db
    .update(organizations)
    .set({
      stripeCustomerId: customer.id,
      billingEmail: email,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, orgId));

  return customer.id;
}

/**
 * Get or create a Stripe Customer for an organization
 */
export async function getOrCreateCustomer(
  orgId: string,
  email: string,
  name?: string
): Promise<string> {
  // Check if organization already has a customer
  const org = await db
    .select({
      stripeCustomerId: organizations.stripeCustomerId,
      name: organizations.name,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  if (org[0]?.stripeCustomerId) {
    return org[0].stripeCustomerId;
  }

  // Create new customer
  return createCustomer(orgId, email, name || org[0]?.name);
}

/**
 * Get Stripe Customer details
 */
export async function getCustomer(customerId: string) {
  return stripe.customers.retrieve(customerId);
}

/**
 * Update Stripe Customer email
 */
export async function updateCustomerEmail(
  customerId: string,
  email: string
): Promise<void> {
  await stripe.customers.update(customerId, { email });
}

/**
 * Delete Stripe Customer (for account deletion)
 */
export async function deleteCustomer(customerId: string): Promise<void> {
  await stripe.customers.del(customerId);
}

