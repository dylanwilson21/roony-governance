# Stripe Integration

## Overview

Roony uses Stripe for payment processing:

- **Phase 0+**: Customers save credit/debit cards. Roony issues virtual cards from its master Stripe Issuing account.
- **Legacy**: Stripe Connect OAuth flow (deprecated in Phase 0)

## Phase 0: Saved Payment Methods Model

### How It Works

1. Customer adds a credit/debit card in the dashboard
2. Card is attached to a Stripe Customer created under Roony's account
3. When an agent requests a purchase:
   - Roony pre-authorizes the customer's card (amount + fee + buffer)
   - Roony creates a JIT virtual card from its master Issuing account
   - Agent uses the card at the merchant
4. When the card is charged (Stripe webhook):
   - Roony captures the exact amount + fee from the pre-auth
   - Monthly volume is updated for tier calculation

### Customer Payment Methods

Cards are stored securely with Stripe. Roony only stores:
- Last 4 digits
- Card brand (Visa, Mastercard, etc.)
- Expiration date
- Stripe PaymentMethod ID

### Fee Structure

Fees are calculated based on monthly volume:

| Monthly Volume | Base Rate |
|----------------|-----------|
| $0 - $5,000 | 3.0% |
| $5,001 - $25,000 | 2.5% |
| $25,001 - $100,000 | 2.0% |
| $100,001+ | 1.5% |

### Pre-Authorization Flow

```
1. Agent calls POST /api/v1/purchase_intent
2. Get customer's default payment method
3. Calculate fee based on volume tier
4. Pre-authorize: amount + fee + 5% buffer
5. Create virtual card (limited to requested amount)
6. Return card to agent
7. Agent uses card at merchant
8. Stripe webhook: issuing_authorization.created
9. Capture exact amount + fee from pre-auth
10. Release unused buffer
```

### Stripe API Calls

```typescript
// Pre-authorize customer's card
const preAuth = await stripe.paymentIntents.create({
  amount: amountInCents,
  currency: 'usd',
  customer: customerId,
  payment_method: paymentMethodId,
  capture_method: 'manual',
  confirm: true,
});

// Create virtual card from Roony's account
const card = await stripe.issuing.cards.create({
  cardholder: process.env.ROONY_CARDHOLDER_ID,
  type: 'virtual',
  currency: 'usd',
  spending_controls: {
    spending_limits: [{
      amount: amountInCents,
      interval: 'all_time',
    }],
  },
  metadata: { purchaseIntentId, agentId, organizationId },
});

// Capture pre-auth after card is used
const captured = await stripe.paymentIntents.capture(preAuthId, {
  amount_to_capture: actualAmountPlusFee,
});
```

## Stripe Issuing

### Virtual Card Creation

Cards are now created from Roony's master Issuing account:

```typescript
const card = await stripe.issuing.cards.create({
  cardholder: process.env.ROONY_CARDHOLDER_ID, // Roony's cardholder
  type: 'virtual',
  currency: 'usd',
  status: 'active',
  spending_controls: {
    spending_limits: [{
      amount: Math.round(amount * 100),
      interval: 'all_time',
    }],
  },
  metadata: {
    organizationId,
    agentId,
    purchaseIntentId,
    platform: 'roony',
  },
});
```

### Card Constraints

- **Hard limit**: Set to approved amount only
- **Single use**: Cards expire after 1 hour or first use
- **Metadata**: Links card back to purchase intent

### Card Lifecycle

1. **Create**: On purchase approval
2. **Active**: Card is ready for use
3. **Used**: After first successful authorization
4. **Expired**: After expiry time (1 hour default)
5. **Canceled**: If purchase fails or is revoked

## Webhooks

### Required Webhooks

Subscribe to these Stripe webhook events:

- `issuing_authorization.request` - Real-time authorization attempt
- `issuing_authorization.created` - Authorization created (triggers capture)
- `issuing_transaction.created` - Transaction settled
- `charge.succeeded` - Payment captured
- `charge.refunded` - Refund processed
- `issuing_card.created` - Card created
- `issuing_card.updated` - Card status changed

### Webhook Processing

```typescript
case 'issuing_authorization.created': {
  // Find purchase intent via card metadata
  const purchaseIntent = await findByCardId(auth.card.id);
  
  if (purchaseIntent?.stripePreAuthId) {
    // Capture pre-auth for actual amount + fee
    const actualAmount = auth.amount / 100;
    const fee = purchaseIntent.feeAmount;
    await capturePayment(purchaseIntent.stripePreAuthId, actualAmount + fee);
    
    // Update monthly volume
    await updateMonthlyVolume(purchaseIntent.organizationId, actualAmount, fee);
  }
}
```

### Webhook Endpoint

`POST /api/webhooks/stripe`

## Environment Variables

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Phase 0: Roony's Issuing Account
ROONY_CARDHOLDER_ID=ich_xxx  # Cardholder under Roony's Stripe Issuing
```

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
stripe trigger issuing_authorization.created
```

### Test Payment Methods

In test mode, use Stripe's test payment method IDs:
- `pm_card_visa` - Visa card
- `pm_card_mastercard` - Mastercard
- `pm_card_amex` - American Express

## Migration from Stripe Connect

If migrating from the legacy Stripe Connect model:

1. The `stripe_connections` table is deprecated but kept for data
2. Existing customers need to add a payment method
3. New purchases use the saved card + Roony Issuing model
4. Legacy Connect routes have been removed

## Security Best Practices

1. **Never store raw card numbers** - Use Stripe PaymentMethods
2. **Encrypt sensitive data** - Tokens stored encrypted
3. **Verify webhook signatures** - Always validate
4. **Use idempotency keys** - Prevent duplicate processing
5. **Log all operations** - Full audit trail
6. **Monitor for anomalies** - Alert on unusual patterns
