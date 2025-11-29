import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import crypto from "crypto";

/**
 * GET /api/stripe/connect
 * Initiate Stripe Connect OAuth flow
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
    if (!clientId) {
      return NextResponse.redirect(
        new URL("/dashboard/settings?error=Stripe Connect not configured", request.url)
      );
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString("hex");
    
    // Store state in cookie for verification
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/api/stripe/connect/callback`;
    
    const stripeConnectUrl = new URL("https://connect.stripe.com/oauth/authorize");
    stripeConnectUrl.searchParams.set("response_type", "code");
    stripeConnectUrl.searchParams.set("client_id", clientId);
    stripeConnectUrl.searchParams.set("scope", "read_write");
    stripeConnectUrl.searchParams.set("redirect_uri", redirectUrl);
    stripeConnectUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(stripeConnectUrl.toString());
    response.cookies.set("stripe_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
    });

    return response;
  } catch (error) {
    console.error("Stripe Connect error:", error);
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=Failed to initiate Stripe Connect", request.url)
    );
  }
}

