"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [stripeConnected, setStripeConnected] = useState(false);

  const handleConnectStripe = async () => {
    // In production, this would redirect to Stripe Connect OAuth
    const redirectUrl = `${window.location.origin}/api/stripe/connect/callback`;
    const state = Math.random().toString(36).substring(7);
    
    // Store state for verification
    sessionStorage.setItem("stripe_oauth_state", state);
    
    // Redirect to Stripe Connect
    const stripeConnectUrl = new URL("https://connect.stripe.com/oauth/authorize");
    stripeConnectUrl.searchParams.set("response_type", "code");
    stripeConnectUrl.searchParams.set("client_id", process.env.NEXT_PUBLIC_STRIPE_CONNECT_CLIENT_ID || "");
    stripeConnectUrl.searchParams.set("scope", "read_write");
    stripeConnectUrl.searchParams.set("redirect_uri", redirectUrl);
    stripeConnectUrl.searchParams.set("state", state);
    
    // For demo, just show an alert
    alert("In production, this would redirect to Stripe Connect OAuth.\n\nSet NEXT_PUBLIC_STRIPE_CONNECT_CLIENT_ID in your environment to enable.");
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Settings</h1>

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
                      {stripeConnected ? "Connected" : "Not connected"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {stripeConnected ? (
                    <>
                      <Badge className="bg-emerald-100 text-emerald-700">Connected</Badge>
                      <Button variant="outline" size="sm">Disconnect</Button>
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
    "agent_id": "agent_123",
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
