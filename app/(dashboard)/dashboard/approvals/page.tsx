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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Approval {
  id: string;
  purchaseIntentId: string;
  agentId: string;
  agentName: string | null;
  amount: number;
  merchantName: string;
  reason: string;
  reasonDetails: string | null;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  description: string | null;
  currency: string | null;
}

interface Counts {
  pending: number;
  approved: number;
  rejected: number;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchApprovals(activeTab);
  }, [activeTab]);

  async function fetchApprovals(status: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/internal/approvals?status=${status}`);
      if (res.ok) {
        const data = await res.json();
        setApprovals(data.approvals);
        setCounts(data.counts);
      }
    } catch (error) {
      console.error("Error fetching approvals:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action: "approve" | "reject") {
    if (!selectedApproval) return;
    
    setProcessing(true);
    try {
      const res = await fetch(`/api/internal/approvals/${selectedApproval.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes: reviewNotes }),
      });

      if (res.ok) {
        setSelectedApproval(null);
        setReviewNotes("");
        fetchApprovals(activeTab);
      }
    } catch (error) {
      console.error("Error processing approval:", error);
    } finally {
      setProcessing(false);
    }
  }

  const formatCurrency = (amount: number, currency: string = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case "OVER_THRESHOLD":
        return <Badge className="bg-amber-100 text-amber-700">Over Threshold</Badge>;
      case "NEW_VENDOR":
        return <Badge className="bg-blue-100 text-blue-700">New Vendor</Badge>;
      case "ORG_GUARDRAIL":
        return <Badge className="bg-purple-100 text-purple-700">Org Policy</Badge>;
      default:
        return <Badge variant="secondary">{reason}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
      case "approved":
        return <Badge className="bg-emerald-100 text-emerald-700">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Approvals</h1>
          <p className="text-slate-500 mt-1">Review and approve purchase requests from agents</p>
        </div>
        {counts.pending > 0 && (
          <Badge className="bg-amber-100 text-amber-700 text-lg px-4 py-2">
            {counts.pending} pending
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending">
            Pending {counts.pending > 0 && `(${counts.pending})`}
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved {counts.approved > 0 && `(${counts.approved})`}
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected {counts.rejected > 0 && `(${counts.rejected})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === "pending" ? "Pending Approvals" : 
                 activeTab === "approved" ? "Approved Requests" : "Rejected Requests"}
              </CardTitle>
              <CardDescription>
                {activeTab === "pending" 
                  ? "These purchases are waiting for your review"
                  : `History of ${activeTab} purchase requests`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-slate-500">Loading...</p>
              ) : approvals.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-500">
                    {activeTab === "pending" 
                      ? "No pending approvals. All caught up! 🎉"
                      : `No ${activeTab} requests yet.`}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Merchant</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Requested</TableHead>
                      {activeTab !== "pending" && <TableHead>Status</TableHead>}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvals.map((approval) => (
                      <TableRow key={approval.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{approval.agentName || "Unknown Agent"}</p>
                            {approval.description && (
                              <p className="text-xs text-slate-500 truncate max-w-[200px]">
                                {approval.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {formatCurrency(approval.amount, approval.currency || "usd")}
                        </TableCell>
                        <TableCell>{approval.merchantName}</TableCell>
                        <TableCell>{getReasonBadge(approval.reason)}</TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {formatDate(approval.createdAt)}
                        </TableCell>
                        {activeTab !== "pending" && (
                          <TableCell>{getStatusBadge(approval.status)}</TableCell>
                        )}
                        <TableCell className="text-right">
                          {activeTab === "pending" ? (
                            <div className="flex justify-end space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => {
                                  setSelectedApproval(approval);
                                  setReviewNotes("");
                                }}
                              >
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => {
                                  setSelectedApproval(approval);
                                  setReviewNotes("");
                                }}
                              >
                                Review
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedApproval(approval)}
                            >
                              View Details
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!selectedApproval} onOpenChange={(open) => !open && setSelectedApproval(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedApproval?.status === "pending" ? "Review Purchase Request" : "Request Details"}
            </DialogTitle>
            <DialogDescription>
              {selectedApproval?.status === "pending" 
                ? "Approve or reject this purchase request"
                : `This request was ${selectedApproval?.status}`}
            </DialogDescription>
          </DialogHeader>

          {selectedApproval && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-500">Agent</Label>
                  <p className="font-medium">{selectedApproval.agentName}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Amount</Label>
                  <p className="font-medium font-mono">
                    {formatCurrency(selectedApproval.amount, selectedApproval.currency || "usd")}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Merchant</Label>
                  <p className="font-medium">{selectedApproval.merchantName}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Reason</Label>
                  <div className="mt-1">{getReasonBadge(selectedApproval.reason)}</div>
                </div>
              </div>

              {selectedApproval.description && (
                <div>
                  <Label className="text-xs text-slate-500">Description</Label>
                  <p className="text-sm">{selectedApproval.description}</p>
                </div>
              )}

              {selectedApproval.reasonDetails && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <Label className="text-xs text-slate-500">Details</Label>
                  <p className="text-sm">{selectedApproval.reasonDetails}</p>
                </div>
              )}

              {selectedApproval.status === "pending" && (
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Input
                    id="notes"
                    placeholder="Add a note about your decision..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                  />
                </div>
              )}

              {selectedApproval.reviewNotes && selectedApproval.status !== "pending" && (
                <div>
                  <Label className="text-xs text-slate-500">Review Notes</Label>
                  <p className="text-sm">{selectedApproval.reviewNotes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedApproval?.status === "pending" ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setSelectedApproval(null)}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => handleAction("reject")}
                  disabled={processing}
                >
                  {processing ? "..." : "Reject"}
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleAction("approve")}
                  disabled={processing}
                >
                  {processing ? "..." : "Approve"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setSelectedApproval(null)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

