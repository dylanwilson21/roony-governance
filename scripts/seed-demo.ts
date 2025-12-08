/**
 * Demo Data Seed Script
 * 
 * Populates the database with realistic demo data for investor demos.
 * Run with: npx tsx scripts/seed-demo.ts
 */

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { createHash, randomBytes } from "crypto";
import * as bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import {
  organizations,
  users,
  agents,
  purchaseIntents,
  pendingApprovals,
  knownMerchants,
  budgetTracking,
} from "../lib/database/schema";

const sqlite = new Database("roony.db");
const db = drizzle(sqlite);

// Helper to generate API key and hash
function generateApiKey(): { key: string; hash: string } {
  const key = `rk_demo_${randomBytes(16).toString("hex")}`;
  const hash = createHash("sha256").update(key).digest("hex");
  return { key, hash };
}

// Helper to get date relative to now
function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function seed() {
  console.log("🌱 Seeding demo data...\n");

  // If demo org exists, clean it up to make the seed idempotent
  const existingOrg = db.select().from(organizations).all();
  const demoOrg = existingOrg.find((o) => o.slug === "demo-company");

  if (demoOrg) {
    console.log("⚠️  Demo org exists — clearing old demo data for a fresh seed.");
    // Order matters for FK constraints
    const demoOrgId = demoOrg.id;
    db.delete(pendingApprovals).where(eq(pendingApprovals.organizationId, demoOrgId)).run();
    db.delete(purchaseIntents).where(eq(purchaseIntents.organizationId, demoOrgId)).run();
    db.delete(knownMerchants).where(eq(knownMerchants.organizationId, demoOrgId)).run();
    db.delete(agents).where(eq(agents.organizationId, demoOrgId)).run();
    db.delete(budgetTracking).where(eq(budgetTracking.organizationId, demoOrgId)).run();
    db.delete(users).where(eq(users.organizationId, demoOrgId)).run();
    db.delete(organizations).where(eq(organizations.id, demoOrgId)).run();
  }

  // Create demo organization
  const orgId = crypto.randomUUID();
  db.insert(organizations).values({
    id: orgId,
    name: "Acme AI Corp",
    slug: "demo-company",
    monthlyBudget: 10000,
    alertThreshold: 0.8,
    guardrails: JSON.stringify({
      maxTransactionAmount: 1000,
      requireApprovalAbove: 500,
      flagAllNewVendors: false,
      blockCategories: ["gambling", "adult"],
    }),
    createdAt: daysAgo(30),
    updatedAt: new Date(),
  }).run();
  console.log("✅ Created demo organization: Acme AI Corp");

  // Create demo user
  const userId = crypto.randomUUID();
  const passwordHash = await bcrypt.hash("demo123", 10);
  db.insert(users).values({
    id: userId,
    email: "demo@acme.ai",
    name: "Demo User",
    passwordHash,
    role: "admin",
    organizationId: orgId,
    createdAt: daysAgo(30),
    updatedAt: new Date(),
  }).run();
  console.log("✅ Created demo user: demo@acme.ai (password: demo123)");

  // Create agents
  const agentsData = [
    {
      id: crypto.randomUUID(),
      name: "Research Bot",
      description: "Handles research tasks, API subscriptions, and data sources",
      monthlyLimit: 500,
      dailyLimit: 100,
      perTransactionLimit: 75,
      approvalThreshold: 50,
      flagNewVendors: true,
      blockedMerchants: JSON.stringify(["facebook ads"]),
      status: "active" as const,
    },
    {
      id: crypto.randomUUID(),
      name: "Code Assistant",
      description: "Developer tools, IDE subscriptions, cloud services",
      monthlyLimit: 800,
      dailyLimit: 200,
      perTransactionLimit: 150,
      approvalThreshold: 100,
      flagNewVendors: false,
      blockedMerchants: null,
      allowedMerchants: JSON.stringify(["github", "aws", "vercel", "figma", "notion"]),
      status: "active" as const,
    },
    {
      id: crypto.randomUUID(),
      name: "Marketing Agent",
      description: "Handles marketing tool subscriptions and ad spend",
      monthlyLimit: 1500,
      dailyLimit: 300,
      perTransactionLimit: 250,
      approvalThreshold: 150,
      flagNewVendors: true,
      blockedMerchants: null,
      status: "active" as const,
    },
    {
      id: crypto.randomUUID(),
      name: "Support Bot",
      description: "Customer support tools and integrations",
      monthlyLimit: 200,
      dailyLimit: 50,
      perTransactionLimit: 30,
      approvalThreshold: 25,
      flagNewVendors: true,
      blockedMerchants: null,
      status: "paused" as const,
    },
  ];

  const agentKeys: { name: string; key: string }[] = [];

  for (const agent of agentsData) {
    const { key, hash } = generateApiKey();
    agentKeys.push({ name: agent.name, key });
    
    db.insert(agents).values({
      ...agent,
      organizationId: orgId,
      apiKeyHash: hash,
      createdAt: daysAgo(Math.floor(Math.random() * 20) + 5),
      updatedAt: new Date(),
    }).run();
  }
  console.log(`✅ Created ${agentsData.length} demo agents`);

  // Create known merchants
  const merchants = [
    "GitHub",
    "AWS",
    "Vercel",
    "Figma",
    "Notion",
    "Slack",
    "OpenAI",
    "Anthropic",
    "Google Cloud",
    "Stripe",
  ];

  for (const merchant of merchants) {
    db.insert(knownMerchants).values({
      id: crypto.randomUUID(),
      organizationId: orgId,
      merchantName: merchant,
      merchantNameNormalized: merchant.toLowerCase(),
      firstSeenAt: daysAgo(Math.floor(Math.random() * 20) + 5),
      lastSeenAt: daysAgo(Math.floor(Math.random() * 3)),
      transactionCount: Math.floor(Math.random() * 15) + 1,
    }).run();
  }
  console.log(`✅ Created ${merchants.length} known merchants`);

  // Create sample transactions (purchase intents)
  const sampleTransactions = [
    // Approved transactions
    { agent: agentsData[0], merchant: "OpenAI", amount: 20, status: "approved" as const, description: "API credits", daysAgo: 0 },
    { agent: agentsData[1], merchant: "GitHub", amount: 4, status: "approved" as const, description: "GitHub Copilot subscription", daysAgo: 1 },
    { agent: agentsData[1], merchant: "Vercel", amount: 20, status: "approved" as const, description: "Pro plan", daysAgo: 2 },
    { agent: agentsData[2], merchant: "Notion", amount: 10, status: "approved" as const, description: "Team workspace", daysAgo: 3 },
    { agent: agentsData[0], merchant: "Anthropic", amount: 45, status: "approved" as const, description: "Claude API usage", daysAgo: 4 },
    { agent: agentsData[1], merchant: "Figma", amount: 15, status: "approved" as const, description: "Professional plan", daysAgo: 5 },
    { agent: agentsData[2], merchant: "Slack", amount: 8.75, status: "approved" as const, description: "Pro plan per seat", daysAgo: 6 },
    { agent: agentsData[0], merchant: "Google Cloud", amount: 32.50, status: "approved" as const, description: "Compute usage", daysAgo: 7 },
    
    // Rejected transactions
    { agent: agentsData[0], merchant: "Unknown SaaS", amount: 150, status: "rejected" as const, description: "Annual subscription", rejectionCode: "OVER_TRANSACTION_LIMIT", rejectionReason: "Amount $150 exceeds per-transaction limit of $75", daysAgo: 2 },
    { agent: agentsData[2], merchant: "Gambling Site", amount: 50, status: "rejected" as const, description: "Credits", rejectionCode: "CATEGORY_BLOCKED", rejectionReason: "Merchant category 'gambling' is blocked", daysAgo: 4 },
    { agent: agentsData[1], merchant: "Random Tool", amount: 25, status: "rejected" as const, description: "Monthly fee", rejectionCode: "MERCHANT_NOT_ALLOWED", rejectionReason: "Merchant not in allowed list", daysAgo: 6 },
    
    // Pending approval
    { agent: agentsData[0], merchant: "New Analytics Tool", amount: 89, status: "pending_approval" as const, description: "Pro analytics subscription", daysAgo: 0, needsApproval: true, approvalReason: "NEW_VENDOR" },
    { agent: agentsData[2], merchant: "HubSpot", amount: 450, status: "pending_approval" as const, description: "Marketing Hub Starter", daysAgo: 0, needsApproval: true, approvalReason: "OVER_THRESHOLD" },
    { agent: agentsData[1], merchant: "AWS", amount: 650, status: "pending_approval" as const, description: "Reserved instance upfront", daysAgo: 1, needsApproval: true, approvalReason: "OVER_THRESHOLD" },
  ];

  let approvedSpend = 0;
  for (const tx of sampleTransactions) {
    const piId = crypto.randomUUID();
    const agent = agentsData.find(a => a.name === tx.agent.name)!;
    
    db.insert(purchaseIntents).values({
      id: piId,
      agentId: agent.id,
      organizationId: orgId,
      amount: tx.amount,
      currency: "usd",
      description: tx.description,
      merchantName: tx.merchant,
      status: tx.status,
      rejectionCode: tx.rejectionCode || null,
      rejectionReason: tx.rejectionReason || null,
      protocol: "stripe_card",
      feeAmount: tx.status === "approved" ? Math.round(tx.amount * 0.03 * 100) / 100 : null,
      createdAt: daysAgo(tx.daysAgo),
      updatedAt: daysAgo(tx.daysAgo),
    }).run();

    if (tx.status === "approved") {
      approvedSpend += tx.amount;
    }

    // Create pending approval record if needed
    if (tx.needsApproval) {
      db.insert(pendingApprovals).values({
        id: crypto.randomUUID(),
        purchaseIntentId: piId,
        organizationId: orgId,
        agentId: agent.id,
        amount: tx.amount,
        merchantName: tx.merchant,
        reason: tx.approvalReason!,
        reasonDetails: tx.approvalReason === "NEW_VENDOR" 
          ? "First purchase from this merchant" 
          : `Amount $${tx.amount} exceeds approval threshold`,
        status: "pending",
        createdAt: daysAgo(tx.daysAgo),
        updatedAt: daysAgo(tx.daysAgo),
      }).run();
    }
  }
  console.log(`✅ Created ${sampleTransactions.length} sample transactions`);

  // Create budget tracking entries
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  db.insert(budgetTracking).values({
    id: crypto.randomUUID(),
    organizationId: orgId,
    periodType: "monthly",
    periodStart: monthStart,
    amountSpent: approvedSpend,
    amountReserved: 0,
    limit: 10000,
    createdAt: monthStart,
    updatedAt: new Date(),
  }).run();

  // Agent-level budget tracking
  for (const agent of agentsData) {
    const agentSpend = sampleTransactions
      .filter(tx => tx.agent.name === agent.name && tx.status === "approved")
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    if (agentSpend > 0) {
      db.insert(budgetTracking).values({
        id: crypto.randomUUID(),
        organizationId: orgId,
        agentId: agent.id,
        periodType: "monthly",
        periodStart: monthStart,
        amountSpent: agentSpend,
        amountReserved: 0,
        limit: agent.monthlyLimit,
        createdAt: monthStart,
        updatedAt: new Date(),
      }).run();
    }
  }
  console.log("✅ Created budget tracking records");

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("🎉 Demo data seeded successfully!\n");
  console.log("📧 Login with:");
  console.log("   Email: demo@acme.ai");
  console.log("   Password: demo123\n");
  console.log("🔑 Agent API Keys (for testing):");
  for (const { name, key } of agentKeys) {
    console.log(`   ${name}: ${key}`);
  }
  console.log("\n" + "=".repeat(50));

  sqlite.close();
}

seed().catch((err) => {
  console.error("Error seeding demo data:", err);
  process.exit(1);
});

