# Stripe Integration

## Overview

Roony uses Stripe Connect for secure payment infrastructure access and Stripe Issuing for virtual card creation.

## Stripe Connect

### OAuth Flow

Instead of storing raw API keys, Roony uses Stripe Connect's OAuth flow:

1. Customer clicks "Connect Stripe" in dashboard
2. Redirect to Stripe OAuth page
3. Customer approves connection
4. Stripe redirects back with authorization code
5. Exchange code for access token
6. Store connected account ID and scoped token

### Required Permissions

- `issuing:read` - Read card details and transactions
- `issuing:write` - Create and manage virtual cards
- `charges:read` - Read charge information (if needed)

### Connected Account Management

- Store `connected_account_id` in database
- Store encrypted access token
- Handle token refresh (tokens expire)
- Handle revocation (customer disconnects)

## Stripe Issuing

### Virtual Card Creation

When a purchase is approved:

```typescript
const card = await stripe.issuing.cards.create({
  type: 'virtual',
  currency: 'usd',
  status: 'active',
  spending_controls: {
    spending_limits: [{
      amount: approvedAmount,
      interval: 'all_time'
    }],
    allowed_categories: allowedMCCs,
    blocked_categories: blockedMCCs,
  }
}, {
  stripeAccount: connectedAccountId
});
```

### Card Constraints

- **Hard limit**: Set to approved amount (with small buffer)
- **MCC filters**: Only allow specific merchant categories
- **Merchant lock**: Lock to specific merchant (if known)
- **Country limits**: Restrict to specific countries

### Card Lifecycle

1. **Create**: On purchase approval
2. **Active**: Card is ready for use
3. **Used**: After first successful authorization
4. **Expired**: After expiry time (e.g., 1 hour)
5. **Canceled**: If purchase fails or is revoked

### Card Details

Return to agent:
- Card number (PAN)
- Expiry month/year
- CVC
- Billing ZIP

**Security Note**: In production, consider using payment tokens or hosted checkout instead of returning raw card details.

## Webhooks

### Required Webhooks

Subscribe to these Stripe webhook events:

- `issuing_authorization.request` - Authorization attempt
- `issuing_authorization.created` - Authorization created
- `charge.succeeded` - Transaction settled
- `issuing_card.created` - Card created
- `issuing_card.updated` - Card status changed

### Webhook Processing

1. **Verify signature**: Validate webhook came from Stripe
2. **Idempotency**: Check if event already processed
3. **Match to intent**: Find original purchase intent
4. **Update transaction**: Record authorization/settlement
5. **Verify match**: Check merchant/amount/MCC match expectations
6. **Update budgets**: Deduct from agent/project/org budgets
7. **Flag discrepancies**: If something doesn't match

### Webhook Endpoint

`POST /api/webhooks/stripe`

```typescript
// Verify signature
const sig = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  req.body,
  sig,
  process.env.STRIPE_WEBHOOK_SECRET
);

// Process event
switch (event.type) {
  case 'issuing_authorization.request':
    await handleAuthorizationRequest(event.data.object);
    break;
  case 'charge.succeeded':
    await handleChargeSucceeded(event.data.object);
    break;
  // ... other events
}
```

## Error Handling

### Stripe API Errors

- **Rate limiting**: Implement exponential backoff
- **Invalid request**: Log and return user-friendly error
- **Network errors**: Retry with backoff
- **Authentication errors**: Refresh token or reconnect

### Card Creation Failures

- If card creation fails, return error to agent
- Log failure reason
- Don't charge customer for failed card creation
- Allow retry

## Security Best Practices

1. **Never store raw API keys** - Use Connect tokens only
2. **Encrypt stored tokens** - Use encryption at rest
3. **Verify webhook signatures** - Always validate
4. **Use idempotency keys** - Prevent duplicate processing
5. **Log all operations** - Full audit trail
6. **Monitor for anomalies** - Alert on unusual patterns

## Testing

### Test Mode

Use Stripe test mode for development:
- Test API keys (prefix: `sk_test_`)
- Test card numbers (e.g., `4242 4242 4242 4242`)
- Test webhooks via Stripe CLI

### Stripe CLI

```bash
# Listen for webhooks locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger issuing_authorization.request
```

## Environment Variables

```env
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...
```

