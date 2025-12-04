import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";
import { agents, purchaseIntents, virtualCards, pendingApprovals, organizations } from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import { checkSpending, createPendingApproval, recordMerchant } from "@/lib/spending/checker";
import { createVirtualCard, getFullCardDetails } from "@/lib/stripe/issuing";
import { getDefaultPaymentMethod, preAuthorizeCard } from "@/lib/stripe/payment-methods";
import { calculateFeeWithTier, recordTransactionFee, getPreAuthBuffer } from "@/lib/billing/fees";
import crypto from "crypto";

interface PurchaseIntentRequest {
  agent_id?: string; // Optional - will use authenticated agent if not provided
  amount: number;
  currency: string;
  description: string;
  merchant: {
    name: string;
    url?: string;
  };
  metadata?: Record<string, string>;
  protocol?: string; // Optional - defaults to 'stripe_card'
}

/**
 * Authenticate agent via API key
 */
async function authenticateAgent(apiKey: string) {
  // Hash the API key
  const apiKeyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

  const agent = await db
    .select()
    .from(agents)
    .where(eq(agents.apiKeyHash, apiKeyHash))
    .limit(1);

  if (agent.length === 0) {
    return null;
  }

  if (agent[0].status !== "active") {
    throw new Error("Agent is not active");
  }

  return agent[0];
}

/**
 * POST /api/v1/purchase_intent
 * 
 * Agent endpoint for requesting purchase approval
 * 
 * Phase 0 Flow:
 * 1. Authenticate agent
 * 2. Check spending limits
 * 3. Get customer's default payment method
 * 4. Pre-authorize customer's card (amount + fee + buffer)
 * 5. Create JIT virtual card from Roony's account
 * 6. Return card to agent
 * 7. (Webhook handles capture after merchant charges card)
 */
export async function POST(request: NextRequest) {
  try {
    // Get API key from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const apiKey = authHeader.substring(7);
    const agent = await authenticateAgent(apiKey);

    if (!agent) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      );
    }

    // Parse request body
    const body: PurchaseIntentRequest = await request.json();
    const protocol = body.protocol || "stripe_card";

    // Validate request
    if (!body.amount || !body.currency || !body.description || !body.merchant?.name) {
      return NextResponse.json(
        { error: "Missing required fields: amount, currency, description, merchant.name" },
        { status: 400 }
      );
    }

    // If agent_id is provided, validate it matches the authenticated agent
    if (body.agent_id && body.agent_id !== agent.id) {
      return NextResponse.json(
        { error: "agent_id does not match authenticated agent" },
        { status: 403 }
      );
    }

    // Calculate fee for this transaction
    const { tier, fee, totalToCharge } = await calculateFeeWithTier(
      agent.organizationId,
      body.amount,
      protocol
    );

    // Create purchase intent record
    const purchaseIntent = await db
      .insert(purchaseIntents)
      .values({
        agentId: agent.id,
        organizationId: agent.organizationId,
        amount: body.amount,
        currency: body.currency,
        description: body.description,
        merchantName: body.merchant.name,
        merchantUrl: body.merchant.url,
        metadata: body.metadata ? JSON.stringify(body.metadata) : null,
        status: "pending",
        protocol,
        feeAmount: fee.amount,
      })
      .returning();

    const intent = purchaseIntent[0];

    // Check spending using simplified agent-level controls
    const checkResult = await checkSpending({
      agentId: agent.id,
      amount: body.amount,
      currency: body.currency,
      merchantName: body.merchant.name,
      description: body.description,
    });

    // Handle rejection
    if (!checkResult.allowed && !checkResult.requiresApproval) {
      await db
        .update(purchaseIntents)
        .set({
          status: "rejected",
          rejectionReason: checkResult.rejectionMessage,
          rejectionCode: checkResult.rejectionCode,
        })
        .where(eq(purchaseIntents.id, intent.id));

      return NextResponse.json({
        status: "rejected",
        reason_code: checkResult.rejectionCode,
        message: checkResult.rejectionMessage,
      });
    }

    // Handle pending approval
    if (checkResult.requiresApproval) {
      await db
        .update(purchaseIntents)
        .set({
          status: "pending_approval",
        })
        .where(eq(purchaseIntents.id, intent.id));

      // Create pending approval record
      const approvalReason = checkResult.approvalReason?.includes("threshold") 
        ? "OVER_THRESHOLD" 
        : checkResult.approvalReason?.includes("vendor") 
          ? "NEW_VENDOR" 
          : "ORG_GUARDRAIL";

      await createPendingApproval(
        intent.id,
        agent.organizationId,
        agent.id,
        body.amount,
        body.merchant.name,
        approvalReason
      );

      return NextResponse.json({
        status: "pending_approval",
        message: checkResult.approvalReason || "This purchase requires human approval",
        purchase_intent_id: intent.id,
        fee: {
          amount: fee.amount,
          rate: `${(fee.effectiveRate * 100).toFixed(1)}%`,
        },
      });
    }

    // === Phase 0: New Flow - Pre-authorize customer's card and issue from Roony ===

    // Get customer's default payment method
    const paymentMethod = await getDefaultPaymentMethod(agent.organizationId);
    
    if (!paymentMethod) {
      await db
        .update(purchaseIntents)
        .set({
          status: "rejected",
          rejectionReason: "No payment method found",
          rejectionCode: "NO_PAYMENT_METHOD",
        })
        .where(eq(purchaseIntents.id, intent.id));

      return NextResponse.json(
        {
          status: "rejected",
          reason_code: "NO_PAYMENT_METHOD",
          message: "Organization has not added a payment method. Please add a card in Settings → Payment Methods.",
        },
        { status: 400 }
      );
    }

    // Pre-authorize customer's card (amount + fee + buffer)
    const preAuthAmount = getPreAuthBuffer(totalToCharge);
    
    let preAuth;
    try {
      preAuth = await preAuthorizeCard(
        paymentMethod.stripeCustomerId,
        paymentMethod.stripePaymentMethodId,
        preAuthAmount,
        body.currency,
        {
          purchaseIntentId: intent.id,
          agentId: agent.id,
          organizationId: agent.organizationId,
          type: "purchase_pre_auth",
        }
      );
    } catch (preAuthError) {
      console.error("Pre-authorization failed:", preAuthError);
      
      await db
        .update(purchaseIntents)
        .set({
          status: "rejected",
          rejectionReason: "Card pre-authorization failed",
          rejectionCode: "PREAUTH_FAILED",
        })
        .where(eq(purchaseIntents.id, intent.id));

      return NextResponse.json(
        {
          status: "rejected",
          reason_code: "PREAUTH_FAILED",
          message: "Unable to authorize your payment method. Please check your card or add a new one.",
        },
        { status: 400 }
      );
    }

    // Store pre-auth ID on purchase intent
    await db
      .update(purchaseIntents)
      .set({ stripePreAuthId: preAuth.id })
      .where(eq(purchaseIntents.id, intent.id));

    // Create virtual card from Roony's master Issuing account
    try {
      const card = await createVirtualCard({
        amount: body.amount,
        currency: body.currency,
        organizationId: agent.organizationId,
        agentId: agent.id,
        purchaseIntentId: intent.id,
      });

      // Get card details (PAN, CVC, etc.)
      const cardDetails = await getFullCardDetails(card.id);

      // Calculate expiry
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      // Store virtual card
      const virtualCard = await db
        .insert(virtualCards)
        .values({
          purchaseIntentId: intent.id,
          stripeCardId: card.id,
          last4: card.last4,
          expMonth: card.exp_month,
          expYear: card.exp_year,
          hardLimit: body.amount,
          currency: body.currency,
          status: "active",
          expiresAt,
        })
        .returning();

      // Record fee (pending until capture)
      await recordTransactionFee(
        intent.id,
        protocol,
        body.amount,
        tier,
        fee
      );

      // Update purchase intent
      await db
        .update(purchaseIntents)
        .set({
          status: "approved",
        })
        .where(eq(purchaseIntents.id, intent.id));

      // Record merchant as known for future new vendor checks
      await recordMerchant(agent.organizationId, body.merchant.name);

      // Return card details to agent
      return NextResponse.json({
        status: "approved",
        card: {
          card_id: virtualCard[0].id,
          number: cardDetails.number,
          exp_month: cardDetails.exp_month,
          exp_year: cardDetails.exp_year,
          cvc: cardDetails.cvc,
          billing_zip: "10001", // Default ZIP for virtual cards
        },
        hard_limit_amount: body.amount,
        currency: body.currency,
        expires_at: expiresAt.toISOString(),
        fee: {
          amount: fee.amount,
          rate: `${(fee.effectiveRate * 100).toFixed(1)}%`,
          tier: tier.name,
        },
      });
    } catch (error) {
      console.error("Error creating virtual card:", error);
      
      // Cancel the pre-authorization since card creation failed
      try {
        const { cancelPreAuth } = await import("@/lib/stripe/payment-methods");
        await cancelPreAuth(preAuth.id);
      } catch (cancelError) {
        console.error("Failed to cancel pre-auth:", cancelError);
      }

      await db
        .update(purchaseIntents)
        .set({
          status: "rejected",
          rejectionReason: "Failed to create virtual card",
          rejectionCode: "CARD_CREATION_FAILED",
        })
        .where(eq(purchaseIntents.id, intent.id));

      return NextResponse.json(
        {
          status: "rejected",
          reason_code: "CARD_CREATION_FAILED",
          message: "Failed to create virtual card",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Purchase intent error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
