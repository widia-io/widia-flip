"use client";

import { useState, useMemo } from "react";
import type { UnifiedSnapshot } from "@widia/shared";
import { SnapshotsTable } from "./SnapshotsTable";
import { SnapshotsFilters } from "./SnapshotsFilters";
import { SnapshotsEmptyState } from "./SnapshotsEmptyState";
import { SnapshotsInfoCard } from "./SnapshotsInfoCard";
import { SnapshotCompareModal } from "./SnapshotCompareModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitCompare, FileDown } from "lucide-react";
import { exportSnapshotsToCSV } from "@/lib/export";

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
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">
                {totalCount} {totalCount === 1 ? "análise" : "análises"}
              </CardTitle>
              {selectedForCompare.size > 0 && (
                <span className="text-sm text-muted-foreground">
                  ({selectedForCompare.size}/2 selecionadas)
                </span>
              )}
              {selectedSnapshotsForCompare && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setShowCompareModal(true)}
                >
                  <GitCompare className="h-4 w-4 mr-1" />
                  Comparar
                </Button>
              )}
              {snapshots.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportSnapshotsToCSV(snapshots)}
                >
                  <FileDown className="h-4 w-4 mr-1" />
                  CSV
                </Button>
              )}
            </div>
            <SnapshotsFilters initialFilters={initialFilters} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {snapshots.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma análise encontrada com os filtros selecionados.
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

      {selectedSnapshot && (
        <UnifiedSnapshotModal
          snapshot={selectedSnapshot}
          open={selectedSnapshot !== null}
          onOpenChange={(open) => !open && setSelectedSnapshot(null)}
        />
      )}

      {showCompareModal && selectedSnapshotsForCompare && (
        <SnapshotCompareModal
          snapshots={selectedSnapshotsForCompare}
          onClose={() => setShowCompareModal(false)}
        />
      )}
    </div>
  );
}

// Simplified modal for unified snapshots (shows summary data)
function UnifiedSnapshotModal({
  snapshot,
  open,
  onOpenChange,
}: {
  snapshot: UnifiedSnapshot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
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

  const STATUS_CONFIG: Record<string, { label: string }> = {
    prospecting: { label: "Prospecção" },
    analyzing: { label: "Analisando" },
    bought: { label: "Comprado" },
    renovation: { label: "Reforma" },
    for_sale: { label: "À Venda" },
    sold: { label: "Vendido" },
    archived: { label: "Arquivado" },
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${open ? "" : "hidden"}`}
    >
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 w-full max-w-lg rounded-lg bg-background p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              Análise {snapshot.snapshot_type === "cash" ? "À Vista" : "Financiamento"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {formatDate(snapshot.created_at)}
              {snapshot.status_pipeline && (
                <> · {STATUS_CONFIG[snapshot.status_pipeline]?.label}</>
              )}
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
          >
            <span className="sr-only">Fechar</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {snapshot.property_name && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Imóvel</p>
              <p className="text-sm">{snapshot.property_name}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Preço de Compra
              </p>
              <p className="text-sm">{formatCurrency(snapshot.purchase_price)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Preço de Venda
              </p>
              <p className="text-sm">{formatCurrency(snapshot.sale_price)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Lucro Líquido
              </p>
              <p
                className={`text-lg font-semibold ${
                  snapshot.net_profit >= 0 ? "text-primary" : "text-destructive"
                }`}
              >
                {formatCurrency(snapshot.net_profit)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">ROI</p>
              <p
                className={`text-lg font-semibold ${
                  snapshot.roi >= 0 ? "text-primary" : "text-destructive"
                }`}
              >
                {snapshot.roi.toFixed(2)}%
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <a
              href={`/app/properties/${snapshot.property_id}/${snapshot.snapshot_type === "cash" ? "viability" : "financing"}`}
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              Ver detalhes completos
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
