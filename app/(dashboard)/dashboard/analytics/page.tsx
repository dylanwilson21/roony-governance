"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Analytics {
  totalSpend: number;
  activeAgents: number;
  todayTransactions: number;
  blockedAttempts: number;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      const res = await fetch("/api/internal/analytics");
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Spend</CardDescription>
            <CardTitle className="text-3xl">
              {loading ? "..." : formatCurrency(analytics?.totalSpend || 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Agents</CardDescription>
            <CardTitle className="text-3xl">
              {loading ? "..." : analytics?.activeAgents || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Transactions Today</CardDescription>
            <CardTitle className="text-3xl">
              {loading ? "..." : analytics?.todayTransactions || 0}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Blocked Attempts</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {loading ? "..." : analytics?.blockedAttempts || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Spend Over Time</CardTitle>
            <CardDescription>Daily spend for the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg">
              <div className="text-center text-slate-400">
                <p className="text-lg font-medium">Chart Coming Soon</p>
                <p className="text-sm">Install recharts to enable charts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spend by Agent</CardTitle>
            <CardDescription>Top spending agents this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg">
              <div className="text-center text-slate-400">
                <p className="text-lg font-medium">Chart Coming Soon</p>
                <p className="text-sm">Install recharts to enable charts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spend by Merchant</CardTitle>
            <CardDescription>Top merchants by spend</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg">
              <div className="text-center text-slate-400">
                <p className="text-lg font-medium">Chart Coming Soon</p>
                <p className="text-sm">Install recharts to enable charts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approval Rate</CardTitle>
            <CardDescription>Transaction approval vs rejection rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics && (analytics.todayTransactions > 0 || analytics.blockedAttempts > 0) ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="text-sm">Approved</span>
                    </div>
                    <span className="font-medium">
                      {analytics.todayTransactions - analytics.blockedAttempts}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-sm">Blocked</span>
                    </div>
                    <span className="font-medium">{analytics.blockedAttempts}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-4">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${analytics.todayTransactions > 0 
                          ? ((analytics.todayTransactions - analytics.blockedAttempts) / analytics.todayTransactions * 100) 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </>
              ) : (
                <div className="h-32 flex items-center justify-center text-slate-400">
                  <p>No data yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
