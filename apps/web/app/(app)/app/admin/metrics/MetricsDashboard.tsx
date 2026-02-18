"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import {
  DollarSign,
  Users,
  UserMinus,
  TrendingUp,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Loader2,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type {
  AdminSaaSMetricsResponse,
  AdminFunnelDailyResponse,
  ListMetricsUsersResponse,
  MetricsUserCategory,
} from "@widia/shared";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getMetricsUsers } from "@/lib/actions/admin";

interface Props {
  metrics: AdminSaaSMetricsResponse;
  funnel: AdminFunnelDailyResponse;
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

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  trialing: "bg-blue-100 text-blue-800",
  canceled: "bg-red-100 text-red-800",
  past_due: "bg-orange-100 text-orange-800",
  unpaid: "bg-red-100 text-red-800",
  incomplete: "bg-yellow-100 text-yellow-800",
  incomplete_expired: "bg-yellow-100 text-yellow-800",
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function UsersTab({ category }: { category: MetricsUserCategory }) {
  const [data, setData] = useState<ListMetricsUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMetricsUsers(category)
      .then(setData)
      .finally(() => setLoading(false));
  }, [category]);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        Nenhum usuário nesta categoria
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuário</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Trial End</TableHead>
            <TableHead>Criado em</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {user.email}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {user.tier ? (
                  <span className="capitalize">{user.tier}</span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {user.billingStatus ? (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "capitalize",
                      STATUS_COLORS[user.billingStatus]
                    )}
                  >
                    {user.billingStatus}
                  </Badge>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>{formatDate(user.trialEnd)}</TableCell>
              <TableCell>{formatDate(user.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function MetricsDashboard({ metrics, funnel }: Props) {
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
            <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>{metrics.leads.withActiveTrial} with active trial</span>
                <DeltaBadge delta={metrics.leads.delta} />
              </div>
              <div>{metrics.leads.withExpiredTrial} with expired trial</div>
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

      {/* Onda 0 Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Funnel Diário (Onda 0)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Home → Signup Start</div>
              <div className="mt-1 text-lg font-semibold">
                {formatPercent(funnel.rates.homeToSignupStartPct)}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Signup Start → Complete</div>
              <div className="mt-1 text-lg font-semibold">
                {formatPercent(funnel.rates.signupStartToCompletePct)}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Signup Complete → Login</div>
              <div className="mt-1 text-lg font-semibold">
                {formatPercent(funnel.rates.signupCompleteToLoginPct)}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Login → 1º Snapshot</div>
              <div className="mt-1 text-lg font-semibold">
                {formatPercent(funnel.rates.loginToFirstSnapshotPct)}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Home → 1º Snapshot</div>
              <div className="mt-1 text-lg font-semibold">
                {formatPercent(funnel.rates.homeToFirstSnapshotPct)}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Home Views</div>
              <div className="mt-1 text-xl font-semibold">{funnel.totals.homeViews}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Signup Started</div>
              <div className="mt-1 text-xl font-semibold">{funnel.totals.signupStarted}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Signup Completed</div>
              <div className="mt-1 text-xl font-semibold">{funnel.totals.signupCompleted}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Login Completed</div>
              <div className="mt-1 text-xl font-semibold">{funnel.totals.loginCompleted}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">1º Snapshot</div>
              <div className="mt-1 text-xl font-semibold">{funnel.totals.firstSnapshotSaved}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Calc: Relatório</div>
              <div className="mt-1 text-xl font-semibold">{funnel.totals.calculatorFullReportRequested}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Calc: Salvar</div>
              <div className="mt-1 text-xl font-semibold">{funnel.totals.calculatorSaveClicked}</div>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Home</TableHead>
                  <TableHead>Signup Start</TableHead>
                  <TableHead>Signup Complete</TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead>1º Snapshot</TableHead>
                  <TableHead>Calc Relatório</TableHead>
                  <TableHead>Calc Salvar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funnel.items.slice(-14).reverse().map((row) => (
                  <TableRow key={row.date}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.homeViews}</TableCell>
                    <TableCell>{row.signupStarted}</TableCell>
                    <TableCell>{row.signupCompleted}</TableCell>
                    <TableCell>{row.loginCompleted}</TableCell>
                    <TableCell>{row.firstSnapshotSaved}</TableCell>
                    <TableCell>{row.calculatorFullReportRequested}</TableCell>
                    <TableCell>{row.calculatorSaveClicked}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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

      {/* User Lists by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active">
            <TabsList className="mb-4 flex-wrap">
              <TabsTrigger value="active">
                Ativos ({metrics.mrr.activeCount})
              </TabsTrigger>
              <TabsTrigger value="in_trial">
                Em Trial ({metrics.trialToPaid.inTrial})
              </TabsTrigger>
              <TabsTrigger value="converted">
                Convertidos ({metrics.trialToPaid.converted})
              </TabsTrigger>
              <TabsTrigger value="churned">
                Churned ({metrics.churn.count})
              </TabsTrigger>
              <TabsTrigger value="trial_expired">
                Trial Expirado ({metrics.trialToPaid.expired})
              </TabsTrigger>
              <TabsTrigger value="incomplete">
                Checkout Abandonado ({metrics.incomplete.count})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="active">
              <UsersTab category="active" />
            </TabsContent>
            <TabsContent value="in_trial">
              <UsersTab category="in_trial" />
            </TabsContent>
            <TabsContent value="converted">
              <UsersTab category="converted" />
            </TabsContent>
            <TabsContent value="churned">
              <UsersTab category="churned" />
            </TabsContent>
            <TabsContent value="trial_expired">
              <UsersTab category="trial_expired" />
            </TabsContent>
            <TabsContent value="incomplete">
              <UsersTab category="incomplete" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
