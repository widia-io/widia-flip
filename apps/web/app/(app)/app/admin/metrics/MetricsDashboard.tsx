"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DollarSign,
  Users,
  UserMinus,
  TrendingUp,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { AdminSaaSMetricsResponse } from "@widia/shared";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Props {
  metrics: AdminSaaSMetricsResponse;
}

const TIER_COLORS: Record<string, string> = {
  starter: "#3b82f6",
  pro: "#8b5cf6",
  growth: "#f59e0b",
};

function formatCurrency(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centavos / 100);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function DeltaBadge({ delta, inverse }: { delta: number; inverse?: boolean }) {
  const isPositive = inverse ? delta < 0 : delta > 0;
  const isNegative = inverse ? delta > 0 : delta < 0;

  if (delta === 0) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        isPositive && "text-emerald-600",
        isNegative && "text-red-600"
      )}
    >
      {delta > 0 ? (
        <ArrowUp className="h-3 w-3" />
      ) : (
        <ArrowDown className="h-3 w-3" />
      )}
      {formatPercent(Math.abs(delta))}
    </span>
  );
}

function PeriodFilter({ current }: { current: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (period: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex gap-1 rounded-lg border bg-muted p-1">
      {["30d", "90d", "all"].map((p) => (
        <button
          key={p}
          onClick={() => handleChange(p)}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium transition-colors",
            current === p
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {p === "all" ? "All" : p}
        </button>
      ))}
    </div>
  );
}

export function MetricsDashboard({ metrics }: Props) {
  const pieData = Object.entries(metrics.mrr.byTier).map(([tier, value]) => ({
    name: tier.charAt(0).toUpperCase() + tier.slice(1),
    value,
    color: TIER_COLORS[tier] || "#6b7280",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/app/admin"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Admin
          </Link>
          <div>
            <h1 className="text-2xl font-bold">SaaS Metrics</h1>
            <p className="text-muted-foreground">
              MRR, churn, signups, conversion
            </p>
          </div>
        </div>
        <PeriodFilter current={metrics.period} />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* MRR */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.mrr.total)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {metrics.mrr.activeCount} active
              </span>
              <DeltaBadge delta={metrics.mrr.delta} />
            </div>
          </CardContent>
        </Card>

        {/* Churn */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn</CardTitle>
            <UserMinus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercent(metrics.churn.rate)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {metrics.churn.count} churned
              </span>
              <DeltaBadge delta={metrics.churn.delta} inverse />
            </div>
          </CardContent>
        </Card>

        {/* Signups */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Signups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.leads.totalSignups}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {metrics.leads.withTrial} with trial
              </span>
              <DeltaBadge delta={metrics.leads.delta} />
            </div>
          </CardContent>
        </Card>

        {/* Trial Conversion */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trial to Paid</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercent(metrics.trialToPaid.conversionRate)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {metrics.trialToPaid.converted} converted
              </span>
              <DeltaBadge delta={metrics.trialToPaid.delta} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Signup to Trial</span>
                <span className="font-medium">
                  {formatPercent(metrics.conversion.signupToTrial)}
                </span>
              </div>
              <Progress value={metrics.conversion.signupToTrial} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Trial to Active</span>
                <span className="font-medium">
                  {formatPercent(metrics.conversion.trialToActive)}
                </span>
              </div>
              <Progress value={metrics.conversion.trialToActive} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Overall (Signup to Paid)</span>
                <span className="font-medium">
                  {formatPercent(metrics.conversion.overall)}
                </span>
              </div>
              <Progress value={metrics.conversion.overall} />
            </div>
          </CardContent>
        </Card>

        {/* MRR by Tier */}
        <Card>
          <CardHeader>
            <CardTitle>MRR by Tier</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="flex items-center gap-4">
                <div className="h-[180px] w-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        strokeWidth={2}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) =>
                          typeof value === "number" ? formatCurrency(value) : ""
                        }
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {pieData.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium">
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-[180px] items-center justify-center text-muted-foreground">
                No active subscriptions
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trial Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Trial Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold text-emerald-600">
                {metrics.trialToPaid.converted}
              </div>
              <div className="text-sm text-muted-foreground">
                Converted to Paid
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold text-blue-600">
                {metrics.trialToPaid.inTrial}
              </div>
              <div className="text-sm text-muted-foreground">In Trial</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold text-gray-500">
                {metrics.trialToPaid.expired}
              </div>
              <div className="text-sm text-muted-foreground">
                Trial Expired (No Conversion)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
