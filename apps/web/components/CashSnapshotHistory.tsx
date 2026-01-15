"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { History, Clock } from "lucide-react";
import type { CashSnapshot } from "@widia/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SnapshotDetailModal } from "@/components/SnapshotDetailModal";
import { deleteCashSnapshotAction } from "@/lib/actions/properties";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

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

interface CashSnapshotHistoryProps {
  snapshots: CashSnapshot[];
  propertyId: string;
}

export function CashSnapshotHistory({ snapshots, propertyId }: CashSnapshotHistoryProps) {
  const router = useRouter();
  const [selectedSnapshot, setSelectedSnapshot] = useState<CashSnapshot | null>(null);

  const handleDelete = async () => {
    if (!selectedSnapshot) return;
    const result = await deleteCashSnapshotAction(propertyId, selectedSnapshot.id);
    if (result.success) {
      setSelectedSnapshot(null);
      router.refresh();
    }
  };

  const formatCurrency = (value: number) => {
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

  if (snapshots.length === 0) {
    return (
      <Card className="border-dashed">
        <EmptyState
          icon={History}
          title="Nenhuma análise salva"
          description="Salve análises para acompanhar a evolução do investimento."
          tip="Preencha os dados acima e clique em 'Salvar Análise'."
        />
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-base font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <History className="h-4 w-4" />
              </div>
              Histórico de Análises
            </CardTitle>
            <Badge variant="secondary" className="font-mono text-xs">
              {snapshots.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Compra</TableHead>
                <TableHead className="text-right">Venda</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead className="text-right pr-6">ROI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshots.map((snapshot) => {
                const inputs = snapshot.inputs;
                const outputs = snapshot.outputs;
                const isPositive = outputs.net_profit > 0;
                const isNegative = outputs.net_profit < 0;
                const statusConfig = snapshot.status_pipeline
                  ? STATUS_CONFIG[snapshot.status_pipeline]
                  : null;

                return (
                  <TableRow
                    key={snapshot.id}
                    className="group cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedSnapshot(snapshot)}
                  >
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                          <Clock className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <span className="text-sm">{formatDate(snapshot.created_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {statusConfig ? (
                        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {inputs.purchase_price
                        ? formatCurrency(inputs.purchase_price)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {inputs.sale_price
                        ? formatCurrency(inputs.sale_price)
                        : "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-semibold tabular-nums",
                        isPositive && "text-green-600",
                        isNegative && "text-destructive"
                      )}
                    >
                      {formatCurrency(outputs.net_profit)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right pr-6 font-semibold tabular-nums",
                        isPositive && "text-green-600",
                        isNegative && "text-destructive"
                      )}
                    >
                      {outputs.roi.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SnapshotDetailModal
        snapshot={selectedSnapshot}
        open={selectedSnapshot !== null}
        onOpenChange={(open) => !open && setSelectedSnapshot(null)}
        type="cash"
        onDelete={handleDelete}
      />
    </>
  );
}
