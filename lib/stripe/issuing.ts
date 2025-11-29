import { stripe } from "./client";
import type Stripe from "stripe";

/**
 * Create a virtual card via Stripe Issuing
 */
export async function createVirtualCard(
  connectedAccountId: string,
  params: {
    amount: number;
    currency: string;
    allowedCategories?: string[];
    blockedCategories?: string[];
    expiresInHours?: number;
  }
): Promise<Stripe.Issuing.Card> {
  const card = await stripe.issuing.cards.create(
    {
      type: "virtual",
      currency: params.currency,
      status: "active",
      spending_controls: {
        spending_limits: [
          {
            amount: Math.round(params.amount * 100), // Convert to cents
            interval: "all_time",
          },
        ],
        // Type cast needed for dynamic category arrays
        ...(params.allowedCategories && {
          allowed_categories: params.allowedCategories as Stripe.Issuing.CardCreateParams.SpendingControls.AllowedCategory[],
        }),
        ...(params.blockedCategories && {
          blocked_categories: params.blockedCategories as Stripe.Issuing.CardCreateParams.SpendingControls.BlockedCategory[],
        }),
      },
    },
    {
      stripeAccount: connectedAccountId,
    }
  );

  return card;
}

/**
 * Retrieve card details (PAN, CVC, etc.)
 * Note: This requires Stripe Issuing to be enabled on the account
 */
export async function getCardDetails(
  connectedAccountId: string,
  cardId: string
): Promise<{ number: string; cvc: string; exp_month: number; exp_year: number }> {
  // In production, use Stripe's ephemeral keys or card number retrieval
  // This is a placeholder that would need proper implementation
  const card = await stripe.issuing.cards.retrieve(cardId, {
    stripeAccount: connectedAccountId,
  });

  // Note: Real PAN/CVC retrieval requires additional Stripe setup
  // For now, return placeholder values
  return {
    number: `************${card.last4}`,
    cvc: "***",
    exp_month: card.exp_month,
    exp_year: card.exp_year,
  };
}

/**
 * Update card status
 */
export async function updateCardStatus(
  connectedAccountId: string,
  cardId: string,
  status: "active" | "inactive" | "canceled"
): Promise<Stripe.Issuing.Card> {
  return stripe.issuing.cards.update(
    cardId,
    { status },
    {
      stripeAccount: connectedAccountId,
    }
  );
}
