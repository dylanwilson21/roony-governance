import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { db } from "@/lib/database";
import { 
  transactions, 
  virtualCards, 
  purchaseIntents, 
  transactionFees 
} from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import { capturePayment } from "@/lib/stripe/payment-methods";
import { updateFeeStatus, updateMonthlyVolume } from "@/lib/billing/fees";

/**
 * POST /api/webhooks/stripe
 * 
 * Handle Stripe webhook events
 * 
 * Phase 0: Enhanced to capture pre-authorized payments when cards are used
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
    case "issuing_transaction.created":
      await handleTransactionCreated(event.data.object);
      break;
    case "charge.succeeded":
      await handleChargeSucceeded(event.data.object);
      break;
    case "charge.refunded":
      await handleChargeRefunded(event.data.object);
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
 * Handle authorization request (real-time authorization)
 * This is called when a merchant tries to charge the card
 */
async function handleAuthorizationRequest(authorization: any) {
  console.log("Authorization request:", authorization.id, "Amount:", authorization.amount);
  
  // Find the virtual card
  const cards = await db
    .select()
    .from(virtualCards)
    .where(eq(virtualCards.stripeCardId, authorization.card.id));

  if (cards.length === 0) {
    console.error("Card not found for authorization:", authorization.card.id);
    return;
  }

  const card = cards[0];

  // Verify amount is within limits
  const amountInDollars = authorization.amount / 100;
  if (amountInDollars > card.hardLimit) {
    console.warn(`Authorization amount ${amountInDollars} exceeds hard limit ${card.hardLimit}`);
    // Note: Stripe Issuing will handle the decline based on spending_controls
  }
}

/**
 * Handle authorization created
 * 
 * Phase 0: This is where we capture the pre-authorized payment from the customer's card
 */
async function handleAuthorizationCreated(authorization: any) {
  console.log("Authorization created:", authorization.id, "Status:", authorization.status);
  
  // Only process approved authorizations
  if (authorization.status !== "pending" && authorization.status !== "closed") {
    console.log("Authorization not approved, skipping capture");
    return;
  }

  // Find the virtual card by Stripe card ID
  const cards = await db
    .select()
    .from(virtualCards)
    .where(eq(virtualCards.stripeCardId, authorization.card.id));

  if (cards.length === 0) {
    console.error("Card not found for authorization:", authorization.card.id);
    return;
  }

  const card = cards[0];

  // Get purchase intent
  const intents = await db
    .select()
    .from(purchaseIntents)
    .where(eq(purchaseIntents.id, card.purchaseIntentId));

  if (intents.length === 0) {
    console.error("Purchase intent not found:", card.purchaseIntentId);
    return;
  }

  const intent = intents[0];

  // Check if we have a pre-auth to capture
  if (!intent.stripePreAuthId) {
    console.log("No pre-auth ID found, skipping capture (legacy flow)");
    return;
  }

  // Calculate the actual amount to capture (transaction amount + fee)
  const actualAmount = authorization.amount / 100; // Convert from cents
  const feeAmount = intent.feeAmount || 0;
  const totalToCapture = actualAmount + feeAmount;

  console.log(`Capturing: Transaction $${actualAmount} + Fee $${feeAmount} = $${totalToCapture}`);

  try {
    // Capture the pre-authorized payment
    const capturedPayment = await capturePayment(
      intent.stripePreAuthId,
      totalToCapture
    );

    console.log("Payment captured:", capturedPayment.id, "Amount:", capturedPayment.amount_received);

    // Update fee status
    const fees = await db
      .select()
      .from(transactionFees)
      .where(eq(transactionFees.purchaseIntentId, intent.id));

    if (fees.length > 0) {
      await updateFeeStatus(fees[0].id, "charged", capturedPayment.id);
    }

    // Update monthly volume
    await updateMonthlyVolume(
      intent.organizationId,
      actualAmount,
      feeAmount,
      intent.protocol || "stripe_card"
    );

    // Update card status to used
    await db
      .update(virtualCards)
      .set({ status: "used", updatedAt: new Date() })
      .where(eq(virtualCards.id, card.id));

    // Create transaction record
    await db.insert(transactions).values({
      purchaseIntentId: intent.id,
      virtualCardId: card.id,
      stripeChargeId: capturedPayment.id,
      stripeAuthorizationId: authorization.id,
      amount: actualAmount,
      currency: authorization.currency,
      merchantName: authorization.merchant_data?.name || intent.merchantName,
      merchantMcc: authorization.merchant_data?.category,
      status: "captured",
      settledAt: new Date(),
    });

  } catch (captureError) {
    console.error("Failed to capture pre-auth:", captureError);
    
    // Update fee status to failed
    const fees = await db
      .select()
      .from(transactionFees)
      .where(eq(transactionFees.purchaseIntentId, intent.id));

    if (fees.length > 0) {
      await updateFeeStatus(fees[0].id, "failed");
    }

    // Note: The card transaction already went through, so we need to handle this
    // In production, you'd want to create a receivable record and follow up
  }
}

/**
 * Handle issuing transaction created (capture completed)
 */
async function handleTransactionCreated(transaction: any) {
  console.log("Issuing transaction created:", transaction.id, "Type:", transaction.type);
  
  // Find the virtual card
  const cards = await db
    .select()
    .from(virtualCards)
    .where(eq(virtualCards.stripeCardId, transaction.card));

  if (cards.length === 0) {
    console.log("Card not found for transaction:", transaction.card);
    return;
  }

  const card = cards[0];

  // Check if we already have a transaction record (created in authorization handler)
  const existingTx = await db
    .select()
    .from(transactions)
    .where(eq(transactions.stripeAuthorizationId, transaction.authorization));

  if (existingTx.length > 0) {
    // Update existing transaction
    await db
      .update(transactions)
      .set({ 
        status: "captured",
        settledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, existingTx[0].id));
  }
}

/**
 * Handle charge succeeded (settlement)
 * This fires when a charge to the customer's card is captured
 */
async function handleChargeSucceeded(charge: any) {
  console.log("Charge succeeded:", charge.id, "Amount:", charge.amount);
  
  // Check if this is a Roony pre-auth capture by checking metadata
  const metadata = charge.metadata || {};
  if (metadata.type === "purchase_pre_auth" && metadata.purchaseIntentId) {
    console.log("Pre-auth capture confirmed for purchase:", metadata.purchaseIntentId);
    // The capture was already handled in handleAuthorizationCreated
    return;
  }

  // Legacy flow handling (for backward compatibility)
  // This would be charges from connected accounts in the old model
}

/**
 * Handle charge refunded
 */
async function handleChargeRefunded(charge: any) {
  console.log("Charge refunded:", charge.id, "Amount refunded:", charge.amount_refunded);
  
  // Check if this is related to a Roony purchase
  const metadata = charge.metadata || {};
  if (metadata.purchaseIntentId) {
    // Update fee status
    const fees = await db
      .select()
      .from(transactionFees)
      .where(eq(transactionFees.purchaseIntentId, metadata.purchaseIntentId));

    if (fees.length > 0 && charge.refunded) {
      await updateFeeStatus(fees[0].id, "refunded");
    }
  }
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
  console.log("Card updated:", card.id, "Status:", card.status);
  
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
        .set({ status: statusMap[card.status], updatedAt: new Date() })
        .where(eq(virtualCards.id, cards[0].id));
    }
  }
}
