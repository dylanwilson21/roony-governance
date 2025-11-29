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

interface Agent {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
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

  async function createAgent() {
    if (!newAgentName.trim()) return;
    
    setSaving(true);
    try {
      const res = await fetch("/api/internal/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newAgentName }),
      });

      if (res.ok) {
        const data = await res.json();
        setNewApiKey(data.apiKey);
        setAgents([...agents, data.agent]);
        setNewAgentName("");
        setCreateOpen(false);
        setApiKeyDialogOpen(true);
      }
    } catch (error) {
      console.error("Error creating agent:", error);
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Agents</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>Create Agent</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Agent</DialogTitle>
              <DialogDescription>
                Give your agent a name to identify it. You&apos;ll receive an API key after creation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Agent Name</Label>
                <Input
                  id="name"
                  placeholder="My AI Agent"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createAgent()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createAgent} disabled={saving || !newAgentName.trim()}>
                {saving ? "Creating..." : "Create Agent"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* API Key Dialog */}
      <Dialog open={apiKeyDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setNewApiKey(null);
        }
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
          <CardDescription>Manage your AI agents and their API keys</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : agents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500 mb-4">No agents yet. Create your first agent to get started.</p>
              <Button onClick={() => setCreateOpen(true)}>Create Your First Agent</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">{agent.id}</TableCell>
                    <TableCell>{getStatusBadge(agent.status)}</TableCell>
                    <TableCell className="text-slate-500">
                      {new Date(agent.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" disabled={regeneratingId === agent.id}>
                            {regeneratingId === agent.id ? "..." : "•••"}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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
