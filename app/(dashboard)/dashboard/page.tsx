"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Analytics {
  totalSpend: number;
  activeAgents: number;
  todayTransactions: number;
  blockedAttempts: number;
  totalPolicies: number;
  monthlySpend: number;
}

interface Transaction {
  id: string;
  agentName: string;
  amount: number;
  currency: string;
  merchantName: string;
  status: string;
  createdAt: string;
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [analyticsRes, transactionsRes] = await Promise.all([
          fetch("/api/internal/analytics"),
          fetch("/api/internal/transactions"),
        ]);

        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setAnalytics(analyticsData);
        }

        if (transactionsRes.ok) {
          const transactionsData = await transactionsRes.json();
          setTransactions(transactionsData.transactions.slice(0, 5));
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

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
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/dashboard/agents">
            <Button variant="outline">Manage Agents</Button>
          </Link>
          <Link href="/dashboard/policies">
            <Button>Create Policy</Button>
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Spend</CardDescription>
            <CardTitle className="text-3xl">
              {loading ? "..." : formatCurrency(analytics?.totalSpend || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">
              {formatCurrency(analytics?.monthlySpend || 0)} this month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Agents</CardDescription>
            <CardTitle className="text-3xl">
              {loading ? "..." : analytics?.activeAgents || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/agents" className="text-xs text-primary hover:underline">
              Manage agents →
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Transactions Today</CardDescription>
            <CardTitle className="text-3xl">
              {loading ? "..." : analytics?.todayTransactions || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/transactions" className="text-xs text-primary hover:underline">
              View all →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Blocked Attempts</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {loading ? "..." : analytics?.blockedAttempts || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/transactions?status=rejected" className="text-xs text-primary hover:underline">
              Review blocked →
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest purchase requests from your agents</CardDescription>
            </div>
            <Link href="/dashboard/transactions">
              <Button variant="ghost" size="sm">View all</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-500">Loading...</p>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-500 mb-4">No transactions yet</p>
                <p className="text-xs text-slate-400">
                  Transactions will appear here when your agents make purchase requests.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">{tx.agentName || "Unknown"}</TableCell>
                      <TableCell>{tx.merchantName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(tx.amount, tx.currency)}</TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
            <CardDescription>Get started with Roony</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                (analytics?.activeAgents || 0) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {(analytics?.activeAgents || 0) > 0 ? '✓' : '1'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Create an agent</p>
                <p className="text-xs text-slate-500">Set up your first AI agent</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                (analytics?.totalPolicies || 0) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {(analytics?.totalPolicies || 0) > 0 ? '✓' : '2'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Define a policy</p>
                <p className="text-xs text-slate-500">Set spending limits and rules</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-medium">
                3
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Connect Stripe</p>
                <p className="text-xs text-slate-500">Enable virtual card creation</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-medium">
                4
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Test a purchase</p>
                <p className="text-xs text-slate-500">Make your first API call</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Link href="/dashboard/settings">
                <Button variant="outline" className="w-full">
                  Go to Settings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
