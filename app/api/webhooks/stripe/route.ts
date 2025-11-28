import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { db } from "@/lib/database";
import { transactions, virtualCards, purchaseIntents } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/webhooks/stripe
 * 
 * Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  // Handle different event types
  switch (event.type) {
    case "issuing_authorization.request":
      await handleAuthorizationRequest(event.data.object);
      break;
    case "issuing_authorization.created":
      await handleAuthorizationCreated(event.data.object);
      break;
    case "charge.succeeded":
      await handleChargeSucceeded(event.data.object);
      break;
    case "issuing_card.created":
      await handleCardCreated(event.data.object);
      break;
    case "issuing_card.updated":
      await handleCardUpdated(event.data.object);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

/**
 * Handle authorization request
 */
async function handleAuthorizationRequest(authorization: any) {
  console.log("Authorization request:", authorization.id);
  
  // Find the virtual card
  const cards = await db
    .select()
    .from(virtualCards)
    .where(eq(virtualCards.stripeCardId, authorization.card));

  if (cards.length === 0) {
    console.error("Card not found for authorization:", authorization.card);
    return;
  }

  const card = cards[0];

  // Verify amount matches
  const amount = authorization.amount / 100; // Convert from cents
  if (Math.abs(amount - card.hardLimit) > 0.01) {
    console.warn(`Amount mismatch: expected ${card.hardLimit}, got ${amount}`);
  }

  // Update card status to used
  await db
    .update(virtualCards)
    .set({ status: "used" })
    .where(eq(virtualCards.id, card.id));
}

/**
 * Handle authorization created
 */
async function handleAuthorizationCreated(authorization: any) {
  console.log("Authorization created:", authorization.id);
  // Additional processing if needed
}

/**
 * Handle charge succeeded (settlement)
 */
async function handleChargeSucceeded(charge: any) {
  console.log("Charge succeeded:", charge.id);

  // Find the virtual card by matching the charge to the card
  // Note: This is simplified - in production, you'd need a better way to match charges to cards
  // For now, we'll try to find by looking at the charge metadata or payment method
  const allCards = await db.select().from(virtualCards);
  
  // Try to find card by checking if charge amount matches a recent card
  const cards = allCards.filter(card => {
    // This is a simplified match - in production, use charge metadata or other identifiers
    return true; // Placeholder - would need proper matching logic
  });

  if (cards.length === 0) {
    console.error("Card not found for charge:", charge.id);
    return;
  }

  const card = cards[0];

  // Find purchase intent
  const intents = await db
    .select()
    .from(purchaseIntents)
    .where(eq(purchaseIntents.id, card.purchaseIntentId));

  if (intents.length === 0) {
    console.error("Purchase intent not found:", card.purchaseIntentId);
    return;
  }

  const intent = intents[0];

  // Create or update transaction
  await db.insert(transactions).values({
    purchaseIntentId: intent.id,
    virtualCardId: card.id,
    stripeChargeId: charge.id,
    stripeAuthorizationId: charge.payment_intent,
    amount: charge.amount / 100, // Convert from cents
    currency: charge.currency,
    merchantName: charge.billing_details?.name || "Unknown",
    merchantMcc: charge.payment_method_details?.card?.brand,
    status: "captured",
    settledAt: new Date(charge.created * 1000),
  });

  // Update purchase intent status
  await db
    .update(purchaseIntents)
    .set({ status: "approved" })
    .where(eq(purchaseIntents.id, intent.id));
}

/**
 * Handle card created
 */
async function handleCardCreated(card: any) {
  console.log("Card created:", card.id);
  // Card is already stored when we create it, so this is just for logging
}

/**
 * Handle card updated
 */
async function handleCardUpdated(card: any) {
  console.log("Card updated:", card.id);
  
  // Update card status if needed
  const cards = await db
    .select()
    .from(virtualCards)
    .where(eq(virtualCards.stripeCardId, card.id));

  if (cards.length > 0) {
    const statusMap: Record<string, "active" | "used" | "expired" | "canceled"> = {
      active: "active",
      inactive: "canceled",
      canceled: "canceled",
    };

    if (card.status && statusMap[card.status]) {
      await db
        .update(virtualCards)
        .set({ status: statusMap[card.status] })
        .where(eq(virtualCards.id, cards[0].id));
    }
  }
}

