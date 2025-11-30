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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Agent {
  id: string;
  name: string;
  description: string | null;
  status: string;
  monthlyLimit: number | null;
  dailyLimit: number | null;
  perTransactionLimit: number | null;
  approvalThreshold: number | null;
  flagNewVendors: boolean;
  blockedMerchants: string[] | null;
  allowedMerchants: string[] | null;
  createdAt: string;
}

interface AgentFormData {
  name: string;
  description: string;
  monthlyLimit: string;
  dailyLimit: string;
  perTransactionLimit: string;
  approvalThreshold: string;
  flagNewVendors: boolean;
  blockedMerchants: string;
  allowedMerchants: string;
}

const emptyFormData: AgentFormData = {
  name: "",
  description: "",
  monthlyLimit: "",
  dailyLimit: "",
  perTransactionLimit: "",
  approvalThreshold: "",
  flagNewVendors: false,
  blockedMerchants: "",
  allowedMerchants: "",
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState<AgentFormData>(emptyFormData);
  const [saving, setSaving] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  async function fetchAgents() {
    try {
      const res = await fetch("/api/internal/agents");
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents);
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData(emptyFormData);
    setEditingAgent(null);
  }

  function openEditDialog(agent: Agent) {
    setFormData({
      name: agent.name,
      description: agent.description || "",
      monthlyLimit: agent.monthlyLimit?.toString() || "",
      dailyLimit: agent.dailyLimit?.toString() || "",
      perTransactionLimit: agent.perTransactionLimit?.toString() || "",
      approvalThreshold: agent.approvalThreshold?.toString() || "",
      flagNewVendors: agent.flagNewVendors || false,
      blockedMerchants: agent.blockedMerchants?.join(", ") || "",
      allowedMerchants: agent.allowedMerchants?.join(", ") || "",
    });
    setEditingAgent(agent);
    setDialogOpen(true);
  }

  async function saveAgent() {
    if (!formData.name.trim()) return;
    
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        monthlyLimit: formData.monthlyLimit ? parseFloat(formData.monthlyLimit) : null,
        dailyLimit: formData.dailyLimit ? parseFloat(formData.dailyLimit) : null,
        perTransactionLimit: formData.perTransactionLimit ? parseFloat(formData.perTransactionLimit) : null,
        approvalThreshold: formData.approvalThreshold ? parseFloat(formData.approvalThreshold) : null,
        flagNewVendors: formData.flagNewVendors,
        blockedMerchants: formData.blockedMerchants ? formData.blockedMerchants.split(",").map(s => s.trim()).filter(Boolean) : null,
        allowedMerchants: formData.allowedMerchants ? formData.allowedMerchants.split(",").map(s => s.trim()).filter(Boolean) : null,
      };

      let res;
      if (editingAgent) {
        res = await fetch(`/api/internal/agents/${editingAgent.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/internal/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        const data = await res.json();
        if (editingAgent) {
          setAgents(agents.map(a => a.id === editingAgent.id ? data.agent : a));
        } else {
          setNewApiKey(data.apiKey);
          setAgents([...agents, data.agent]);
          setApiKeyDialogOpen(true);
        }
        setDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error("Error saving agent:", error);
    } finally {
      setSaving(false);
    }
  }

  async function toggleAgentStatus(agent: Agent) {
    const newStatus = agent.status === "active" ? "paused" : "active";
    try {
      const res = await fetch(`/api/internal/agents/${agent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setAgents(agents.map(a => 
          a.id === agent.id ? { ...a, status: newStatus } : a
        ));
      }
    } catch (error) {
      console.error("Error updating agent:", error);
    }
  }

  async function deleteAgent(agent: Agent) {
    if (!confirm(`Are you sure you want to delete "${agent.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/internal/agents/${agent.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setAgents(agents.filter(a => a.id !== agent.id));
      }
    } catch (error) {
      console.error("Error deleting agent:", error);
    }
  }

  async function regenerateApiKey(agent: Agent) {
    if (!confirm(`Are you sure you want to regenerate the API key for "${agent.name}"? The old key will stop working immediately.`)) {
      return;
    }

    setRegeneratingId(agent.id);
    try {
      const res = await fetch(`/api/internal/agents/${agent.id}/regenerate-key`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setNewApiKey(data.apiKey);
        setApiKeyDialogOpen(true);
      }
    } catch (error) {
      console.error("Error regenerating API key:", error);
    } finally {
      setRegeneratingId(null);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Active</Badge>;
      case "paused":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Paused</Badge>;
      case "suspended":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Suspended</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getLimitsDisplay = (agent: Agent) => {
    const limits = [];
    if (agent.monthlyLimit) limits.push(`${formatCurrency(agent.monthlyLimit)}/mo`);
    if (agent.perTransactionLimit) limits.push(`${formatCurrency(agent.perTransactionLimit)}/tx`);
    return limits.length > 0 ? limits.join(", ") : "No limits";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Agents</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          if (!open) resetForm();
          setDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}>Create Agent</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAgent ? "Edit Agent" : "Create New Agent"}</DialogTitle>
              <DialogDescription>
                {editingAgent 
                  ? "Update agent settings and spending controls."
                  : "Configure your agent with spending limits and controls. You'll receive an API key after creation."
                }
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="limits">Spending Limits</TabsTrigger>
                <TabsTrigger value="controls">Controls</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Agent Name *</Label>
                  <Input
                    id="name"
                    placeholder="Research Assistant"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Handles research and data gathering tasks"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="limits" className="space-y-4 mt-4">
                <p className="text-sm text-slate-500">
                  Set spending limits for this agent. Leave blank for no limit (org limits still apply).
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="monthlyLimit">Monthly Budget ($)</Label>
                    <Input
                      id="monthlyLimit"
                      type="number"
                      placeholder="500"
                      value={formData.monthlyLimit}
                      onChange={(e) => setFormData({ ...formData, monthlyLimit: e.target.value })}
                    />
                    <p className="text-xs text-slate-400">Max spend per month</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dailyLimit">Daily Limit ($)</Label>
                    <Input
                      id="dailyLimit"
                      type="number"
                      placeholder="100"
                      value={formData.dailyLimit}
                      onChange={(e) => setFormData({ ...formData, dailyLimit: e.target.value })}
                    />
                    <p className="text-xs text-slate-400">Max spend per day</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="perTransactionLimit">Per-Transaction Limit ($)</Label>
                  <Input
                    id="perTransactionLimit"
                    type="number"
                    placeholder="50"
                    value={formData.perTransactionLimit}
                    onChange={(e) => setFormData({ ...formData, perTransactionLimit: e.target.value })}
                  />
                  <p className="text-xs text-slate-400">Maximum amount for a single purchase</p>
                </div>
              </TabsContent>
              
              <TabsContent value="controls" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="approvalThreshold">Require Approval Above ($)</Label>
                  <Input
                    id="approvalThreshold"
                    type="number"
                    placeholder="200"
                    value={formData.approvalThreshold}
                    onChange={(e) => setFormData({ ...formData, approvalThreshold: e.target.value })}
                  />
                  <p className="text-xs text-slate-400">Purchases above this amount need human approval</p>
                </div>
                
                <div className="flex items-center space-x-2 py-2">
                  <input
                    type="checkbox"
                    id="flagNewVendors"
                    checked={formData.flagNewVendors}
                    onChange={(e) => setFormData({ ...formData, flagNewVendors: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <Label htmlFor="flagNewVendors" className="text-sm font-normal cursor-pointer">
                    Require approval for purchases from new vendors
                  </Label>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="blockedMerchants">Blocked Merchants</Label>
                  <Input
                    id="blockedMerchants"
                    placeholder="facebook ads, google ads"
                    value={formData.blockedMerchants}
                    onChange={(e) => setFormData({ ...formData, blockedMerchants: e.target.value })}
                  />
                  <p className="text-xs text-slate-400">Comma-separated list of blocked merchant names</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="allowedMerchants">Allowed Merchants Only</Label>
                  <Input
                    id="allowedMerchants"
                    placeholder="github, figma, aws"
                    value={formData.allowedMerchants}
                    onChange={(e) => setFormData({ ...formData, allowedMerchants: e.target.value })}
                  />
                  <p className="text-xs text-slate-400">If set, only these merchants are allowed (comma-separated)</p>
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={saveAgent} disabled={saving || !formData.name.trim()}>
                {saving ? "Saving..." : editingAgent ? "Save Changes" : "Create Agent"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* API Key Dialog */}
      <Dialog open={apiKeyDialogOpen} onOpenChange={(open) => {
        if (!open) setNewApiKey(null);
        setApiKeyDialogOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Generated</DialogTitle>
            <DialogDescription>
              Save this API key now. You won&apos;t be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-slate-100 rounded-lg">
              <Label className="text-xs text-slate-500">API Key</Label>
              <code className="block mt-1 text-sm break-all font-mono select-all">{newApiKey}</code>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  if (newApiKey) navigator.clipboard.writeText(newApiKey);
                }} 
                variant="outline" 
                className="flex-1"
              >
                Copy to Clipboard
              </Button>
              <Button onClick={() => setApiKeyDialogOpen(false)} className="flex-1">
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>All Agents</CardTitle>
          <CardDescription>Manage your AI agents and their spending controls</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : agents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500 mb-4">No agents yet. Create your first agent to get started.</p>
              <Button onClick={() => setDialogOpen(true)}>Create Your First Agent</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Spending Limits</TableHead>
                  <TableHead>Controls</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        {agent.description && (
                          <p className="text-xs text-slate-500">{agent.description}</p>
                        )}
                        <p className="text-xs text-slate-400 font-mono mt-1">{agent.id.slice(0, 8)}...</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{getLimitsDisplay(agent)}</p>
                        {agent.dailyLimit && (
                          <p className="text-xs text-slate-500">{formatCurrency(agent.dailyLimit)}/day</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {agent.approvalThreshold && (
                          <Badge variant="outline" className="text-xs">
                            Approval &gt;{formatCurrency(agent.approvalThreshold)}
                          </Badge>
                        )}
                        {agent.flagNewVendors && (
                          <Badge variant="outline" className="text-xs ml-1">
                            New vendor review
                          </Badge>
                        )}
                        {!agent.approvalThreshold && !agent.flagNewVendors && (
                          <span className="text-xs text-slate-400">No extra controls</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(agent.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" disabled={regeneratingId === agent.id}>
                            {regeneratingId === agent.id ? "..." : "•••"}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(agent)}>
                            Edit Settings
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleAgentStatus(agent)}>
                            {agent.status === "active" ? "Pause" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => regenerateApiKey(agent)}>
                            Regenerate API Key
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => deleteAgent(agent)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
