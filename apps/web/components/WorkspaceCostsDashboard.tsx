"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  DollarSign,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Building2,
  Filter,
  Calendar,
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const COST_TYPE_LABELS: Record<CostType, string> = {
  renovation: "Reforma",
  legal: "Jurídico",
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

  const pieChartData = useMemo(() => {
    return summary.by_type.map((item) => ({
      name: COST_TYPE_LABELS[item.cost_type as CostType] || item.cost_type,
      value: item.total_planned + item.total_paid,
      color: COST_TYPE_COLORS[item.cost_type as CostType] || "#6b7280",
    }));
  }, [summary.by_type]);

  const barChartData = useMemo(() => {
    return summary.by_property.slice(0, 6).map((item) => ({
      name: item.property_name.length > 20
        ? item.property_name.substring(0, 20) + "..."
        : item.property_name,
      planejado: item.total_planned,
      pago: item.total_paid,
    }));
  }, [summary.by_property]);

  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <EmptyState
          icon={DollarSign}
          title="Nenhum custo cadastrado"
          description="Adicione custos aos seus imóveis para visualizar o dashboard consolidado."
          tip="Os custos podem ser cadastrados na aba de custos de cada imóvel ou pelo cronograma."
          action={{
            label: "Ver imóveis",
            href: "/app/properties",
          }}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="relative overflow-hidden border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardContent className="pt-6 relative">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Planejado
                </p>
                <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {formatCurrency(summary.total_planned)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardContent className="pt-6 relative">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Pago
                </p>
                <p className="text-2xl font-bold tabular-nums text-primary">
                  {formatCurrency(summary.total_paid)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-secondary/50 to-transparent">
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/30 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardContent className="pt-6 relative">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary ring-1 ring-border">
                <TrendingUp className="h-6 w-6 text-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Total Geral
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {formatCurrency(summary.total_all)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      {(pieChartData.length > 0 || barChartData.length > 0) && (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {pieChartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  Distribuição por Tipo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
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
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {barChartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                    <Building2 className="h-4 w-4" />
                  </div>
                  Custos por Imóvel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barChartData} layout="vertical" barGap={0}>
                    <XAxis
                      type="number"
                      tickFormatter={(v) => formatCompact(v)}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(value as number)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(value) => <span className="text-sm text-foreground">{value === "planejado" ? "Planejado" : "Pago"}</span>}
                    />
                    <Bar dataKey="planejado" fill="#f59e0b" radius={[0, 4, 4, 0]} name="planejado" />
                    <Bar dataKey="pago" fill="#3b82f6" radius={[0, 4, 4, 0]} name="pago" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Upcoming Due Dates */}
      {upcoming.length > 0 && (
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 via-transparent to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </div>
              Próximos Vencimentos
              <Badge variant="secondary" className="ml-auto font-mono text-xs">
                {upcoming.length} {upcoming.length === 1 ? "item" : "itens"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/50">
              {upcoming.slice(0, 5).map((cost) => (
                <div
                  key={cost.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0 group"
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
                    <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                      <Calendar className="h-3 w-3" />
                      {cost.days_until_due === 0
                        ? <span className="text-amber-500 font-medium">Hoje</span>
                        : cost.days_until_due === 1
                        ? <span className="text-amber-500 font-medium">Amanhã</span>
                        : <span>em {cost.days_until_due} dias</span>
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
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
              <Select value={filterProperty} onValueChange={setFilterProperty}>
                <SelectTrigger className="w-[160px] h-9 text-sm">
                  <SelectValue placeholder="Imóvel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos imóveis</SelectItem>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name.length > 25 ? p.name.substring(0, 25) + "..." : p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[130px] h-9 text-sm">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos tipos</SelectItem>
                  <SelectItem value="renovation">Reforma</SelectItem>
                  <SelectItem value="legal">Jurídico</SelectItem>
                  <SelectItem value="tax">Impostos</SelectItem>
                  <SelectItem value="other">Outros</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[130px] h-9 text-sm">
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
                  <TableHead className="pl-6">Imóvel</TableHead>
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
