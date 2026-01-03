"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
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
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Análises</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhuma análise salva ainda. Preencha os dados e clique em
            &ldquo;Salvar Análise&rdquo; para criar um snapshot.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Análises ({snapshots.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Compra</TableHead>
              <TableHead className="text-right">Venda</TableHead>
              <TableHead className="text-right">Lucro</TableHead>
              <TableHead className="text-right">ROI</TableHead>
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
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedSnapshot(snapshot)}
                >
                  <TableCell className="text-muted-foreground">
                    {formatDate(snapshot.created_at)}
                  </TableCell>
                  <TableCell>
                    {statusConfig ? (
                      <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {inputs.purchase_price
                      ? formatCurrency(inputs.purchase_price)
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {inputs.sale_price
                      ? formatCurrency(inputs.sale_price)
                      : "-"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium",
                      isPositive && "text-primary",
                      isNegative && "text-destructive"
                    )}
                  >
                    {formatCurrency(outputs.net_profit)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium",
                      isPositive && "text-primary",
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

      <SnapshotDetailModal
        snapshot={selectedSnapshot}
        open={selectedSnapshot !== null}
        onOpenChange={(open) => !open && setSelectedSnapshot(null)}
        type="cash"
        onDelete={handleDelete}
      />
    </Card>
  );
}
