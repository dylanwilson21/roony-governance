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
        ...(params.allowedCategories && {
          allowed_categories: params.allowedCategories,
        }),
        ...(params.blockedCategories && {
          blocked_categories: params.blockedCategories,
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
 */
export async function getCardDetails(
  connectedAccountId: string,
  cardId: string
): Promise<Stripe.Issuing.CardDetails> {
  const details = await stripe.issuing.cards.retrieveDetails(cardId, {
    stripeAccount: connectedAccountId,
  });

  return details;
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

