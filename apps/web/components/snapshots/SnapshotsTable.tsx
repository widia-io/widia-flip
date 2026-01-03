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
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

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
}

export function SnapshotsTable({ snapshots, onSnapshotClick }: SnapshotsTableProps) {
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
      year: "2-digit",
    });
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Imóvel</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Data</TableHead>
          <TableHead className="text-right">Lucro</TableHead>
          <TableHead className="text-right">ROI</TableHead>
          <TableHead className="w-10"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {snapshots.map((snapshot) => {
          const isPositive = snapshot.net_profit > 0;
          const isNegative = snapshot.net_profit < 0;
          const statusConfig = snapshot.status_pipeline
            ? STATUS_CONFIG[snapshot.status_pipeline]
            : null;

          return (
            <TableRow
              key={`${snapshot.snapshot_type}-${snapshot.id}`}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSnapshotClick(snapshot)}
            >
              <TableCell>
                <Link
                  href={`/app/properties/${snapshot.property_id}/overview`}
                  className="font-medium text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {snapshot.property_name || "Sem endereço"}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant={snapshot.snapshot_type === "cash" ? "outline" : "secondary"}>
                  {snapshot.snapshot_type === "cash" ? "À Vista" : "Financiamento"}
                </Badge>
              </TableCell>
              <TableCell>
                {statusConfig ? (
                  <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(snapshot.created_at)}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right font-medium",
                  isPositive && "text-primary",
                  isNegative && "text-destructive"
                )}
              >
                {formatCurrency(snapshot.net_profit)}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right font-medium",
                  isPositive && "text-primary",
                  isNegative && "text-destructive"
                )}
              >
                {snapshot.roi.toFixed(1)}%
              </TableCell>
              <TableCell>
                {snapshot.annotation_count > 0 && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-xs">{snapshot.annotation_count}</span>
                  </div>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
