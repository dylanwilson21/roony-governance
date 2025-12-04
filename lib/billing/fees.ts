/**
 * Fee Calculation Service
 * 
 * Calculates Roony's transaction fees based on volume tiers and payment rails.
 * 
 * Volume Tiers (Base Rate):
 * - Starter:    $0 - $5,000      → 3.0%
 * - Growth:     $5,001 - $25,000 → 2.5%
 * - Business:   $25,001 - $100,000 → 2.0%
 * - Enterprise: $100,001+        → 1.5%
 * 
 * Rail Multipliers:
 * - stripe_card: 1.0x (standard)
 * - acp:         1.0x
 * - ap2:         0.8x
 * - x402:        0.6x (USDC)
 * - l402:        0.5x (Lightning)
 */

import { db } from "@/lib/database";
import { monthlyVolumes, transactionFees, purchaseIntents } from "@/lib/database/schema";
import { eq, and, sql } from "drizzle-orm";
import type { VolumeTier, FeeCalculation } from "@/lib/database/schema";

// Volume tiers
const VOLUME_TIERS: VolumeTier[] = [
  { name: "starter", minVolume: 0, maxVolume: 5000, baseRate: 0.03 },
  { name: "growth", minVolume: 5001, maxVolume: 25000, baseRate: 0.025 },
  { name: "business", minVolume: 25001, maxVolume: 100000, baseRate: 0.02 },
  { name: "enterprise", minVolume: 100001, maxVolume: Infinity, baseRate: 0.015 },
];

// Rail multipliers
const RAIL_MULTIPLIERS: Record<string, number> = {
  stripe_card: 1.0,
  visa_ic: 1.0,
  mastercard_ap: 1.0,
  acp: 1.0,
  ap2: 0.8,
  x402: 0.6,
  l402: 0.5,
};

/**
 * Get the current month string (YYYY-MM)
 */
export function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Get volume tier for an organization based on current month's volume
 */
export async function getVolumeTier(orgId: string): Promise<VolumeTier> {
  const currentMonth = getCurrentMonth();
  
  const volumes = await db
    .select()
    .from(monthlyVolumes)
    .where(
      and(
        eq(monthlyVolumes.organizationId, orgId),
        eq(monthlyVolumes.month, currentMonth)
      )
    )
    .limit(1);

  const totalVolume = volumes[0]?.totalVolume || 0;

  // Find the appropriate tier
  const tier = VOLUME_TIERS.find(
    (t) => totalVolume >= t.minVolume && totalVolume <= t.maxVolume
  );

  return tier || VOLUME_TIERS[0]; // Default to starter tier
}

/**
 * Calculate fee for a transaction
 */
export function calculateFee(
  amount: number,
  tier: VolumeTier,
  protocol: string
): FeeCalculation {
  const railMultiplier = RAIL_MULTIPLIERS[protocol] || 1.0;
  const effectiveRate = tier.baseRate * railMultiplier;
  const feeAmount = amount * effectiveRate;

  return {
    baseRate: tier.baseRate,
    railMultiplier,
    effectiveRate,
    amount: Math.ceil(feeAmount * 100) / 100, // Round up to nearest cent
  };
}

/**
 * Calculate fee with volume tier lookup
 */
export async function calculateFeeWithTier(
  orgId: string,
  amount: number,
  protocol: string = "stripe_card"
): Promise<{
  tier: VolumeTier;
  fee: FeeCalculation;
  totalToCharge: number;
}> {
  const tier = await getVolumeTier(orgId);
  const fee = calculateFee(amount, tier, protocol);
  const totalToCharge = amount + fee.amount;

  return {
    tier,
    fee,
    totalToCharge,
  };
}

/**
 * Get pre-authorization buffer amount
 * We authorize slightly more to account for potential differences
 */
export function getPreAuthBuffer(amount: number): number {
  // 5% buffer or minimum $1, whichever is greater
  const buffer = Math.max(amount * 0.05, 1);
  return Math.ceil((amount + buffer) * 100) / 100;
}

/**
 * Record a fee for a transaction
 */
export async function recordTransactionFee(
  purchaseIntentId: string,
  protocol: string,
  transactionAmount: number,
  tier: VolumeTier,
  fee: FeeCalculation
): Promise<string> {
  const result = await db
    .insert(transactionFees)
    .values({
      purchaseIntentId,
      protocol,
      transactionAmount,
      volumeTier: tier.name,
      baseRate: fee.baseRate,
      railMultiplier: fee.railMultiplier,
      effectiveRate: fee.effectiveRate,
      feeAmount: fee.amount,
      totalCharged: transactionAmount + fee.amount,
      status: "pending",
    })
    .returning({ id: transactionFees.id });

  return result[0].id;
}

/**
 * Update fee status after charge
 */
export async function updateFeeStatus(
  feeId: string,
  status: "charged" | "failed" | "refunded",
  stripeChargeId?: string
): Promise<void> {
  await db
    .update(transactionFees)
    .set({
      status,
      stripeChargeId: stripeChargeId || null,
      chargedAt: status === "charged" ? new Date() : null,
    })
    .where(eq(transactionFees.id, feeId));
}

/**
 * Update monthly volume after a successful transaction
 */
export async function updateMonthlyVolume(
  orgId: string,
  transactionAmount: number,
  feeAmount: number,
  protocol: string = "stripe_card"
): Promise<void> {
  const currentMonth = getCurrentMonth();

  // Try to update existing record
  const existing = await db
    .select()
    .from(monthlyVolumes)
    .where(
      and(
        eq(monthlyVolumes.organizationId, orgId),
        eq(monthlyVolumes.month, currentMonth)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing record
    const record = existing[0];
    const byProtocol = record.byProtocol
      ? JSON.parse(record.byProtocol)
      : {};
    byProtocol[protocol] = (byProtocol[protocol] || 0) + transactionAmount;

    const newVolume = (record.totalVolume || 0) + transactionAmount;
    const newTier = VOLUME_TIERS.find(
      (t) => newVolume >= t.minVolume && newVolume <= t.maxVolume
    );

    await db
      .update(monthlyVolumes)
      .set({
        totalVolume: newVolume,
        transactionCount: (record.transactionCount || 0) + 1,
        feeRevenue: (record.feeRevenue || 0) + feeAmount,
        volumeTier: newTier?.name || "starter",
        byProtocol: JSON.stringify(byProtocol),
        updatedAt: new Date(),
      })
      .where(eq(monthlyVolumes.id, record.id));
  } else {
    // Create new record
    const tier = VOLUME_TIERS.find(
      (t) => transactionAmount >= t.minVolume && transactionAmount <= t.maxVolume
    );

    await db.insert(monthlyVolumes).values({
      organizationId: orgId,
      month: currentMonth,
      totalVolume: transactionAmount,
      transactionCount: 1,
      feeRevenue: feeAmount,
      volumeTier: tier?.name || "starter",
      byProtocol: JSON.stringify({ [protocol]: transactionAmount }),
    });
  }
}

/**
 * Get organization's current month volume and tier
 */
export async function getOrgVolumeInfo(orgId: string): Promise<{
  month: string;
  totalVolume: number;
  transactionCount: number;
  feeRevenue: number;
  tier: VolumeTier;
  byProtocol: Record<string, number>;
}> {
  const currentMonth = getCurrentMonth();
  
  const volumes = await db
    .select()
    .from(monthlyVolumes)
    .where(
      and(
        eq(monthlyVolumes.organizationId, orgId),
        eq(monthlyVolumes.month, currentMonth)
      )
    )
    .limit(1);

  const record = volumes[0];
  const totalVolume = record?.totalVolume || 0;
  const tier = VOLUME_TIERS.find(
    (t) => totalVolume >= t.minVolume && totalVolume <= t.maxVolume
  ) || VOLUME_TIERS[0];

  return {
    month: currentMonth,
    totalVolume,
    transactionCount: record?.transactionCount || 0,
    feeRevenue: record?.feeRevenue || 0,
    tier,
    byProtocol: record?.byProtocol ? JSON.parse(record.byProtocol) : {},
  };
}

/**
 * Get fee rate preview for display purposes
 */
export function getFeeRatePreview(
  currentVolume: number,
  protocol: string = "stripe_card"
): {
  currentRate: string;
  nextTier: VolumeTier | null;
  volumeToNextTier: number | null;
  nextTierRate: string | null;
} {
  const currentTier = VOLUME_TIERS.find(
    (t) => currentVolume >= t.minVolume && currentVolume <= t.maxVolume
  ) || VOLUME_TIERS[0];

  const multiplier = RAIL_MULTIPLIERS[protocol] || 1.0;
  const currentRate = `${(currentTier.baseRate * multiplier * 100).toFixed(1)}%`;

  // Find next tier
  const currentIndex = VOLUME_TIERS.indexOf(currentTier);
  const nextTier = currentIndex < VOLUME_TIERS.length - 1
    ? VOLUME_TIERS[currentIndex + 1]
    : null;

  return {
    currentRate,
    nextTier,
    volumeToNextTier: nextTier ? nextTier.minVolume - currentVolume : null,
    nextTierRate: nextTier
      ? `${(nextTier.baseRate * multiplier * 100).toFixed(1)}%`
      : null,
  };
}

// Export volume tiers for reference
export { VOLUME_TIERS, RAIL_MULTIPLIERS };

