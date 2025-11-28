import { stripe } from "./client";

/**
 * Get the Stripe Connect OAuth URL for connecting a customer's Stripe account
 */
export async function getConnectOAuthUrl(
  redirectUrl: string,
  state?: string
): Promise<string> {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.STRIPE_CONNECT_CLIENT_ID!,
    scope: "read_write",
    redirect_uri: redirectUrl,
  });

  if (state) {
    params.append("state", state);
  }

  return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeOAuthCode(
  code: string
): Promise<{
  access_token: string;
  refresh_token?: string;
  stripe_user_id: string;
  token_type: string;
  scope: string;
  livemode: boolean;
}> {
  const response = await fetch("https://connect.stripe.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.STRIPE_CONNECT_CLIENT_ID!,
      code,
      client_secret: process.env.STRIPE_SECRET_KEY!,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Stripe OAuth error: ${error.error_description || error.error}`);
  }

  return response.json();
}

/**
 * Get connected account information
 */
export async function getConnectedAccount(connectedAccountId: string) {
  return stripe.accounts.retrieve(connectedAccountId);
}

