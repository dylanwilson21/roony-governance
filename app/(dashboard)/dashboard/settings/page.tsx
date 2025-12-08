"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PaymentMethod {
  id: string;
  brand: string | null;
  last4: string;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
  status: string;
}

interface OrgSettings {
  name: string;
  monthlyBudget: number | null;
  alertThreshold: number;
  guardrails: {
    blockCategories?: string[];
    requireApprovalAbove?: number | null;
    flagAllNewVendors?: boolean;
    maxTransactionAmount?: number | null;
  };
  alphaCardDetails?: {
    last4: string;
    exp_month: string;
    exp_year: string;
    hasCard: boolean;
  } | null;
}

interface VolumeInfo {
  month: string;
  totalVolume: number;
  transactionCount: number;
  feeRevenue: number;
  tier: {
    name: string;
    baseRate: number;
  };
}

function SettingsMessages() {
  const searchParams = useSearchParams();
  const successMessage = searchParams.get("success");
  const errorMessage = searchParams.get("error");

  return (
    <>
      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {errorMessage}
        </div>
      )}
    </>
  );
}

export default function SettingsPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [volumeInfo, setVolumeInfo] = useState<VolumeInfo | null>(null);
  
  // Organization settings state
  const [orgSettings, setOrgSettings] = useState<OrgSettings>({
    name: "",
    monthlyBudget: null,
    alertThreshold: 80,
    guardrails: {
      blockCategories: [],
      requireApprovalAbove: null,
      flagAllNewVendors: false,
      maxTransactionAmount: null,
    },
  });
  
  // Form state for guardrails
  const [budgetForm, setBudgetForm] = useState({
    monthlyBudget: "",
    alertThreshold: "80",
    blockCategories: "",
    requireApprovalAbove: "",
    flagAllNewVendors: false,
    maxTransactionAmount: "",
  });

  // Alpha card form state
  const [alphaCardForm, setAlphaCardForm] = useState({
    number: "",
    exp_month: "",
    exp_year: "",
    cvc: "",
  });
  const [savingCard, setSavingCard] = useState(false);

  useEffect(() => {
    fetchPaymentMethods();
    fetchOrgSettings();
    fetchVolumeInfo();
  }, []);

  async function fetchPaymentMethods() {
    try {
      const res = await fetch("/api/internal/payment-methods");
      if (res.ok) {
        const data = await res.json();
        setPaymentMethods(data.paymentMethods || []);
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrgSettings() {
    try {
      const res = await fetch("/api/internal/settings/organization");
      if (res.ok) {
        const data = await res.json();
        setOrgSettings(data);
        setBudgetForm({
          monthlyBudget: data.monthlyBudget?.toString() || "",
          alertThreshold: ((data.alertThreshold || 0.8) * 100).toString(),
          blockCategories: data.guardrails?.blockCategories?.join(", ") || "",
          requireApprovalAbove: data.guardrails?.requireApprovalAbove?.toString() || "",
          flagAllNewVendors: data.guardrails?.flagAllNewVendors || false,
          maxTransactionAmount: data.guardrails?.maxTransactionAmount?.toString() || "",
        });
      }
    } catch (error) {
      console.error("Error fetching org settings:", error);
    }
  }

  async function fetchVolumeInfo() {
    try {
      // This endpoint would need to be created or use existing analytics
      const res = await fetch("/api/internal/analytics");
      if (res.ok) {
        const data = await res.json();
        setVolumeInfo({
          month: new Date().toISOString().slice(0, 7),
          totalVolume: data.monthlySpend || 0,
          transactionCount: data.todayTransactions || 0,
          feeRevenue: 0, // Calculate from transactions
          tier: {
            name: data.monthlySpend < 5000 ? "Starter" : 
                  data.monthlySpend < 25000 ? "Growth" :
                  data.monthlySpend < 100000 ? "Business" : "Enterprise",
            baseRate: data.monthlySpend < 5000 ? 0.03 : 
                      data.monthlySpend < 25000 ? 0.025 :
                      data.monthlySpend < 100000 ? 0.02 : 0.015,
          },
        });
      }
    } catch (error) {
      console.error("Error fetching volume info:", error);
    }
  }

  async function handleDeletePaymentMethod(id: string) {
    if (!confirm("Are you sure you want to remove this payment method?")) {
      return;
    }
    
    setDeletingId(id);
    try {
      const res = await fetch(`/api/internal/payment-methods/${id}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        setPaymentMethods(paymentMethods.filter(pm => pm.id !== id));
      } else {
        const error = await res.json();
        alert(error.error || "Failed to remove payment method");
      }
    } catch (error) {
      console.error("Error removing payment method:", error);
      alert("Failed to remove payment method");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSetDefault(id: string) {
    try {
      const res = await fetch(`/api/internal/payment-methods/${id}/default`, {
        method: "PUT",
      });
      
      if (res.ok) {
        // Update local state
        setPaymentMethods(paymentMethods.map(pm => ({
          ...pm,
          isDefault: pm.id === id,
        })));
      } else {
        alert("Failed to set default payment method");
      }
    } catch (error) {
      console.error("Error setting default:", error);
    }
  }

  async function saveGuardrails() {
    setSaving(true);
    try {
      const payload = {
        monthlyBudget: budgetForm.monthlyBudget ? parseFloat(budgetForm.monthlyBudget) : null,
        alertThreshold: parseFloat(budgetForm.alertThreshold) / 100,
        guardrails: {
          blockCategories: budgetForm.blockCategories 
            ? budgetForm.blockCategories.split(",").map(s => s.trim()).filter(Boolean)
            : [],
          requireApprovalAbove: budgetForm.requireApprovalAbove 
            ? parseFloat(budgetForm.requireApprovalAbove) 
            : null,
          flagAllNewVendors: budgetForm.flagAllNewVendors,
          maxTransactionAmount: budgetForm.maxTransactionAmount 
            ? parseFloat(budgetForm.maxTransactionAmount) 
            : null,
        },
      };

      const res = await fetch("/api/internal/settings/organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setOrgSettings(data);
        alert("Settings saved successfully!");
      } else {
        alert("Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function saveAlphaCard() {
    // Validate card details
    if (!alphaCardForm.number || !alphaCardForm.exp_month || !alphaCardForm.exp_year || !alphaCardForm.cvc) {
      alert("Please fill in all card fields");
      return;
    }

    setSavingCard(true);
    try {
      const res = await fetch("/api/internal/settings/organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alphaCardDetails: {
            number: alphaCardForm.number.replace(/\s/g, ""),
            exp_month: alphaCardForm.exp_month,
            exp_year: alphaCardForm.exp_year,
            cvc: alphaCardForm.cvc,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setOrgSettings(data);
        // Clear the form
        setAlphaCardForm({ number: "", exp_month: "", exp_year: "", cvc: "" });
        alert("Card saved successfully!");
      } else {
        alert("Failed to save card");
      }
    } catch (error) {
      console.error("Error saving card:", error);
      alert("Failed to save card");
    } finally {
      setSavingCard(false);
    }
  }

  async function removeAlphaCard() {
    if (!confirm("Are you sure you want to remove this card?")) {
      return;
    }

    setSavingCard(true);
    try {
      const res = await fetch("/api/internal/settings/organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alphaCardDetails: null }),
      });

      if (res.ok) {
        const data = await res.json();
        setOrgSettings(data);
        alert("Card removed");
      } else {
        alert("Failed to remove card");
      }
    } catch (error) {
      console.error("Error removing card:", error);
    } finally {
      setSavingCard(false);
    }
  }

  function getBrandIcon(brand: string | null) {
    const brandLower = brand?.toLowerCase() || "";
    if (brandLower === "visa") {
      return "💳"; // In production, use actual brand SVGs
    } else if (brandLower === "mastercard") {
      return "💳";
    } else if (brandLower === "amex") {
      return "💳";
    }
    return "💳";
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Settings</h1>

      <Suspense fallback={null}>
        <SettingsMessages />
      </Suspense>

      <Tabs defaultValue="alpha-card" className="space-y-6">
        <TabsList>
          <TabsTrigger value="alpha-card">Alpha Card</TabsTrigger>
          <TabsTrigger value="guardrails">Spending Guardrails</TabsTrigger>
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="billing">Billing & Fees</TabsTrigger>
          <TabsTrigger value="api">API Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="alpha-card">
          <div className="space-y-6">
            {/* Warning Banner */}
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h4 className="font-semibold text-amber-900">Alpha Version - Use a Virtual Card</h4>
                    <p className="text-sm text-amber-800 mt-1">
                      This card will be returned to your AI agents when purchases are approved. 
                      For safety, use a virtual card service like Privacy.com with its own spending limits.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Card */}
            {orgSettings.alphaCardDetails?.hasCard ? (
              <Card>
                <CardHeader>
                  <CardTitle>Current Card</CardTitle>
                  <CardDescription>
                    This card will be used for agent purchases.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                    <div className="flex items-center space-x-4">
                      <span className="text-3xl">💳</span>
                      <div>
                        <p className="font-medium">
                          •••• •••• •••• {orgSettings.alphaCardDetails.last4}
                        </p>
                        <p className="text-sm text-slate-500">
                          Expires {orgSettings.alphaCardDetails.exp_month}/{orgSettings.alphaCardDetails.exp_year}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={removeAlphaCard}
                      disabled={savingCard}
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      {savingCard ? "Removing..." : "Remove Card"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Add Card for Agent Purchases</CardTitle>
                  <CardDescription>
                    Enter the card details that your agents will use when making approved purchases.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      placeholder="4242 4242 4242 4242"
                      value={alphaCardForm.number}
                      onChange={(e) => setAlphaCardForm({ ...alphaCardForm, number: e.target.value })}
                      maxLength={19}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expMonth">Exp Month</Label>
                      <Input
                        id="expMonth"
                        placeholder="12"
                        value={alphaCardForm.exp_month}
                        onChange={(e) => setAlphaCardForm({ ...alphaCardForm, exp_month: e.target.value })}
                        maxLength={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expYear">Exp Year</Label>
                      <Input
                        id="expYear"
                        placeholder="2026"
                        value={alphaCardForm.exp_year}
                        onChange={(e) => setAlphaCardForm({ ...alphaCardForm, exp_year: e.target.value })}
                        maxLength={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvc">CVC</Label>
                      <Input
                        id="cvc"
                        placeholder="123"
                        type="password"
                        value={alphaCardForm.cvc}
                        onChange={(e) => setAlphaCardForm({ ...alphaCardForm, cvc: e.target.value })}
                        maxLength={4}
                      />
                    </div>
                  </div>
                  <div className="pt-4">
                    <Button onClick={saveAlphaCard} disabled={savingCard}>
                      {savingCard ? "Saving..." : "Save Card"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* How It Works */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <h4 className="font-medium text-blue-900 mb-2">How It Works</h4>
                <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                  <li>Your agent requests a purchase through the MCP endpoint</li>
                  <li>Roony checks the request against your spending limits and guardrails</li>
                  <li>If approved, your agent receives this card to complete the purchase</li>
                  <li>If denied, your agent gets the rejection reason</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="guardrails">
          <div className="space-y-6">
            {/* Organization Budget */}
            <Card>
              <CardHeader>
                <CardTitle>Organization Budget</CardTitle>
                <CardDescription>
                  Set the total monthly budget for your organization. All agent spend counts toward this.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="monthlyBudget">Monthly Budget ($)</Label>
                    <Input
                      id="monthlyBudget"
                      type="number"
                      placeholder="10000"
                      value={budgetForm.monthlyBudget}
                      onChange={(e) => setBudgetForm({ ...budgetForm, monthlyBudget: e.target.value })}
                    />
                    <p className="text-xs text-slate-500">Total spending limit per month for all agents</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="alertThreshold">Alert at % Used</Label>
                    <Input
                      id="alertThreshold"
                      type="number"
                      placeholder="80"
                      value={budgetForm.alertThreshold}
                      onChange={(e) => setBudgetForm({ ...budgetForm, alertThreshold: e.target.value })}
                    />
                    <p className="text-xs text-slate-500">Show warning when budget reaches this %</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Guardrails */}
            <Card>
              <CardHeader>
                <CardTitle>Organization Guardrails</CardTitle>
                <CardDescription>
                  These rules apply to ALL agents in your organization, in addition to any agent-specific controls.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="maxTransaction">Maximum Transaction Amount ($)</Label>
                  <Input
                    id="maxTransaction"
                    type="number"
                    placeholder="1000"
                    value={budgetForm.maxTransactionAmount}
                    onChange={(e) => setBudgetForm({ ...budgetForm, maxTransactionAmount: e.target.value })}
                  />
                  <p className="text-xs text-slate-500">Hard cap on any single transaction (blocks purchases above this)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requireApproval">Require Approval Above ($)</Label>
                  <Input
                    id="requireApproval"
                    type="number"
                    placeholder="500"
                    value={budgetForm.requireApprovalAbove}
                    onChange={(e) => setBudgetForm({ ...budgetForm, requireApprovalAbove: e.target.value })}
                  />
                  <p className="text-xs text-slate-500">All purchases above this amount need human approval</p>
                </div>

                <div className="flex items-center space-x-2 py-2">
                  <input
                    type="checkbox"
                    id="flagNewVendors"
                    checked={budgetForm.flagAllNewVendors}
                    onChange={(e) => setBudgetForm({ ...budgetForm, flagAllNewVendors: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <Label htmlFor="flagNewVendors" className="text-sm font-normal cursor-pointer">
                    Require approval for all purchases from new vendors
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="blockCategories">Block Categories / Merchants</Label>
                  <Input
                    id="blockCategories"
                    placeholder="gambling, adult, facebook ads"
                    value={budgetForm.blockCategories}
                    onChange={(e) => setBudgetForm({ ...budgetForm, blockCategories: e.target.value })}
                  />
                  <p className="text-xs text-slate-500">Comma-separated list of blocked categories or merchant keywords</p>
                </div>

                <div className="pt-4 border-t">
                  <Button onClick={saveGuardrails} disabled={saving}>
                    {saving ? "Saving..." : "Save Guardrails"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <h4 className="font-medium text-blue-900 mb-2">How Guardrails Work</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Organization guardrails apply to ALL agents</li>
                  <li>• Agent-specific controls are checked FIRST, then org guardrails</li>
                  <li>• A purchase must pass BOTH agent and org checks</li>
                  <li>• Blocked categories/merchants are rejected immediately</li>
                  <li>• Approval thresholds send purchases to the review queue</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payment-methods">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>
                Manage the credit/debit cards used to fund agent purchases. Your card is charged after each purchase plus Roony&apos;s transaction fee.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Payment Methods List */}
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-slate-500">Loading payment methods...</div>
                ) : paymentMethods.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">💳</div>
                    <p className="text-slate-600 mb-4">No payment methods added yet</p>
                    <p className="text-sm text-slate-500">Add a credit or debit card to enable agent purchases</p>
                  </div>
                ) : (
                  paymentMethods.map((pm) => (
                    <div 
                      key={pm.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="text-3xl">{getBrandIcon(pm.brand)}</div>
                        <div>
                          <p className="font-medium capitalize">
                            {pm.brand || "Card"} •••• {pm.last4}
                          </p>
                          <p className="text-sm text-slate-500">
                            Expires {pm.expMonth}/{pm.expYear}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {pm.isDefault ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Default</Badge>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSetDefault(pm.id)}
                          >
                            Set Default
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeletePaymentMethod(pm.id)}
                          disabled={deletingId === pm.id}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          {deletingId === pm.id ? "Removing..." : "Remove"}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Card Section */}
              <div className="border-t pt-6">
                <h4 className="font-medium mb-4">Add a Payment Method</h4>
                <div className="bg-slate-50 border border-dashed rounded-lg p-8 text-center">
                  <p className="text-slate-600 mb-4">
                    To add a card, use Stripe&apos;s secure card element (coming soon) or contact support.
                  </p>
                  <p className="text-sm text-slate-500">
                    In development mode, test cards can be added via the API.
                  </p>
                </div>
              </div>

              {/* Info Card */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">How Payment Works</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Your card is pre-authorized when an agent requests a purchase</li>
                  <li>• The exact amount + Roony fee is captured when the purchase completes</li>
                  <li>• Unused pre-authorizations are automatically released</li>
                  <li>• Refunds are automatically returned to your card</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <div className="space-y-6">
            {/* Current Tier */}
            <Card>
              <CardHeader>
                <CardTitle>Current Billing Tier</CardTitle>
                <CardDescription>
                  Your fee rate is based on your monthly transaction volume.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                  <div>
                    <p className="text-2xl font-bold text-blue-900">
                      {volumeInfo?.tier.name || "Starter"} Tier
                    </p>
                    <p className="text-blue-700">
                      {((volumeInfo?.tier.baseRate || 0.03) * 100).toFixed(1)}% per transaction
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">This month&apos;s volume</p>
                    <p className="text-xl font-semibold text-slate-900">
                      ${(volumeInfo?.totalVolume || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fee Tiers */}
            <Card>
              <CardHeader>
                <CardTitle>Volume-Based Pricing</CardTitle>
                <CardDescription>
                  Lower your fees by increasing volume. Rates reset monthly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: "Starter", min: 0, max: 5000, rate: 3.0 },
                    { name: "Growth", min: 5001, max: 25000, rate: 2.5 },
                    { name: "Business", min: 25001, max: 100000, rate: 2.0 },
                    { name: "Enterprise", min: 100001, max: null, rate: 1.5 },
                  ].map((tier) => {
                    const isCurrentTier = volumeInfo?.tier.name === tier.name;
                    return (
                      <div 
                        key={tier.name}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          isCurrentTier 
                            ? "bg-blue-50 border-blue-200" 
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          {isCurrentTier && (
                            <Badge className="bg-blue-600 text-white">Current</Badge>
                          )}
                          <div>
                            <p className="font-medium">{tier.name}</p>
                            <p className="text-sm text-slate-500">
                              ${tier.min.toLocaleString()} - {tier.max ? `$${tier.max.toLocaleString()}` : "∞"} / month
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-semibold">{tier.rate}%</p>
                          <p className="text-sm text-slate-500">per transaction</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Rail Multipliers */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Rail Discounts</CardTitle>
                <CardDescription>
                  Different payment methods have different costs. Crypto rails get discounted fees.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { name: "Card (Stripe)", multiplier: "1.0x", icon: "💳" },
                    { name: "ACP (OpenAI)", multiplier: "1.0x", icon: "🤖" },
                    { name: "AP2 (Google)", multiplier: "0.8x", icon: "🔷" },
                    { name: "x402 (USDC)", multiplier: "0.6x", icon: "💰", comingSoon: true },
                    { name: "L402 (Lightning)", multiplier: "0.5x", icon: "⚡", comingSoon: true },
                  ].map((rail) => (
                    <div 
                      key={rail.name}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{rail.icon}</span>
                        <span className="font-medium">{rail.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-600">{rail.multiplier}</span>
                        {rail.comingSoon && (
                          <Badge variant="secondary" className="text-xs">Soon</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-500 mt-4">
                  Effective fee = Base tier rate × Rail multiplier
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Configure API settings and view your organization&apos;s API endpoints.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>REST API Endpoint</Label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      readOnly 
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/purchase_intent`}
                      className="font-mono text-sm"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/v1/purchase_intent`)}
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>MCP Protocol Endpoint</Label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      readOnly 
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/mcp`}
                      className="font-mono text-sm"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/mcp`)}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">For AI platforms that support Model Context Protocol</p>
                </div>
              </div>

              <div className="bg-slate-50 border rounded-lg p-4">
                <h4 className="font-medium mb-2">Example Request</h4>
                <pre className="text-xs bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
{`curl -X POST ${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/v1/purchase_intent \\
  -H "Authorization: Bearer YOUR_AGENT_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 129.99,
    "currency": "usd",
    "description": "1 month Figma Professional",
    "merchant": {
      "name": "Figma"
    }
  }'`}
                </pre>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <h4 className="font-medium text-emerald-900 mb-2">Response now includes fee info</h4>
                <pre className="text-xs bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
{`{
  "status": "approved",
  "card": { "number": "...", ... },
  "hard_limit_amount": 129.99,
  "fee": {
    "amount": 3.90,
    "rate": "3.0%",
    "tier": "starter"
  }
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
