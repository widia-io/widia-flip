"use client";

import Link from "next/link";
import type { UnifiedSnapshot } from "@widia/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  HelpCircle,
  Building2,
  Calendar,
  Banknote,
  CreditCard,
} from "lucide-react";

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  prospecting: { label: "Prospecção", variant: "outline" },
  analyzing: { label: "Analisando", variant: "secondary" },
  bought: { label: "Comprado", variant: "default" },
  renovation: { label: "Reforma", variant: "secondary" },
  for_sale: { label: "À Venda", variant: "outline" },
  sold: { label: "Vendido", variant: "default" },
  archived: { label: "Arquivado", variant: "secondary" },
};

interface SnapshotsTableProps {
  snapshots: UnifiedSnapshot[];
  onSnapshotClick: (snapshot: UnifiedSnapshot) => void;
  selectedForCompare?: Set<string>;
  onSelectionChange?: (snapshotKey: string, checked: boolean) => void;
}

export function SnapshotsTable({
  snapshots,
  onSnapshotClick,
  selectedForCompare,
  onSelectionChange,
}: SnapshotsTableProps) {
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
      year: "2-digit",
    });
  };

  const getSnapshotKey = (snapshot: UnifiedSnapshot) =>
    `${snapshot.snapshot_type}-${snapshot.id}`;

  return (
    <TooltipProvider delayDuration={300}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {onSelectionChange && <TableHead className="w-12 pl-6"></TableHead>}
            <TableHead className={cn(!onSelectionChange && "pl-6")}>Imóvel</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <span>Lucro</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px] text-center">
                    Lucro líquido após todos os custos e impostos
                  </TooltipContent>
                </Tooltip>
              </div>
            </TableHead>
            <TableHead className="text-right pr-6">
              <div className="flex items-center justify-end gap-1.5">
                <span>ROI</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-center">
                    Retorno sobre Investimento: lucro líquido dividido pelo investimento total
                  </TooltipContent>
                </Tooltip>
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {snapshots.map((snapshot) => {
            const isPositive = snapshot.net_profit > 0;
            const isNegative = snapshot.net_profit < 0;
            const statusConfig = snapshot.status_pipeline
              ? STATUS_CONFIG[snapshot.status_pipeline]
              : null;
            const snapshotKey = getSnapshotKey(snapshot);
            const isSelected = selectedForCompare?.has(snapshotKey) ?? false;
            const selectionDisabled = !isSelected && (selectedForCompare?.size ?? 0) >= 2;

            return (
              <TableRow
                key={snapshotKey}
                className={cn(
                  "cursor-pointer transition-colors group",
                  isSelected
                    ? "bg-primary/5 hover:bg-primary/10"
                    : isPositive
                      ? "hover:bg-green-500/5"
                      : isNegative
                        ? "hover:bg-destructive/5"
                        : "hover:bg-muted/50"
                )}
                onClick={() => onSnapshotClick(snapshot)}
              >
                {onSelectionChange && (
                  <TableCell className="pl-6" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      disabled={selectionDisabled}
                      onCheckedChange={(checked) =>
                        onSelectionChange(snapshotKey, checked === true)
                      }
                      className={cn(
                        selectionDisabled && "opacity-30"
                      )}
                    />
                  </TableCell>
                )}
                <TableCell className={cn(!onSelectionChange && "pl-6")}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors shrink-0">
                      <Building2 className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/app/properties/${snapshot.property_id}/overview`}
                        className="font-medium text-foreground hover:text-primary hover:underline transition-colors truncate block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {snapshot.property_name || "Sem endereço"}
                      </Link>
                      {snapshot.annotation_count > 0 && (
                        <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                          <MessageSquare className="h-3 w-3" />
                          <span className="text-xs">{snapshot.annotation_count} nota{snapshot.annotation_count > 1 ? "s" : ""}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex h-6 w-6 items-center justify-center rounded",
                      snapshot.snapshot_type === "cash"
                        ? "bg-green-500/10"
                        : "bg-blue-500/10"
                    )}>
                      {snapshot.snapshot_type === "cash" ? (
                        <Banknote className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                      )}
                    </div>
                    <span className="text-sm">
                      {snapshot.snapshot_type === "cash" ? "À Vista" : "Financ."}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {statusConfig ? (
                    <Badge variant={statusConfig.variant} className="font-normal">
                      {statusConfig.label}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="text-sm">{formatDate(snapshot.created_at)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className={cn(
                    "inline-flex items-center justify-end px-2 py-1 rounded-md",
                    isPositive && "bg-green-500/10",
                    isNegative && "bg-destructive/10"
                  )}>
                    <span className={cn(
                      "font-semibold tabular-nums text-sm",
                      isPositive && "text-green-600",
                      isNegative && "text-destructive"
                    )}>
                      {formatCurrency(snapshot.net_profit)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right pr-6">
                  <div className={cn(
                    "inline-flex items-center justify-end px-2 py-1 rounded-md",
                    isPositive && "bg-green-500/10",
                    isNegative && "bg-destructive/10"
                  )}>
                    <span className={cn(
                      "font-semibold tabular-nums text-sm",
                      isPositive && "text-green-600",
                      isNegative && "text-destructive"
                    )}>
                      {snapshot.roi.toFixed(1)}%
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}
