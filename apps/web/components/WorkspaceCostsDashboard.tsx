"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  DollarSign,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Building2,
  Filter,
  Calendar,
  X,
  AlertCircle,
  ArrowUpRight,
  Undo2,
} from "lucide-react";
import { markCostPaidAction } from "@/lib/actions/costs";
import type {
  WorkspaceCostItem,
  WorkspaceCostsSummary,
  UpcomingCost,
  CostType,
} from "@widia/shared";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { markCostAsPaidAction } from "@/lib/actions/costs";

const COST_TYPE_LABELS: Record<CostType, string> = {
  renovation: "Reforma",
  legal: "Juridico",
  tax: "Impostos",
  other: "Outros",
};

const COST_TYPE_COLORS: Record<CostType, string> = {
  renovation: "#3b82f6",
  legal: "#8b5cf6",
  tax: "#f59e0b",
  other: "#6b7280",
};

interface WorkspaceCostsDashboardProps {
  items: WorkspaceCostItem[];
  summary: WorkspaceCostsSummary;
  upcoming: UpcomingCost[];
}

export function WorkspaceCostsDashboard({
  items: initialItems,
  summary: initialSummary,
  upcoming,
}: WorkspaceCostsDashboardProps) {
  const [items, setItems] = useState(initialItems);
  const [summary, setSummary] = useState(initialSummary);
  const [filterProperty, setFilterProperty] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  const handleMarkPaid = async (cost: WorkspaceCostItem) => {
    startTransition(async () => {
      const result = await markCostPaidAction(cost.id, cost.property_id);
      if (result.data) {
        const newStatus = result.data.status;
        const oldStatus = cost.status;

        setItems((prev) =>
          prev.map((c) => (c.id === cost.id ? { ...c, status: newStatus } : c))
        );

        setSummary((prev) => {
          let planned = prev.total_planned;
          let paid = prev.total_paid;
          if (oldStatus === "planned") planned -= cost.amount;
          if (oldStatus === "paid") paid -= cost.amount;
          if (newStatus === "planned") planned += cost.amount;
          if (newStatus === "paid") paid += cost.amount;
          return { ...prev, total_planned: planned, total_paid: paid, total_all: planned + paid };
        });
      }
    });
  };

  const properties = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    items.forEach((item) => {
      if (!map.has(item.property_id)) {
        map.set(item.property_id, {
          id: item.property_id,
          name: item.property_name,
        });
      }
    });
    return Array.from(map.values());
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterProperty !== "all" && item.property_id !== filterProperty) return false;
      if (filterType !== "all" && item.cost_type !== filterType) return false;
      if (filterStatus !== "all" && item.status !== filterStatus) return false;
      return true;
    });
  }, [items, filterProperty, filterType, filterStatus]);

  // Calculate derived metrics
  const metrics = useMemo(() => {
    const budgetExecution = summary.total_planned > 0
      ? (summary.total_paid / summary.total_planned) * 100
      : 0;
    const pendingAmount = summary.total_planned - summary.total_paid;
    const pendingCount = items.filter(i => i.status === "planned").length;
    const uniqueProperties = new Set(items.map(i => i.property_id)).size;
    const avgPerProperty = uniqueProperties > 0
      ? summary.total_all / uniqueProperties
      : 0;

    // Overdue costs (planned + past due date)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueCosts = items.filter(item => {
      if (item.status !== "planned" || !item.due_date) return false;
      const dueDate = new Date(item.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    });
    const overdueTotal = overdueCosts.reduce((sum, c) => sum + c.amount, 0);
    const maxOverdueDays = overdueCosts.length > 0
      ? Math.max(...overdueCosts.map(c => {
          const due = new Date(c.due_date!);
          return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
        }))
      : 0;

    // Upcoming in 7 days
    const urgentCount = upcoming.filter(u => u.days_until_due <= 7).length;

    return {
      budgetExecution,
      pendingAmount,
      pendingCount,
      avgPerProperty,
      uniqueProperties,
      overdueCosts,
      overdueTotal,
      overdueCount: overdueCosts.length,
      maxOverdueDays,
      urgentCount,
    };
  }, [items, summary, upcoming]);

  // Group upcoming by urgency
  const groupedUpcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Separate overdue (days_until_due is negative or calculated from items)
    const overdue = items.filter(item => {
      if (item.status !== "planned" || !item.due_date) return false;
      const dueDate = new Date(item.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    }).map(item => {
      const due = new Date(item.due_date!);
      const daysOverdue = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      return { ...item, daysOverdue };
    }).sort((a, b) => b.daysOverdue - a.daysOverdue);

    const next7Days = upcoming.filter(u => u.days_until_due >= 0 && u.days_until_due <= 7);
    const next30Days = upcoming.filter(u => u.days_until_due > 7 && u.days_until_due <= 30);

    return { overdue, next7Days, next30Days };
  }, [items, upcoming]);

  const pieChartData = useMemo(() => {
    const total = summary.by_type.reduce((sum, item) => sum + item.total_planned + item.total_paid, 0);
    return summary.by_type.map((item) => {
      const value = item.total_planned + item.total_paid;
      return {
        name: COST_TYPE_LABELS[item.cost_type as CostType] || item.cost_type,
        value,
        percentage: total > 0 ? ((value / total) * 100).toFixed(0) : "0",
        color: COST_TYPE_COLORS[item.cost_type as CostType] || "#6b7280",
      };
    });
  }, [summary.by_type]);

  // Top 3 properties for property cards
  const topProperties = useMemo(() => {
    return summary.by_property.slice(0, 3).map((item) => {
      const total = item.total_planned + item.total_paid;
      const paidPercentage = total > 0 ? (item.total_paid / total) * 100 : 0;
      return {
        ...item,
        total,
        paidPercentage,
      };
    });
  }, [summary.by_property]);

  // Mock timeline data (will be replaced with real data from backend)
  const timelineData = useMemo(() => {
    // Generate last 6 months mock data based on current totals
    const months = [];
    const now = new Date();
    const monthlyPaid = summary.total_paid / 6;
    const monthlyPlanned = summary.total_planned / 6;

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: d.toLocaleDateString("pt-BR", { month: "short" }),
        planejado: Math.round(monthlyPlanned * (6 - i) * (0.8 + Math.random() * 0.4)),
        pago: Math.round(monthlyPaid * (6 - i) * (0.7 + Math.random() * 0.3)),
      });
    }
    return months;
  }, [summary]);

  // Filter active count
  const activeFilters = [filterProperty, filterType, filterStatus].filter(f => f !== "all").length;

  const clearFilters = () => {
    setFilterProperty("all");
    setFilterType("all");
    setFilterStatus("all");
  };

  // Budget execution color
  const getBudgetColor = (percentage: number) => {
    if (percentage < 90) return { bg: "bg-green-500/10", text: "text-green-600", progress: "bg-green-500" };
    if (percentage <= 100) return { bg: "bg-yellow-500/10", text: "text-yellow-600", progress: "bg-yellow-500" };
    return { bg: "bg-destructive/10", text: "text-destructive", progress: "bg-destructive" };
  };

  const budgetColor = getBudgetColor(metrics.budgetExecution);

  // Handle mark as paid
  const handleMarkAsPaid = async (cost: WorkspaceCostItem) => {
    if (cost.status === "paid" || cost.schedule_item_id) return;
    setMarkingAsPaid(cost.id);
    try {
      await markCostAsPaidAction(cost.property_id, cost.id);
      // Page will revalidate automatically
    } catch (error) {
      console.error("Failed to mark as paid:", error);
    } finally {
      setMarkingAsPaid(null);
    }
  };

  // Calculate days info for table status
  const getDaysInfo = (cost: WorkspaceCostItem) => {
    if (cost.status === "paid") return null;
    if (!cost.due_date) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(cost.due_date);
    due.setHours(0, 0, 0, 0);

    const diff = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diff < 0) return { label: `${Math.abs(diff)}d atrasado`, isOverdue: true };
    if (diff === 0) return { label: "Hoje", isUrgent: true };
    if (diff === 1) return { label: "Amanha", isUrgent: true };
    if (diff <= 7) return { label: `em ${diff}d`, isUrgent: true };
    return { label: `em ${diff}d`, isUrgent: false };
  };

  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <EmptyState
          icon={DollarSign}
          title="Nenhum custo cadastrado"
          description="Adicione custos aos seus imoveis para visualizar o dashboard consolidado."
          tip="Os custos podem ser cadastrados na aba de custos de cada imovel ou pelo cronograma."
          action={{
            label: "Ver imoveis",
            href: "/app/properties",
          }}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards - Clean Style */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Budget Execution Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${budgetColor.bg}`}>
                  <TrendingUp className={`h-5 w-5 ${budgetColor.text}`} />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Execucao Orcamentaria
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold tabular-nums">
                    {metrics.budgetExecution.toFixed(0)}%
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(summary.total_paid)} / {formatCurrency(summary.total_planned)}
                  </span>
                </div>
                <Progress
                  value={Math.min(metrics.budgetExecution, 100)}
                  className="h-2"
                />
                {metrics.budgetExecution > 100 && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" />
                    {formatCurrency(summary.total_paid - summary.total_planned)} acima do planejado
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Costs Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Custos Pendentes
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold tabular-nums text-amber-600">
                  {formatCurrency(metrics.pendingAmount)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {metrics.pendingCount} {metrics.pendingCount === 1 ? "item" : "itens"}
                  {metrics.urgentCount > 0 && (
                    <span className="text-amber-600 ml-1">
                      ({metrics.urgentCount} vencendo em 7d)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average per Property Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Custo Medio/Imovel
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold tabular-nums">
                  {formatCurrency(metrics.avgPerProperty)}
                </p>
                <p className="text-sm text-muted-foreground">
                  em {metrics.uniqueProperties} {metrics.uniqueProperties === 1 ? "imovel" : "imoveis"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overdue Alert Card (conditional) */}
        {metrics.overdueCount > 0 ? (
          <Card className="hover:shadow-md transition-shadow border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-destructive">
                      Custos Atrasados
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold tabular-nums text-destructive">
                    {formatCurrency(metrics.overdueTotal)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {metrics.overdueCount} {metrics.overdueCount === 1 ? "item" : "itens"} vencido{metrics.overdueCount > 1 ? "s" : ""}
                    <span className="text-destructive ml-1">
                      (maior: {metrics.maxOverdueDays}d)
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="hover:shadow-md transition-shadow border-green-500/30 bg-green-500/5">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Total Pago
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold tabular-nums text-green-600">
                    {formatCurrency(summary.total_paid)}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    Sem custos atrasados
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts + Property Cards Row */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Pie Chart - Distribution by Type */}
        {pieChartData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                  <DollarSign className="h-4 w-4" />
                </div>
                Por Tipo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(value as number)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-lg font-bold tabular-nums">
                      {formatCompact(summary.total_all)}
                    </p>
                  </div>
                </div>
              </div>
              {/* Legend with percentages */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                {pieChartData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-muted-foreground truncate">{entry.name}</span>
                    <span className="font-medium ml-auto">{entry.percentage}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Property Cards - Top 3 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <Building2 className="h-4 w-4" />
              </div>
              Top Imoveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              {topProperties.map((prop, index) => (
                <Link
                  key={prop.property_id}
                  href={`/app/properties/${prop.property_id}/costs`}
                  className="block"
                >
                  <div className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xs font-medium text-muted-foreground">
                        #{index + 1}
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-sm truncate mb-1">
                      {prop.property_name}
                    </p>
                    <p className="text-2xl font-bold tabular-nums mb-3">
                      {formatCurrency(prop.total)}
                    </p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Pago</span>
                        <span className="font-medium">{prop.paidPercentage.toFixed(0)}%</span>
                      </div>
                      <Progress value={prop.paidPercentage} className="h-1.5" />
                    </div>
                  </div>
                </Link>
              ))}
              {topProperties.length === 0 && (
                <div className="col-span-3 py-8 text-center text-muted-foreground text-sm">
                  Nenhum imovel com custos
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Chart */}
      {timelineData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <TrendingUp className="h-4 w-4" />
              </div>
              Evolucao Mensal
              <Badge variant="secondary" className="ml-auto text-xs">
                Ultimos 6 meses
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorPlanejado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPago" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  tickFormatter={(v) => formatCompact(v)}
                  width={50}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                  labelFormatter={(label) => `Mes: ${label}`}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="planejado"
                  name="Planejado"
                  stroke="#f59e0b"
                  fill="url(#colorPlanejado)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="pago"
                  name="Pago"
                  stroke="#3b82f6"
                  fill="url(#colorPago)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-6 mt-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-muted-foreground">Planejado</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">Pago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attention Required - Grouped by Urgency */}
      {(groupedUpcoming.overdue.length > 0 || groupedUpcoming.next7Days.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </div>
              Atencao Necessaria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overdue Section */}
            {groupedUpcoming.overdue.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="destructive" className="text-xs">
                    Vencidos ({groupedUpcoming.overdue.length})
                  </Badge>
                </div>
                <div className="space-y-2">
                  {groupedUpcoming.overdue.slice(0, 3).map((cost) => (
                    <div
                      key={cost.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge
                          variant="outline"
                          className="shrink-0"
                          style={{
                            borderColor: COST_TYPE_COLORS[cost.cost_type] + "40",
                            color: COST_TYPE_COLORS[cost.cost_type],
                          }}
                        >
                          {COST_TYPE_LABELS[cost.cost_type]}
                        </Badge>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {cost.category || "Sem categoria"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {cost.property_name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-4">
                        <p className="text-sm font-semibold font-mono">
                          {formatCurrency(cost.amount)}
                        </p>
                        <p className="text-xs text-destructive font-medium">
                          {cost.daysOverdue}d atrasado
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next 7 Days Section */}
            {groupedUpcoming.next7Days.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="text-xs bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-0">
                    Proximos 7 dias ({groupedUpcoming.next7Days.length})
                  </Badge>
                </div>
                <div className="space-y-2">
                  {groupedUpcoming.next7Days.slice(0, 3).map((cost) => (
                    <div
                      key={cost.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge
                          variant="outline"
                          className="shrink-0"
                          style={{
                            borderColor: COST_TYPE_COLORS[cost.cost_type] + "40",
                            color: COST_TYPE_COLORS[cost.cost_type],
                          }}
                        >
                          {COST_TYPE_LABELS[cost.cost_type]}
                        </Badge>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {cost.category || "Sem categoria"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {cost.property_name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-4">
                        <p className="text-sm font-semibold font-mono">
                          {formatCurrency(cost.amount)}
                        </p>
                        <p className="text-xs text-yellow-600 flex items-center justify-end gap-1">
                          <Calendar className="h-3 w-3" />
                          {cost.days_until_due === 0
                            ? "Hoje"
                            : cost.days_until_due === 1
                            ? "Amanha"
                            : `em ${cost.days_until_due}d`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show more link */}
            {(groupedUpcoming.overdue.length > 3 || groupedUpcoming.next7Days.length > 3) && (
              <Button variant="ghost" className="w-full text-sm text-muted-foreground">
                Ver todos ({groupedUpcoming.overdue.length + groupedUpcoming.next7Days.length + groupedUpcoming.next30Days.length})
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters + Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <Filter className="h-4 w-4" />
              </div>
              Todos os Custos
              <Badge variant="secondary" className="ml-2 font-mono text-xs">
                {filteredItems.length}
              </Badge>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {activeFilters > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-9 px-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpar ({activeFilters})
                </Button>
              )}
              <Select value={filterProperty} onValueChange={setFilterProperty}>
                <SelectTrigger className={`w-[160px] h-9 text-sm ${filterProperty !== "all" ? "border-primary" : ""}`}>
                  <SelectValue placeholder="Imovel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos imoveis</SelectItem>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name.length > 25 ? p.name.substring(0, 25) + "..." : p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className={`w-[130px] h-9 text-sm ${filterType !== "all" ? "border-primary" : ""}`}>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos tipos</SelectItem>
                  <SelectItem value="renovation">Reforma</SelectItem>
                  <SelectItem value="legal">Juridico</SelectItem>
                  <SelectItem value="tax">Impostos</SelectItem>
                  <SelectItem value="other">Outros</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className={`w-[130px] h-9 text-sm ${filterStatus !== "all" ? "border-primary" : ""}`}>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  <SelectItem value="planned">Planejado</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="pl-6">Imovel</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="pr-6 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      Nenhum custo encontrado com os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((cost) => (
                    <TableRow key={cost.id} className="group">
                      <TableCell className="pl-6">
                        <Link
                          href={`/app/properties/${cost.property_id}/costs`}
                          className="font-medium text-foreground hover:text-primary hover:underline underline-offset-4 transition-colors"
                        >
                          {cost.property_name.length > 30
                            ? cost.property_name.substring(0, 30) + "..."
                            : cost.property_name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="font-normal"
                          style={{
                            borderColor: COST_TYPE_COLORS[cost.cost_type] + "40",
                            color: COST_TYPE_COLORS[cost.cost_type],
                          }}
                        >
                          {COST_TYPE_LABELS[cost.cost_type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {cost.category || "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(cost.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={cost.status === "paid" ? "default" : "secondary"}
                          className={cost.status === "paid"
                            ? "bg-primary/10 text-primary hover:bg-primary/20 border-0"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border-0"
                          }
                        >
                          {cost.status === "paid" ? "Pago" : "Planejado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(cost.due_date)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {cost.vendor || "—"}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        {cost.status === "planned" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkPaid(cost)}
                            disabled={isPending}
                            className="text-primary"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Marcar Pago
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkPaid(cost)}
                            disabled={isPending}
                          >
                            <Undo2 className="h-4 w-4 mr-1" />
                            Desfazer
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatCompact(value: number): string {
  if (value >= 1000000) {
    return new Intl.NumberFormat("pt-BR", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}k`;
  }
  return value.toString();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}
