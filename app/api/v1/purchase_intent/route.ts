import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";
import { agents, purchaseIntents, virtualCards, stripeConnections } from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import { PolicyEvaluator } from "@/lib/policy-engine/evaluator";
import { createVirtualCard, getCardDetails } from "@/lib/stripe/issuing";
import crypto from "crypto";

interface PurchaseIntentRequest {
  agent_id: string;
  amount: number;
  currency: string;
  description: string;
  merchant: {
    name: string;
    url?: string;
  };
  metadata?: Record<string, string>;
}

/**
 * Authenticate agent via API key
 */
async function authenticateAgent(apiKey: string) {
  // Hash the API key (in production, use proper hashing)
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

    // Validate request
    if (!body.agent_id || !body.amount || !body.currency || !body.description || !body.merchant?.name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (body.agent_id !== agent.id) {
      return NextResponse.json(
        { error: "agent_id does not match authenticated agent" },
        { status: 403 }
      );
    }

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
      })
      .returning();

    const intent = purchaseIntent[0];

    // Evaluate policy
    const evaluator = new PolicyEvaluator();
    const evaluation = await evaluator.evaluate(
      {
        agentId: agent.id,
        amount: body.amount,
        currency: body.currency,
        description: body.description,
        merchant: body.merchant,
        metadata: body.metadata,
      },
      agent.id,
      agent.organizationId,
      agent.teamId || undefined,
      agent.projectId || undefined
    );

    // Handle rejection
    if (evaluation.status === "rejected") {
      await db
        .update(purchaseIntents)
        .set({
          status: "rejected",
          rejectionReason: evaluation.reasonMessage,
          rejectionCode: evaluation.reasonCode,
        })
        .where(eq(purchaseIntents.id, intent.id));

      return NextResponse.json({
        status: "rejected",
        reason_code: evaluation.reasonCode,
        message: evaluation.reasonMessage,
      });
    }

    // Handle pending approval
    if (evaluation.status === "pending_approval") {
      await db
        .update(purchaseIntents)
        .set({
          status: "pending",
        })
        .where(eq(purchaseIntents.id, intent.id));

      return NextResponse.json({
        status: "pending_approval",
        reason_code: evaluation.reasonCode,
        message: evaluation.reasonMessage,
      });
    }

    // Approved - create virtual card
    // Get Stripe connection
    const connections = await db
      .select()
      .from(stripeConnections)
      .where(
        eq(stripeConnections.organizationId, agent.organizationId)
      )
      .limit(1);

    if (connections.length === 0) {
      await db
        .update(purchaseIntents)
        .set({
          status: "rejected",
          rejectionReason: "No Stripe connection found",
          rejectionCode: "NO_STRIPE_CONNECTION",
        })
        .where(eq(purchaseIntents.id, intent.id));

      return NextResponse.json(
        {
          status: "rejected",
          reason_code: "NO_STRIPE_CONNECTION",
          message: "Organization has not connected Stripe account",
        },
        { status: 400 }
      );
    }

    const connection = connections[0];
    if (connection.status !== "active") {
      await db
        .update(purchaseIntents)
        .set({
          status: "rejected",
          rejectionReason: "Stripe connection is not active",
          rejectionCode: "STRIPE_CONNECTION_INACTIVE",
        })
        .where(eq(purchaseIntents.id, intent.id));

      return NextResponse.json(
        {
          status: "rejected",
          reason_code: "STRIPE_CONNECTION_INACTIVE",
          message: "Stripe connection is not active",
        },
        { status: 400 }
      );
    }

    // Create virtual card
    try {
      const card = await createVirtualCard(connection.connectedAccountId, {
        amount: body.amount,
        currency: body.currency,
        expiresInHours: 1, // Card expires in 1 hour
      });

      // Get card details (PAN, CVC, etc.)
      const cardDetails = await getCardDetails(connection.connectedAccountId, card.id);

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

      // Update purchase intent
      await db
        .update(purchaseIntents)
        .set({
          status: "approved",
        })
        .where(eq(purchaseIntents.id, intent.id));

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
      });
    } catch (error) {
      console.error("Error creating virtual card:", error);
      
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

