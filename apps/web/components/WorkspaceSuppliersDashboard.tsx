"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Star,
  DollarSign,
  TrendingUp,
  Phone,
  Mail,
  Pencil,
  Trash2,
  Filter,
  X,
  History,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type {
  Supplier,
  SuppliersSummary,
  SupplierCategory,
} from "@widia/shared";
import { SUPPLIER_CATEGORY_LABELS } from "@widia/shared";
import {
  deleteSupplierAction,
  listWorkspaceSuppliersAction,
  type WorkspaceSuppliersFilters,
} from "@/lib/actions/suppliers";

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { StarRating } from "@/components/StarRating";
import { SupplierFormModal } from "@/components/SupplierFormModal";

const CATEGORY_COLORS: Record<string, string> = {
  pintura: "#3b82f6",
  eletrica: "#f59e0b",
  hidraulica: "#06b6d4",
  arquitetura: "#8b5cf6",
  engenharia: "#ec4899",
  marcenaria: "#84cc16",
  gesso: "#6b7280",
  piso: "#f97316",
  serralheria: "#64748b",
  limpeza: "#22c55e",
  corretor: "#a855f7",
  advogado: "#0ea5e9",
  despachante: "#14b8a6",
  outro: "#9ca3af",
};

const PRICE_RANGES = [
  { label: "Todos os valores", value: "all" },
  { label: "Até R$ 100/h", value: "0-100" },
  { label: "R$ 100-250/h", value: "100-250" },
  { label: "R$ 250-500/h", value: "250-500" },
  { label: "Acima de R$ 500/h", value: "500+" },
];

const RATING_OPTIONS = [
  { label: "Todas avaliações", value: "all" },
  { label: "5 estrelas", value: "5" },
  { label: "4+ estrelas", value: "4" },
  { label: "3+ estrelas", value: "3" },
  { label: "2+ estrelas", value: "2" },
];

interface WorkspaceSuppliersDashboardProps {
  items: Supplier[];
  summary: SuppliersSummary;
  workspaceId: string;
}

export function WorkspaceSuppliersDashboard({
  items: initialItems,
  summary: initialSummary,
  workspaceId,
}: WorkspaceSuppliersDashboardProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [summary, setSummary] = useState(initialSummary);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterRating, setFilterRating] = useState<string>("all");
  const [filterPrice, setFilterPrice] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  const handleDelete = async (supplierId: string) => {
    startTransition(async () => {
      const result = await deleteSupplierAction(supplierId);
      if (result.success) {
        setItems((prev) => prev.filter((s) => s.id !== supplierId));
        router.refresh();
      }
    });
  };

  const handleFilterChange = () => {
    startTransition(async () => {
      const filters: WorkspaceSuppliersFilters = {};
      if (filterCategory !== "all") filters.category = filterCategory;
      if (filterRating !== "all") filters.minRating = parseInt(filterRating);
      if (filterPrice !== "all") {
        const [min, max] = filterPrice.split("-");
        if (min) filters.minHourlyRate = parseFloat(min);
        if (max && max !== "+") filters.maxHourlyRate = parseFloat(max);
      }

      const result = await listWorkspaceSuppliersAction(workspaceId, filters);
      if (result.data) {
        setItems(result.data.items);
        setSummary(result.data.summary);
      }
    });
  };

  const hasFilters = filterCategory !== "all" || filterRating !== "all" || filterPrice !== "all";

  const clearFilters = () => {
    setFilterCategory("all");
    setFilterRating("all");
    setFilterPrice("all");
    startTransition(async () => {
      const result = await listWorkspaceSuppliersAction(workspaceId);
      if (result.data) {
        setItems(result.data.items);
        setSummary(result.data.summary);
      }
    });
  };

  const handleRefresh = () => {
    startTransition(async () => {
      const result = await listWorkspaceSuppliersAction(workspaceId);
      if (result.data) {
        setItems(result.data.items);
        setSummary(result.data.summary);
      }
      router.refresh();
    });
  };

  // Pie chart data
  const pieData = useMemo(() => {
    return summary.by_category.map((cat) => ({
      name: SUPPLIER_CATEGORY_LABELS[cat.category as SupplierCategory] || cat.category,
      value: cat.count,
      color: CATEGORY_COLORS[cat.category] || "#9ca3af",
    }));
  }, [summary.by_category]);

  // Dominant category
  const dominantCategory = useMemo(() => {
    if (summary.by_category.length === 0) return null;
    const sorted = [...summary.by_category].sort((a, b) => b.count - a.count);
    return sorted[0];
  }, [summary.by_category]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  if (items.length === 0 && !hasFilters) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={Users}
          title="Nenhum fornecedor cadastrado"
          description="Cadastre seus fornecedores e profissionais para gerenciar seus contatos e histórico de trabalho."
          tip="Adicione fornecedores com avaliações e valores para comparar orçamentos."
        />
        <div className="flex justify-center">
          <SupplierFormModal
            workspaceId={workspaceId}
            onSuccess={handleRefresh}
            trigger={
              <Button>
                <Users className="mr-2 h-4 w-4" />
                Adicionar Fornecedor
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Suppliers */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Fornecedores
                </p>
                <p className="text-3xl font-bold">{summary.total_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Rating */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100">
                <Star className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Média Avaliação
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-bold">
                    {summary.avg_rating?.toFixed(1) || "-"}
                  </p>
                  {summary.avg_rating && (
                    <StarRating value={Math.round(summary.avg_rating)} readOnly size="sm" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Hourly Rate */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Média Valor/Hora
                </p>
                <p className="text-3xl font-bold">
                  {summary.avg_hourly_rate
                    ? formatCurrency(summary.avg_hourly_rate)
                    : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dominant Category */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Categoria Principal
                </p>
                <p className="text-xl font-bold">
                  {dominantCategory
                    ? SUPPLIER_CATEGORY_LABELS[dominantCategory.category as SupplierCategory]
                    : "-"}
                </p>
                {dominantCategory && (
                  <p className="text-sm text-muted-foreground">
                    {dominantCategory.count} fornecedores
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Pie Chart - Distribution by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [
                        `${value} fornecedor${Number(value) > 1 ? "es" : ""}`,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {pieData.slice(0, 5).map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1 text-xs">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span>{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-[180px] items-center justify-center text-muted-foreground">
                Sem dados
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Rated */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Top Fornecedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.top_rated.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {summary.top_rated.slice(0, 5).map((supplier) => (
                  <div
                    key={supplier.id}
                    className="flex flex-col gap-1 rounded-lg border p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{supplier.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {SUPPLIER_CATEGORY_LABELS[supplier.category as SupplierCategory]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {supplier.rating && (
                        <StarRating value={supplier.rating} readOnly size="sm" />
                      )}
                      {supplier.hourly_rate && (
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(supplier.hourly_rate)}/h
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[100px] items-center justify-center text-muted-foreground">
                Nenhum fornecedor com avaliação 4+ ainda
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Stats (History) */}
      {summary.usage_stats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              <History className="h-4 w-4" />
              Histórico de Uso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {summary.usage_stats.map((stat) => (
                <div
                  key={stat.supplier_id}
                  className="flex flex-col gap-1 rounded-lg border p-3"
                >
                  <span className="font-medium truncate">{stat.supplier_name}</span>
                  <Badge variant="outline" className="w-fit text-xs">
                    {SUPPLIER_CATEGORY_LABELS[stat.category as SupplierCategory]}
                  </Badge>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {stat.total_costs} custo{stat.total_costs > 1 ? "s" : ""} •{" "}
                    {formatCurrency(stat.total_amount)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters + Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Todos os Fornecedores
          </CardTitle>
          <SupplierFormModal
            workspaceId={workspaceId}
            onSuccess={handleRefresh}
            trigger={
              <Button size="sm">
                <Users className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            }
          />
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={filterCategory}
              onValueChange={(v) => {
                setFilterCategory(v);
                setTimeout(handleFilterChange, 0);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {Object.entries(SUPPLIER_CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterRating}
              onValueChange={(v) => {
                setFilterRating(v);
                setTimeout(handleFilterChange, 0);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Avaliação" />
              </SelectTrigger>
              <SelectContent>
                {RATING_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterPrice}
              onValueChange={(v) => {
                setFilterPrice(v);
                setTimeout(handleFilterChange, 0);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Valor/Hora" />
              </SelectTrigger>
              <SelectContent>
                {PRICE_RANGES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-3 w-3" />
                Limpar
              </Button>
            )}

            <Badge variant="secondary" className="ml-auto">
              {items.length} fornecedor{items.length !== 1 ? "es" : ""}
            </Badge>
          </div>

          {/* Table */}
          {items.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Avaliação</TableHead>
                    <TableHead>Valor/Hora</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: CATEGORY_COLORS[supplier.category],
                            color: CATEGORY_COLORS[supplier.category],
                          }}
                        >
                          {SUPPLIER_CATEGORY_LABELS[supplier.category as SupplierCategory]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {supplier.rating ? (
                          <StarRating value={supplier.rating} readOnly size="sm" />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {supplier.hourly_rate
                          ? formatCurrency(supplier.hourly_rate)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {supplier.phone && (
                            <a
                              href={`tel:${supplier.phone}`}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Phone className="h-4 w-4" />
                            </a>
                          )}
                          {supplier.email && (
                            <a
                              href={`mailto:${supplier.email}`}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Mail className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <SupplierFormModal
                            workspaceId={workspaceId}
                            supplier={supplier}
                            onSuccess={handleRefresh}
                            trigger={
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Deletar fornecedor?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O fornecedor{" "}
                                  <strong>{supplier.name}</strong> será removido
                                  permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(supplier.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Deletar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Nenhum fornecedor encontrado com os filtros selecionados.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
