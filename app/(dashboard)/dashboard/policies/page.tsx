"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Policy {
  id: string;
  name: string;
  description: string | null;
  scopeType: string;
  action: string;
  enabled: boolean;
  rules: {
    budget?: {
      monthlyLimit?: number;
      perTransactionLimit?: number;
    };
  };
  createdAt: string;
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    scopeType: "org",
    monthlyLimit: "",
    perTransactionLimit: "",
    action: "approve",
  });

  useEffect(() => {
    fetchPolicies();
  }, []);

  async function fetchPolicies() {
    try {
      const res = await fetch("/api/internal/policies");
      if (res.ok) {
        const data = await res.json();
        setPolicies(data.policies);
      }
    } catch (error) {
      console.error("Error fetching policies:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createPolicy() {
    if (!formData.name.trim()) return;
    
    setCreating(true);
    try {
      const rules: any = { budget: {} };
      if (formData.monthlyLimit) {
        rules.budget.monthlyLimit = parseFloat(formData.monthlyLimit);
      }
      if (formData.perTransactionLimit) {
        rules.budget.perTransactionLimit = parseFloat(formData.perTransactionLimit);
      }

      const res = await fetch("/api/internal/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          scopeType: formData.scopeType,
          scopeIds: [],
          rules,
          action: formData.action,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPolicies([...policies, data.policy]);
        setCreateOpen(false);
        setFormData({
          name: "",
          description: "",
          scopeType: "org",
          monthlyLimit: "",
          perTransactionLimit: "",
          action: "approve",
        });
      }
    } catch (error) {
      console.error("Error creating policy:", error);
    } finally {
      setCreating(false);
    }
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case "approve":
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Approve</Badge>;
      case "reject":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Reject</Badge>;
      case "require_approval":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Require Approval</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Policies</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>Create Policy</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Policy</DialogTitle>
              <DialogDescription>
                Define spending rules for your AI agents.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="policy-name">Policy Name</Label>
                <Input
                  id="policy-name"
                  placeholder="Monthly Budget Limit"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  placeholder="Limits monthly spending for all agents"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthly-limit">Monthly Limit ($)</Label>
                  <Input
                    id="monthly-limit"
                    type="number"
                    placeholder="1000"
                    value={formData.monthlyLimit}
                    onChange={(e) => setFormData({ ...formData, monthlyLimit: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transaction-limit">Per Transaction Limit ($)</Label>
                  <Input
                    id="transaction-limit"
                    type="number"
                    placeholder="100"
                    value={formData.perTransactionLimit}
                    onChange={(e) => setFormData({ ...formData, perTransactionLimit: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Default Action</Label>
                <div className="flex gap-2">
                  {["approve", "reject", "require_approval"].map((action) => (
                    <Button
                      key={action}
                      type="button"
                      variant={formData.action === action ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFormData({ ...formData, action })}
                    >
                      {action === "require_approval" ? "Require Approval" : action.charAt(0).toUpperCase() + action.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={createPolicy} disabled={creating || !formData.name.trim()}>
                {creating ? "Creating..." : "Create Policy"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Policies</CardTitle>
          <CardDescription>Define and manage spending rules for your agents</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : policies.length === 0 ? (
            <p className="text-sm text-slate-500">No policies yet. Create your first policy to control agent spending.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Limits</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{policy.name}</p>
                        {policy.description && (
                          <p className="text-xs text-slate-500">{policy.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{policy.scopeType}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {policy.rules.budget?.monthlyLimit && (
                          <p>{formatCurrency(policy.rules.budget.monthlyLimit)}/mo</p>
                        )}
                        {policy.rules.budget?.perTransactionLimit && (
                          <p className="text-slate-500">
                            Max {formatCurrency(policy.rules.budget.perTransactionLimit)}/tx
                          </p>
                        )}
                        {!policy.rules.budget?.monthlyLimit && !policy.rules.budget?.perTransactionLimit && (
                          <span className="text-slate-400">No limits set</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getActionBadge(policy.action)}</TableCell>
                    <TableCell>
                      <Badge variant={policy.enabled ? "default" : "secondary"}>
                        {policy.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
