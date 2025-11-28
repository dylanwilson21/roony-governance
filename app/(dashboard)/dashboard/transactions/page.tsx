"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transaction {
  id: string;
  agentId: string;
  agentName: string | null;
  amount: number;
  currency: string;
  description: string;
  merchantName: string;
  status: string;
  rejectionCode: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    try {
      const res = await fetch("/api/internal/transactions");
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount: number, currency: string = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Rejected</Badge>;
      case "pending":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending</Badge>;
      case "expired":
        return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    const searchLower = search.toLowerCase();
    return (
      tx.merchantName.toLowerCase().includes(searchLower) ||
      tx.agentName?.toLowerCase().includes(searchLower) ||
      tx.description.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Transactions</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Transactions</CardTitle>
              <CardDescription>View all purchase requests from your agents</CardDescription>
            </div>
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : filteredTransactions.length === 0 ? (
            <p className="text-sm text-slate-500">
              {search ? "No transactions match your search" : "No transactions yet"}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-slate-500">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">{tx.agentName || "Unknown"}</TableCell>
                    <TableCell>{tx.merchantName}</TableCell>
                    <TableCell className="max-w-xs truncate text-slate-600">
                      {tx.description}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(tx.amount, tx.currency)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(tx.status)}
                        {tx.rejectionCode && (
                          <span className="text-xs text-red-600">{tx.rejectionCode}</span>
                        )}
                      </div>
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
