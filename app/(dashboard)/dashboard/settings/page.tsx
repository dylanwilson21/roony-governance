"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StripeStatus {
  connected: boolean;
  status?: string;
  accountId?: string;
  connectedAt?: string;
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  
  const successMessage = searchParams.get("success");
  const errorMessage = searchParams.get("error");

  useEffect(() => {
    fetchStripeStatus();
  }, []);

  async function fetchStripeStatus() {
    try {
      const res = await fetch("/api/stripe/connect/status");
      if (res.ok) {
        const data = await res.json();
        setStripeStatus(data);
      }
    } catch (error) {
      console.error("Error fetching Stripe status:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleConnectStripe = () => {
    window.location.href = "/api/stripe/connect";
  };

  const handleDisconnectStripe = async () => {
    if (!confirm("Are you sure you want to disconnect Stripe? This will disable virtual card creation.")) {
      return;
    }
    
    setDisconnecting(true);
    try {
      const res = await fetch("/api/stripe/connect/status", { method: "DELETE" });
      if (res.ok) {
        setStripeStatus({ connected: false });
      }
    } catch (error) {
      console.error("Error disconnecting Stripe:", error);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Settings</h1>

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

      <Tabs defaultValue="stripe" className="space-y-6">
        <TabsList>
          <TabsTrigger value="stripe">Stripe Connection</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="api">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="stripe">
          <Card>
            <CardHeader>
              <CardTitle>Stripe Connection</CardTitle>
              <CardDescription>
                Connect your Stripe account to enable virtual card creation via Stripe Issuing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-[#635bff] rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">Stripe Account</p>
                    <p className="text-sm text-slate-500">
                      {loading ? "Checking status..." : stripeStatus?.connected ? `Connected: ${stripeStatus.accountId}` : "Not connected"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {loading ? (
                    <Badge variant="secondary">Loading...</Badge>
                  ) : stripeStatus?.connected ? (
                    <>
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Connected</Badge>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDisconnectStripe}
                        disabled={disconnecting}
                      >
                        {disconnecting ? "Disconnecting..." : "Disconnect"}
                      </Button>
                    </>
                  ) : (
                    <Button onClick={handleConnectStripe}>Connect Stripe</Button>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Requirements</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Stripe account with Issuing enabled</li>
                  <li>• Connected account must be verified</li>
                  <li>• Business account (not individual)</li>
                </ul>
              </div>

              {!stripeStatus?.connected && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-medium text-amber-900 mb-2">Configuration Required</h4>
                  <p className="text-sm text-amber-800">
                    To enable Stripe Connect, add these environment variables:
                  </p>
                  <ul className="text-sm text-amber-800 mt-2 space-y-1 font-mono">
                    <li>• STRIPE_CONNECT_CLIENT_ID</li>
                    <li>• STRIPE_SECRET_KEY</li>
                    <li>• NEXT_PUBLIC_APP_URL</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>
                Manage your organization details and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input id="org-name" placeholder="My Organization" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-email">Contact Email</Label>
                <Input id="org-email" type="email" placeholder="admin@example.com" />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Configure API settings and view your organization&apos;s API endpoint.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>API Endpoint</Label>
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

              <div className="bg-slate-50 border rounded-lg p-4">
                <h4 className="font-medium mb-2">Example Request</h4>
                <pre className="text-xs bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
{`curl -X POST ${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/v1/purchase_intent \\
  -H "Authorization: Bearer YOUR_AGENT_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "YOUR_AGENT_ID",
    "amount": 129.99,
    "currency": "usd",
    "description": "1 month Figma Professional",
    "merchant": {
      "name": "Figma",
      "url": "https://www.figma.com/pricing"
    }
  }'`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
