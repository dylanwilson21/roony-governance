import Stripe from "stripe";

// Stripe is optional for alpha - we store card details directly
// Only initialize if key is provided
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      // @ts-expect-error - Using latest API version
      apiVersion: "2024-12-18.acacia",
    })
  : (null as unknown as Stripe);

export const isStripeConfigured = !!process.env.STRIPE_SECRET_KEY;

