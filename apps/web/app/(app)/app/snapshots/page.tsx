import { ListWorkspacesResponseSchema } from "@widia/shared";
import Link from "next/link";
import {
  LineChart,
  TrendingUp,
  Percent,
  CheckCircle2,
  BarChart3,
} from "lucide-react";

import { apiFetch } from "@/lib/apiFetch";
import { listWorkspaceSnapshotsAction } from "@/lib/actions/snapshots";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SnapshotsPageClient } from "@/components/snapshots/SnapshotsPageClient";
import { cn } from "@/lib/utils";

export default async function SnapshotsPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = (await props.searchParams) ?? {};

  const snapshotType =
    typeof searchParams.type === "string" ? searchParams.type : undefined;
  const statusPipeline =
    typeof searchParams.status === "string" ? searchParams.status : undefined;
  const propertySearch =
    typeof searchParams.search === "string" ? searchParams.search : undefined;

  const activeWorkspaceId = await getActiveWorkspaceId();

  const workspacesRaw = await apiFetch<{ items: { id: string; name: string }[] }>(
    "/api/v1/workspaces",
  );
  const workspaces = ListWorkspacesResponseSchema.parse(workspacesRaw);

  if (workspaces.items.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <LineChart className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Crie seu primeiro projeto</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              Você precisa criar um projeto para começar a salvar análises de viabilidade.
            </p>
            <Button asChild className="mt-6">
              <Link href="/app/workspaces">Criar projeto</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const validActiveWorkspace =
    activeWorkspaceId &&
    workspaces.items.some((ws) => ws.id === activeWorkspaceId);
  const workspace = validActiveWorkspace
    ? workspaces.items.find((ws) => ws.id === activeWorkspaceId)!
    : workspaces.items[0];
  const workspaceId = workspace.id;
  const workspaceName = workspace.name;

  const snapshotsResult = await listWorkspaceSnapshotsAction(workspaceId, {
    snapshot_type: snapshotType as "cash" | "financing" | "all" | undefined,
    status_pipeline: statusPipeline,
    property_search: propertySearch,
  });

  const snapshots = snapshotsResult.data?.items ?? [];
  const totalCount = snapshotsResult.data?.total_count ?? 0;
  const error = snapshotsResult.error;

  // Calculate KPI metrics
  const totalAnalyses = totalCount;
  const positiveAnalyses = snapshots.filter((s) => s.net_profit > 0).length;
  const avgProfit = snapshots.length > 0
    ? snapshots.reduce((sum, s) => sum + s.net_profit, 0) / snapshots.length
    : 0;
  const bestRoi = snapshots.length > 0
    ? Math.max(...snapshots.map((s) => s.roi))
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 shrink-0">
          <LineChart className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Central de Análises</h1>
          <p className="text-muted-foreground mt-1">
            Todas as análises de viabilidade salvas em <span className="font-medium text-foreground">{workspaceName}</span>
          </p>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      {snapshots.length > 0 && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {/* Total Analyses */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Total
                </p>
              </div>
              <p className="text-2xl font-bold tabular-nums">{totalAnalyses}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {totalAnalyses === 1 ? "análise salva" : "análises salvas"}
              </p>
            </CardContent>
          </Card>

          {/* Positive Analyses */}
          <Card className={cn(
            "hover:shadow-md transition-shadow",
            positiveAnalyses > 0 && "border-green-500/30 bg-green-500/5"
          )}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Viáveis
                </p>
              </div>
              <p className={cn(
                "text-2xl font-bold tabular-nums",
                positiveAnalyses > 0 && "text-green-600"
              )}>
                {positiveAnalyses}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {totalAnalyses > 0 ? `${((positiveAnalyses / totalAnalyses) * 100).toFixed(0)}% do total` : "—"}
              </p>
            </CardContent>
          </Card>

          {/* Average Profit */}
          <Card className={cn(
            "hover:shadow-md transition-shadow",
            avgProfit > 0 ? "border-green-500/30 bg-green-500/5" :
            avgProfit < 0 ? "border-destructive/30 bg-destructive/5" : ""
          )}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  avgProfit > 0 ? "bg-green-500/10" :
                  avgProfit < 0 ? "bg-destructive/10" : "bg-muted"
                )}>
                  <TrendingUp className={cn(
                    "h-5 w-5",
                    avgProfit > 0 ? "text-green-600" :
                    avgProfit < 0 ? "text-destructive" : "text-muted-foreground"
                  )} />
                </div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Lucro Médio
                </p>
              </div>
              <p className={cn(
                "text-2xl font-bold tabular-nums",
                avgProfit > 0 ? "text-green-600" :
                avgProfit < 0 ? "text-destructive" : ""
              )}>
                {formatCurrency(avgProfit)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">por análise</p>
            </CardContent>
          </Card>

          {/* Best ROI */}
          <Card className={cn(
            "hover:shadow-md transition-shadow",
            bestRoi > 0 ? "border-green-500/30 bg-green-500/5" :
            bestRoi < 0 ? "border-destructive/30 bg-destructive/5" : ""
          )}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  bestRoi > 0 ? "bg-green-500/10" :
                  bestRoi < 0 ? "bg-destructive/10" : "bg-muted"
                )}>
                  <Percent className={cn(
                    "h-5 w-5",
                    bestRoi > 0 ? "text-green-600" :
                    bestRoi < 0 ? "text-destructive" : "text-muted-foreground"
                  )} />
                </div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Melhor ROI
                </p>
              </div>
              <p className={cn(
                "text-2xl font-bold tabular-nums",
                bestRoi > 0 ? "text-green-600" :
                bestRoi < 0 ? "text-destructive" : ""
              )}>
                {bestRoi.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">retorno máximo</p>
            </CardContent>
          </Card>
        </div>
      )}

      <SnapshotsPageClient
        snapshots={snapshots}
        totalCount={totalCount}
        initialFilters={{
          snapshot_type: snapshotType as "cash" | "financing" | "all" | undefined,
          status_pipeline: statusPipeline,
          property_search: propertySearch,
        }}
      />
    </div>
  );
}
