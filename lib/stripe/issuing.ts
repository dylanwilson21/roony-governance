import { stripe } from "./client";
import type Stripe from "stripe";

/**
 * Get the Roony cardholder ID from environment
 * This is the cardholder under Roony's master Stripe Issuing account
 */
function getRoonyCardholderId(): string {
  const cardholderId = process.env.ROONY_CARDHOLDER_ID;
  if (!cardholderId) {
    throw new Error("ROONY_CARDHOLDER_ID environment variable is not set");
  }
  return cardholderId;
}

/**
 * Create a virtual card via Stripe Issuing using Roony's master account
 * 
 * Phase 0 Change: Cards are now issued from Roony's master Issuing account,
 * not from customer's connected accounts.
 */
export async function createVirtualCard(
  params: {
    amount: number;
    currency: string;
    organizationId: string;
    agentId: string;
    purchaseIntentId: string;
    allowedCategories?: string[];
    blockedCategories?: string[];
    expiresInHours?: number;
  }
): Promise<Stripe.Issuing.Card> {
  const card = await stripe.issuing.cards.create({
    cardholder: getRoonyCardholderId(),
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
    metadata: {
      organizationId: params.organizationId,
      agentId: params.agentId,
      purchaseIntentId: params.purchaseIntentId,
      platform: "roony",
    },
  });

  return card;
}

/**
 * Legacy: Create virtual card with connected account (for backward compatibility)
 * @deprecated Use createVirtualCard without connectedAccountId for Phase 0+
 */
export async function createVirtualCardLegacy(
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
            amount: Math.round(params.amount * 100),
            interval: "all_time",
          },
        ],
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
  cardId: string
): Promise<{ number: string; cvc: string; exp_month: number; exp_year: number }> {
  // In production, use Stripe's ephemeral keys or the sensitive card details endpoint
  // stripe.issuing.cards.retrieve(cardId, { expand: ['number', 'cvc'] })
  // requires special permissions
  
  const card = await stripe.issuing.cards.retrieve(cardId);

  // Note: Real PAN/CVC retrieval requires additional Stripe setup
  // You need to call stripe.issuing.cards.retrieve with expand: ['number', 'cvc']
  // which requires additional Stripe permissions
  
  // For development/testing, return the card details
  // In production, implement proper card number retrieval
  return {
    number: `************${card.last4}`,
    cvc: "***",
    exp_month: card.exp_month,
    exp_year: card.exp_year,
  };
}

/**
 * Retrieve full card details including PAN and CVC
 * Requires Stripe Issuing sensitive data access
 */
export async function getFullCardDetails(
  cardId: string
): Promise<{ 
  number: string; 
  cvc: string; 
  exp_month: number; 
  exp_year: number;
  last4: string;
}> {
  try {
    // This requires the 'issuing_card_details' capability
    const card = await stripe.issuing.cards.retrieve(cardId, {
      expand: ["number", "cvc"],
    }) as Stripe.Issuing.Card & { number?: string; cvc?: string };

    return {
      number: card.number || `************${card.last4}`,
      cvc: card.cvc || "***",
      exp_month: card.exp_month,
      exp_year: card.exp_year,
      last4: card.last4,
    };
  } catch (error) {
    // If we can't get full details, fall back to masked
    console.warn("Could not retrieve full card details:", error);
    const card = await stripe.issuing.cards.retrieve(cardId);
    return {
      number: `************${card.last4}`,
      cvc: "***",
      exp_month: card.exp_month,
      exp_year: card.exp_year,
      last4: card.last4,
    };
  }
}

/**
 * Update card status
 */
export async function updateCardStatus(
  cardId: string,
  status: "active" | "inactive" | "canceled"
): Promise<Stripe.Issuing.Card> {
  return stripe.issuing.cards.update(cardId, { status });
}

/**
 * Cancel a virtual card
 */
export async function cancelCard(cardId: string): Promise<Stripe.Issuing.Card> {
  return stripe.issuing.cards.update(cardId, { status: "canceled" });
}

/**
 * Get card by ID
 */
export async function getCard(cardId: string): Promise<Stripe.Issuing.Card> {
  return stripe.issuing.cards.retrieve(cardId);
}
