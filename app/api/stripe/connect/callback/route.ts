import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/database";
import { stripeConnections } from "@/lib/database/schema";
import { exchangeOAuthCode } from "@/lib/stripe/connect";

/**
 * GET /api/stripe/connect/callback
 * Handle Stripe Connect OAuth callback
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      console.error("Stripe Connect error:", error, errorDescription);
      return NextResponse.redirect(
        new URL(`/dashboard/settings?error=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/dashboard/settings?error=No authorization code received", request.url)
      );
    }

    // Exchange code for access token
    const tokenResponse = await exchangeOAuthCode(code);

    // Store the connection
    await db.insert(stripeConnections).values({
      organizationId: session.user.organizationId,
      connectedAccountId: tokenResponse.stripe_user_id,
      accessTokenEncrypted: tokenResponse.access_token, // In production, encrypt this
      refreshTokenEncrypted: tokenResponse.refresh_token || null,
      status: "active",
    });

    return NextResponse.redirect(
      new URL("/dashboard/settings?success=Stripe connected successfully", request.url)
    );
  } catch (error) {
    console.error("Stripe Connect callback error:", error);
    return NextResponse.redirect(
      new URL(`/dashboard/settings?error=${encodeURIComponent("Failed to connect Stripe")}`, request.url)
    );
  }
}

