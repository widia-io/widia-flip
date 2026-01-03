"use client";

import { useState } from "react";
import type { CashSnapshot, FinancingSnapshot } from "@widia/shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Loader2 } from "lucide-react";
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

interface SnapshotDetailModalProps {
  snapshot: CashSnapshot | FinancingSnapshot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "cash" | "financing";
  onDelete?: () => Promise<void>;
}

export function SnapshotDetailModal({
  snapshot,
  open,
  onOpenChange,
  type,
  onDelete,
}: SnapshotDetailModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!snapshot) return null;

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return `${(value * 100).toFixed(2)}%`;
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

  const isCash = type === "cash";
  const title = isCash ? "Detalhes da Analise a Vista" : "Detalhes da Analise Financiada";
  const statusConfig = snapshot.status_pipeline
    ? STATUS_CONFIG[snapshot.status_pipeline]
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{title}</DialogTitle>
            {statusConfig && (
              <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
            )}
          </div>
          <DialogDescription>
            Salvo em {formatDate(snapshot.created_at)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Inputs */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Entradas</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {isCash ? (
                <>
                  <DetailItem label="Preco de Compra" value={formatCurrency((snapshot as CashSnapshot).inputs.purchase_price)} />
                  <DetailItem label="Custo de Reforma" value={formatCurrency((snapshot as CashSnapshot).inputs.renovation_cost)} />
                  <DetailItem label="Outros Custos" value={formatCurrency((snapshot as CashSnapshot).inputs.other_costs)} />
                  <DetailItem label="Preco de Venda" value={formatCurrency((snapshot as CashSnapshot).inputs.sale_price)} />
                </>
              ) : (
                <>
                  <DetailItem label="Preco de Compra" value={formatCurrency((snapshot as FinancingSnapshot).inputs.purchase_price)} />
                  <DetailItem label="Preco de Venda" value={formatCurrency((snapshot as FinancingSnapshot).inputs.sale_price)} />
                  <DetailItem label="Entrada" value={formatPercent((snapshot as FinancingSnapshot).inputs.down_payment_percent)} />
                  <DetailItem label="Prazo (meses)" value={(snapshot as FinancingSnapshot).inputs.term_months?.toString() ?? "-"} />
                  <DetailItem label="CET" value={formatPercent((snapshot as FinancingSnapshot).inputs.cet)} />
                  <DetailItem label="Juros Nominal" value={formatPercent((snapshot as FinancingSnapshot).inputs.interest_rate)} />
                  <DetailItem label="Seguro" value={formatCurrency((snapshot as FinancingSnapshot).inputs.insurance)} />
                  <DetailItem label="Avaliacao" value={formatCurrency((snapshot as FinancingSnapshot).inputs.appraisal_fee)} />
                  <DetailItem label="Outras Taxas" value={formatCurrency((snapshot as FinancingSnapshot).inputs.other_fees)} />
                  <DetailItem label="Saldo Devedor" value={formatCurrency((snapshot as FinancingSnapshot).inputs.remaining_debt)} />
                </>
              )}
            </div>
          </div>

          {/* Outputs */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Resultados</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {isCash ? (
                <>
                  <DetailItem label="ITBI" value={formatCurrency((snapshot as CashSnapshot).outputs.itbi_value)} />
                  <DetailItem label="Registro" value={formatCurrency((snapshot as CashSnapshot).outputs.registry_value)} />
                  <DetailItem label="Custo Aquisicao" value={formatCurrency((snapshot as CashSnapshot).outputs.acquisition_cost)} />
                  <DetailItem label="Investimento Total" value={formatCurrency((snapshot as CashSnapshot).outputs.investment_total)} highlight />
                  <DetailItem label="Corretagem" value={formatCurrency((snapshot as CashSnapshot).outputs.broker_fee)} />
                  <DetailItem
                    label="Lucro Bruto"
                    value={formatCurrency((snapshot as CashSnapshot).outputs.gross_profit)}
                    variant={(snapshot as CashSnapshot).outputs.gross_profit > 0 ? "positive" : (snapshot as CashSnapshot).outputs.gross_profit < 0 ? "negative" : "default"}
                  />
                  <DetailItem label="Imposto PJ" value={formatCurrency((snapshot as CashSnapshot).outputs.pj_tax_value)} />
                  <DetailItem
                    label="Lucro Liquido"
                    value={formatCurrency((snapshot as CashSnapshot).outputs.net_profit)}
                    highlight
                    variant={(snapshot as CashSnapshot).outputs.net_profit > 0 ? "positive" : (snapshot as CashSnapshot).outputs.net_profit < 0 ? "negative" : "default"}
                  />
                  <DetailItem
                    label="ROI"
                    value={`${(snapshot as CashSnapshot).outputs.roi.toFixed(2)}%`}
                    highlight
                    variant={(snapshot as CashSnapshot).outputs.roi > 0 ? "positive" : (snapshot as CashSnapshot).outputs.roi < 0 ? "negative" : "default"}
                  />
                </>
              ) : (
                <>
                  <DetailItem label="Valor Entrada" value={formatCurrency((snapshot as FinancingSnapshot).outputs.down_payment_value)} />
                  <DetailItem label="Valor Financiado" value={formatCurrency((snapshot as FinancingSnapshot).outputs.financed_value)} />
                  <DetailItem label="Total Parcelas" value={formatCurrency((snapshot as FinancingSnapshot).outputs.payments_total)} />
                  <DetailItem label="Taxas Bancarias" value={formatCurrency((snapshot as FinancingSnapshot).outputs.bank_fees_total)} />
                  <DetailItem label="ITBI" value={formatCurrency((snapshot as FinancingSnapshot).outputs.itbi_value)} />
                  <DetailItem label="Registro" value={formatCurrency((snapshot as FinancingSnapshot).outputs.registry_value)} />
                  <DetailItem label="Custos Aquisicao" value={formatCurrency((snapshot as FinancingSnapshot).outputs.acquisition_fees)} />
                  <DetailItem label="Total Pago" value={formatCurrency((snapshot as FinancingSnapshot).outputs.total_paid)} />
                  <DetailItem label="Investimento Total" value={formatCurrency((snapshot as FinancingSnapshot).outputs.investment_total)} highlight />
                  <DetailItem label="Corretagem" value={formatCurrency((snapshot as FinancingSnapshot).outputs.broker_fee)} />
                  <DetailItem
                    label="Lucro Bruto"
                    value={formatCurrency((snapshot as FinancingSnapshot).outputs.gross_profit)}
                    variant={(snapshot as FinancingSnapshot).outputs.gross_profit > 0 ? "positive" : (snapshot as FinancingSnapshot).outputs.gross_profit < 0 ? "negative" : "default"}
                  />
                  <DetailItem label="Imposto PJ" value={formatCurrency((snapshot as FinancingSnapshot).outputs.pj_tax_value)} />
                  <DetailItem
                    label="Lucro Liquido"
                    value={formatCurrency((snapshot as FinancingSnapshot).outputs.net_profit)}
                    highlight
                    variant={(snapshot as FinancingSnapshot).outputs.net_profit > 0 ? "positive" : (snapshot as FinancingSnapshot).outputs.net_profit < 0 ? "negative" : "default"}
                  />
                  <DetailItem
                    label="ROI"
                    value={`${(snapshot as FinancingSnapshot).outputs.roi.toFixed(2)}%`}
                    highlight
                    variant={(snapshot as FinancingSnapshot).outputs.roi > 0 ? "positive" : (snapshot as FinancingSnapshot).outputs.roi < 0 ? "negative" : "default"}
                  />
                </>
              )}
            </div>
          </div>

          {/* Applied Rates */}
          {snapshot.effective_rates && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Taxas Aplicadas</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <DetailItem label="ITBI" value={`${(snapshot.effective_rates.itbi_rate * 100).toFixed(1)}%`} />
                <DetailItem label="Registro" value={`${(snapshot.effective_rates.registry_rate * 100).toFixed(1)}%`} />
                <DetailItem label="Corretagem" value={`${(snapshot.effective_rates.broker_rate * 100).toFixed(1)}%`} />
                <DetailItem label="Imposto PJ" value={`${(snapshot.effective_rates.pj_tax_rate * 100).toFixed(1)}%`} />
              </div>
            </div>
          )}
        </div>

        {onDelete && (
          <DialogFooter className="mt-6">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Análise
            </Button>
          </DialogFooter>
        )}
      </DialogContent>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir análise?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A análise salva será permanentemente removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

function DetailItem({
  label,
  value,
  highlight,
  variant = "default",
}: {
  label: string;
  value: string;
  highlight?: boolean;
  variant?: "default" | "positive" | "negative";
}) {
  return (
    <div
      className={cn(
        "rounded-lg p-3",
        highlight
          ? "bg-secondary border border-border"
          : "bg-muted/50"
      )}
    >
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-1 text-sm font-semibold",
          variant === "positive" && "text-primary",
          variant === "negative" && "text-destructive"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
