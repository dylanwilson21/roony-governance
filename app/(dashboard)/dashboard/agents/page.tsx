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
  const [creating, setCreating] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

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
    
    setCreating(true);
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
      }
    } catch (error) {
      console.error("Error creating agent:", error);
    } finally {
      setCreating(false);
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
        <Dialog open={createOpen} onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setNewApiKey(null);
            setNewAgentName("");
          }
        }}>
          <DialogTrigger asChild>
            <Button>Create Agent</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{newApiKey ? "Agent Created!" : "Create New Agent"}</DialogTitle>
              <DialogDescription>
                {newApiKey 
                  ? "Save this API key now. You won't be able to see it again."
                  : "Give your agent a name to identify it."}
              </DialogDescription>
            </DialogHeader>
            {newApiKey ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-100 rounded-lg">
                  <Label className="text-xs text-slate-500">API Key</Label>
                  <code className="block mt-1 text-sm break-all font-mono">{newApiKey}</code>
                </div>
                <Button onClick={() => {
                  navigator.clipboard.writeText(newApiKey);
                }} variant="outline" className="w-full">
                  Copy to Clipboard
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Agent Name</Label>
                    <Input
                      id="name"
                      placeholder="My AI Agent"
                      value={newAgentName}
                      onChange={(e) => setNewAgentName(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={createAgent} disabled={creating || !newAgentName.trim()}>
                    {creating ? "Creating..." : "Create Agent"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Agents</CardTitle>
          <CardDescription>Manage your AI agents and their API keys</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : agents.length === 0 ? (
            <p className="text-sm text-slate-500">No agents yet. Create your first agent to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell>{getStatusBadge(agent.status)}</TableCell>
                    <TableCell className="text-slate-500">
                      {new Date(agent.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAgentStatus(agent)}
                      >
                        {agent.status === "active" ? "Pause" : "Activate"}
                      </Button>
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
