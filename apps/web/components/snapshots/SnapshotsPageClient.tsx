"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { UnifiedSnapshot } from "@widia/shared";
import { SnapshotsTable } from "./SnapshotsTable";
import { SnapshotsFilters } from "./SnapshotsFilters";
import { SnapshotsEmptyState } from "./SnapshotsEmptyState";
import { SnapshotsInfoCard } from "./SnapshotsInfoCard";
import { SnapshotCompareModal } from "./SnapshotCompareModal";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  GitCompare,
  FileDown,
  TableProperties,
  Calculator,
  Building2,
  Calendar,
  TrendingUp,
  Percent,
  ExternalLink,
} from "lucide-react";
import { exportSnapshotsToCSV } from "@/lib/export";
import { cn } from "@/lib/utils";

interface SnapshotsPageClientProps {
  snapshots: UnifiedSnapshot[];
  totalCount: number;
  initialFilters: {
    snapshot_type?: "cash" | "financing" | "all";
    status_pipeline?: string;
    property_search?: string;
  };
}

export function SnapshotsPageClient({
  snapshots,
  totalCount,
  initialFilters,
}: SnapshotsPageClientProps) {
  const [selectedSnapshot, setSelectedSnapshot] = useState<UnifiedSnapshot | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());
  const [showCompareModal, setShowCompareModal] = useState(false);

  const snapshotsMap = useMemo(() => {
    const map = new Map<string, UnifiedSnapshot>();
    snapshots.forEach((s) => map.set(`${s.snapshot_type}-${s.id}`, s));
    return map;
  }, [snapshots]);

  const handleSelectionChange = (snapshotKey: string, checked: boolean) => {
    setSelectedForCompare((prev) => {
      const next = new Set(prev);
      if (checked) {
        if (next.size < 2) {
          next.add(snapshotKey);
        }
      } else {
        next.delete(snapshotKey);
      }
      return next;
    });
  };

  const selectedSnapshotsForCompare = useMemo(() => {
    const keys = Array.from(selectedForCompare);
    if (keys.length !== 2) return null;
    const s1 = snapshotsMap.get(keys[0]);
    const s2 = snapshotsMap.get(keys[1]);
    if (!s1 || !s2) return null;
    return [s1, s2] as [UnifiedSnapshot, UnifiedSnapshot];
  }, [selectedForCompare, snapshotsMap]);

  if (snapshots.length === 0 && !initialFilters.snapshot_type && !initialFilters.status_pipeline && !initialFilters.property_search) {
    return <SnapshotsEmptyState />;
  }

  return (
    <div className="flex flex-col gap-4">
      <SnapshotsInfoCard />

      <Card>
        <CardHeader className="pb-4">
          {/* Header with icon and title */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                  <TableProperties className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Lista de Análises</h2>
                  <p className="text-xs text-muted-foreground">
                    {totalCount} {totalCount === 1 ? "registro" : "registros"}
                    {selectedForCompare.size > 0 && (
                      <span className="text-primary ml-2">
                        • {selectedForCompare.size}/2 selecionadas
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {selectedSnapshotsForCompare && (
                  <Button
                    size="sm"
                    onClick={() => setShowCompareModal(true)}
                    className="gap-2"
                  >
                    <GitCompare className="h-4 w-4" />
                    <span className="hidden sm:inline">Comparar</span>
                  </Button>
                )}
                {snapshots.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportSnapshotsToCSV(snapshots)}
                    className="gap-2"
                  >
                    <FileDown className="h-4 w-4" />
                    <span className="hidden sm:inline">Exportar</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Filters */}
            <SnapshotsFilters initialFilters={initialFilters} />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {snapshots.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center px-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-4">
                <TableProperties className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Nenhuma análise encontrada</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tente ajustar os filtros para ver mais resultados
              </p>
            </div>
          ) : (
            <SnapshotsTable
              snapshots={snapshots}
              onSnapshotClick={setSelectedSnapshot}
              selectedForCompare={selectedForCompare}
              onSelectionChange={handleSelectionChange}
            />
          )}
        </CardContent>
      </Card>

      {/* Snapshot Detail Modal */}
      <UnifiedSnapshotModal
        snapshot={selectedSnapshot}
        open={selectedSnapshot !== null}
        onOpenChange={(open) => !open && setSelectedSnapshot(null)}
      />

      {/* Compare Modal */}
      {selectedSnapshotsForCompare && (
        <SnapshotCompareModal
          snapshots={selectedSnapshotsForCompare}
          open={showCompareModal}
          onOpenChange={setShowCompareModal}
        />
      )}
    </div>
  );
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  prospecting: { label: "Prospecção", variant: "outline" },
  analyzing: { label: "Analisando", variant: "secondary" },
  bought: { label: "Comprado", variant: "default" },
  renovation: { label: "Reforma", variant: "secondary" },
  for_sale: { label: "À Venda", variant: "outline" },
  sold: { label: "Vendido", variant: "default" },
  archived: { label: "Arquivado", variant: "secondary" },
};

function UnifiedSnapshotModal({
  snapshot,
  open,
  onOpenChange,
}: {
  snapshot: UnifiedSnapshot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!snapshot) return null;

  const formatCurrency = (value: number | null) => {
    if (value === null) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusConfig = snapshot.status_pipeline
    ? STATUS_CONFIG[snapshot.status_pipeline]
    : null;

  const isPositive = snapshot.net_profit > 0;
  const isNegative = snapshot.net_profit < 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0">
        {/* Header */}
        <div className={cn(
          "px-6 py-5 border-b",
          isPositive ? "bg-green-500/5" : isNegative ? "bg-destructive/5" : "bg-muted/30"
        )}>
          <DialogHeader className="space-y-0">
            <div className="flex items-center gap-4">
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl",
                isPositive ? "bg-green-500/10" : isNegative ? "bg-destructive/10" : "bg-primary/10"
              )}>
                <Calculator className={cn(
                  "h-6 w-6",
                  isPositive ? "text-green-600" : isNegative ? "text-destructive" : "text-primary"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold truncate">
                    {snapshot.snapshot_type === "cash" ? "Análise À Vista" : "Análise Financiamento"}
                  </DialogTitle>
                  {statusConfig && (
                    <Badge variant={statusConfig.variant} className="shrink-0">
                      {statusConfig.label}
                    </Badge>
                  )}
                </div>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(snapshot.created_at)}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Property Info */}
          {snapshot.property_name && (
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 shrink-0">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Imóvel
                </p>
                <p className="font-medium mt-0.5">{snapshot.property_name}</p>
              </div>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4">
            <Card className={cn(
              isPositive ? "border-green-500/30 bg-green-500/5" :
              isNegative ? "border-destructive/30 bg-destructive/5" : ""
            )}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    isPositive ? "bg-green-500/10" :
                    isNegative ? "bg-destructive/10" : "bg-muted"
                  )}>
                    <TrendingUp className={cn(
                      "h-4 w-4",
                      isPositive ? "text-green-600" :
                      isNegative ? "text-destructive" : "text-muted-foreground"
                    )} />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Lucro
                  </span>
                </div>
                <p className={cn(
                  "text-xl font-bold tabular-nums",
                  isPositive ? "text-green-600" :
                  isNegative ? "text-destructive" : ""
                )}>
                  {formatCurrency(snapshot.net_profit)}
                </p>
              </CardContent>
            </Card>

            <Card className={cn(
              snapshot.roi > 0 ? "border-green-500/30 bg-green-500/5" :
              snapshot.roi < 0 ? "border-destructive/30 bg-destructive/5" : ""
            )}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    snapshot.roi > 0 ? "bg-green-500/10" :
                    snapshot.roi < 0 ? "bg-destructive/10" : "bg-muted"
                  )}>
                    <Percent className={cn(
                      "h-4 w-4",
                      snapshot.roi > 0 ? "text-green-600" :
                      snapshot.roi < 0 ? "text-destructive" : "text-muted-foreground"
                    )} />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    ROI
                  </span>
                </div>
                <p className={cn(
                  "text-xl font-bold tabular-nums",
                  snapshot.roi > 0 ? "text-green-600" :
                  snapshot.roi < 0 ? "text-destructive" : ""
                )}>
                  {snapshot.roi.toFixed(2)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Price Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Preço de Compra</p>
              <p className="text-sm font-semibold tabular-nums mt-1">
                {formatCurrency(snapshot.purchase_price)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Preço de Venda</p>
              <p className="text-sm font-semibold tabular-nums mt-1">
                {formatCurrency(snapshot.sale_price)}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/30">
          <Button asChild className="w-full gap-2">
            <Link href={`/app/properties/${snapshot.property_id}/${snapshot.snapshot_type === "cash" ? "viability" : "financing"}`}>
              <ExternalLink className="h-4 w-4" />
              Ver análise completa
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
