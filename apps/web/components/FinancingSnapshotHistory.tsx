"use client";

import type { FinancingSnapshot } from "@widia/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface FinancingSnapshotHistoryProps {
  snapshots: FinancingSnapshot[];
}

export function FinancingSnapshotHistory({ snapshots }: FinancingSnapshotHistoryProps) {
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
          <CardTitle>Histórico de Análises Financiadas</CardTitle>
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
        <CardTitle>Histórico de Análises Financiadas ({snapshots.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Entrada</TableHead>
              <TableHead className="text-right">Parcelas</TableHead>
              <TableHead className="text-right">Lucro</TableHead>
              <TableHead className="text-right">ROI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snapshots.map((snapshot) => {
              const outputs = snapshot.outputs;
              const isPositive = outputs.net_profit > 0;
              const isNegative = outputs.net_profit < 0;

              return (
                <TableRow key={snapshot.id}>
                  <TableCell className="text-muted-foreground">
                    {formatDate(snapshot.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(outputs.down_payment_value)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(outputs.payments_total)}
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
    </Card>
  );
}
