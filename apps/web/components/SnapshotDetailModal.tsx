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
import { Card, CardContent } from "@/components/ui/card";
import {
  Calculator,
  Clock,
  Wallet,
  TrendingUp,
  TrendingDown,
  Percent,
  Receipt,
  Settings,
  Trash2,
  Loader2,
  Download,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SnapshotAnnotations } from "@/components/snapshots/SnapshotAnnotations";
import { exportSnapshotToPDF } from "@/lib/export";

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
    if (value === null || value === undefined) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "—";
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
  const title = isCash ? "Análise à Vista" : "Análise Financiada";
  const statusConfig = snapshot.status_pipeline
    ? STATUS_CONFIG[snapshot.status_pipeline]
    : null;

  // Extract key metrics
  const outputs = snapshot.outputs;
  const netProfit = outputs.net_profit;
  const roi = outputs.roi;
  const investmentTotal = outputs.investment_total;
  const isPositiveResult = netProfit > 0;
  const isNegativeResult = netProfit < 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header with gradient background */}
        <div className={cn(
          "px-6 py-5 border-b",
          isPositiveResult ? "bg-green-500/5" : isNegativeResult ? "bg-destructive/5" : "bg-muted/30"
        )}>
          <DialogHeader className="space-y-0">
            <div className="flex items-center gap-4">
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl",
                isPositiveResult ? "bg-green-500/10" : isNegativeResult ? "bg-destructive/10" : "bg-primary/10"
              )}>
                <Calculator className={cn(
                  "h-6 w-6",
                  isPositiveResult ? "text-green-600" : isNegativeResult ? "text-destructive" : "text-primary"
                )} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
                  {statusConfig && (
                    <Badge variant={statusConfig.variant} className="text-xs">
                      {statusConfig.label}
                    </Badge>
                  )}
                </div>
                <DialogDescription className="flex items-center gap-2 mt-1 text-sm">
                  <Clock className="h-4 w-4" />
                  Salvo em {formatDate(snapshot.created_at)}
                </DialogDescription>
              </div>
              {/* Result indicator */}
              <div className={cn(
                "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
                isPositiveResult ? "bg-green-500/10 text-green-600" :
                isNegativeResult ? "bg-destructive/10 text-destructive" :
                "bg-muted text-muted-foreground"
              )}>
                {isPositiveResult ? (
                  <><CheckCircle2 className="h-4 w-4" /> Viável</>
                ) : isNegativeResult ? (
                  <><AlertTriangle className="h-4 w-4" /> Não viável</>
                ) : (
                  <>Neutro</>
                )}
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Main KPIs - 3 Large Cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            {/* Investimento Total */}
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                      <Wallet className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Investimento Total
                    </p>
                  </div>
                  <p className="text-2xl font-bold tabular-nums">
                    {formatCurrency(investmentTotal)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Lucro Líquido */}
            <Card className={cn(
              "hover:shadow-md transition-shadow",
              isPositiveResult ? "border-green-500/30 bg-green-500/5" :
              isNegativeResult ? "border-destructive/30 bg-destructive/5" : ""
            )}>
              <CardContent className="pt-5 pb-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      isPositiveResult ? "bg-green-500/10" :
                      isNegativeResult ? "bg-destructive/10" : "bg-muted"
                    )}>
                      <TrendingUp className={cn(
                        "h-5 w-5",
                        isPositiveResult ? "text-green-600" :
                        isNegativeResult ? "text-destructive" : "text-muted-foreground"
                      )} />
                    </div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Lucro Líquido
                    </p>
                  </div>
                  <p className={cn(
                    "text-2xl font-bold tabular-nums",
                    isPositiveResult ? "text-green-600" :
                    isNegativeResult ? "text-destructive" : ""
                  )}>
                    {formatCurrency(netProfit)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* ROI */}
            <Card className={cn(
              "hover:shadow-md transition-shadow",
              roi > 0 ? "border-green-500/30 bg-green-500/5" :
              roi < 0 ? "border-destructive/30 bg-destructive/5" : ""
            )}>
              <CardContent className="pt-5 pb-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      roi > 0 ? "bg-green-500/10" :
                      roi < 0 ? "bg-destructive/10" : "bg-muted"
                    )}>
                      <Percent className={cn(
                        "h-5 w-5",
                        roi > 0 ? "text-green-600" :
                        roi < 0 ? "text-destructive" : "text-muted-foreground"
                      )} />
                    </div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      ROI
                    </p>
                  </div>
                  <p className={cn(
                    "text-2xl font-bold tabular-nums",
                    roi > 0 ? "text-green-600" :
                    roi < 0 ? "text-destructive" : ""
                  )}>
                    {roi.toFixed(2)}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Inputs Section */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <TrendingDown className="h-4 w-4 text-amber-600" />
                </div>
                <h3 className="text-sm font-semibold">Dados de Entrada</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {isCash ? (
                  <>
                    <DetailItem label="Preço de Compra" value={formatCurrency((snapshot as CashSnapshot).inputs.purchase_price)} />
                    <DetailItem label="Custo de Reforma" value={formatCurrency((snapshot as CashSnapshot).inputs.renovation_cost)} />
                    <DetailItem label="Outros Custos" value={formatCurrency((snapshot as CashSnapshot).inputs.other_costs)} />
                    <DetailItem label="Preço de Venda" value={formatCurrency((snapshot as CashSnapshot).inputs.sale_price)} highlight />
                  </>
                ) : (
                  <>
                    <DetailItem label="Preço de Compra" value={formatCurrency((snapshot as FinancingSnapshot).inputs.purchase_price)} />
                    <DetailItem label="Preço de Venda" value={formatCurrency((snapshot as FinancingSnapshot).inputs.sale_price)} highlight />
                    <DetailItem label="Entrada" value={formatPercent((snapshot as FinancingSnapshot).inputs.down_payment_percent)} />
                    <DetailItem label="Prazo (meses)" value={(snapshot as FinancingSnapshot).inputs.term_months?.toString() ?? "—"} />
                    <DetailItem label="CET" value={formatPercent((snapshot as FinancingSnapshot).inputs.cet)} />
                    <DetailItem label="Juros Nominal" value={formatPercent((snapshot as FinancingSnapshot).inputs.interest_rate)} />
                    <DetailItem label="Seguro" value={formatCurrency((snapshot as FinancingSnapshot).inputs.insurance)} />
                    <DetailItem label="Avaliação" value={formatCurrency((snapshot as FinancingSnapshot).inputs.appraisal_fee)} />
                    <DetailItem label="Outras Taxas" value={formatCurrency((snapshot as FinancingSnapshot).inputs.other_fees)} />
                    <DetailItem label="Saldo Devedor" value={formatCurrency((snapshot as FinancingSnapshot).inputs.remaining_debt)} />
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Outputs Section */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                  <Receipt className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold">Custos e Taxas</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {isCash ? (
                  <>
                    <DetailItem label="ITBI" value={formatCurrency((snapshot as CashSnapshot).outputs.itbi_value)} />
                    <DetailItem label="Registro" value={formatCurrency((snapshot as CashSnapshot).outputs.registry_value)} />
                    <DetailItem label="Custo Aquisição" value={formatCurrency((snapshot as CashSnapshot).outputs.acquisition_cost)} />
                    <DetailItem label="Corretagem" value={formatCurrency((snapshot as CashSnapshot).outputs.broker_fee)} />
                    <DetailItem
                      label="Lucro Bruto"
                      value={formatCurrency((snapshot as CashSnapshot).outputs.gross_profit)}
                      variant={(snapshot as CashSnapshot).outputs.gross_profit > 0 ? "positive" : (snapshot as CashSnapshot).outputs.gross_profit < 0 ? "negative" : "default"}
                    />
                    <DetailItem label="Imposto PJ" value={formatCurrency((snapshot as CashSnapshot).outputs.pj_tax_value)} />
                  </>
                ) : (
                  <>
                    <DetailItem label="Valor Entrada" value={formatCurrency((snapshot as FinancingSnapshot).outputs.down_payment_value)} />
                    <DetailItem label="Valor Financiado" value={formatCurrency((snapshot as FinancingSnapshot).outputs.financed_value)} />
                    <DetailItem label="Total Parcelas" value={formatCurrency((snapshot as FinancingSnapshot).outputs.payments_total)} />
                    <DetailItem label="Taxas Bancárias" value={formatCurrency((snapshot as FinancingSnapshot).outputs.bank_fees_total)} />
                    <DetailItem label="ITBI" value={formatCurrency((snapshot as FinancingSnapshot).outputs.itbi_value)} />
                    <DetailItem label="Registro" value={formatCurrency((snapshot as FinancingSnapshot).outputs.registry_value)} />
                    <DetailItem label="Custos Aquisição" value={formatCurrency((snapshot as FinancingSnapshot).outputs.acquisition_fees)} />
                    <DetailItem label="Total Pago" value={formatCurrency((snapshot as FinancingSnapshot).outputs.total_paid)} />
                    <DetailItem label="Corretagem" value={formatCurrency((snapshot as FinancingSnapshot).outputs.broker_fee)} />
                    <DetailItem
                      label="Lucro Bruto"
                      value={formatCurrency((snapshot as FinancingSnapshot).outputs.gross_profit)}
                      variant={(snapshot as FinancingSnapshot).outputs.gross_profit > 0 ? "positive" : (snapshot as FinancingSnapshot).outputs.gross_profit < 0 ? "negative" : "default"}
                    />
                    <DetailItem label="Imposto PJ" value={formatCurrency((snapshot as FinancingSnapshot).outputs.pj_tax_value)} />
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Applied Rates Section */}
          {snapshot.effective_rates && (
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                    <Settings className="h-4 w-4 text-purple-600" />
                  </div>
                  <h3 className="text-sm font-semibold">Taxas Aplicadas</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <DetailItem label="ITBI" value={`${(snapshot.effective_rates.itbi_rate * 100).toFixed(1)}%`} />
                  <DetailItem label="Registro" value={`${(snapshot.effective_rates.registry_rate * 100).toFixed(1)}%`} />
                  <DetailItem label="Corretagem" value={`${(snapshot.effective_rates.broker_rate * 100).toFixed(1)}%`} />
                  <DetailItem label="Imposto PJ" value={`${(snapshot.effective_rates.pj_tax_rate * 100).toFixed(1)}%`} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t bg-muted/30 flex-row justify-between sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <SnapshotAnnotations
              snapshotId={snapshot.id}
              snapshotType={type}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportSnapshotToPDF(snapshot, type)}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar PDF</span>
            </Button>
          </div>
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Excluir Análise</span>
            </Button>
          )}
        </DialogFooter>
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
  variant = "default",
  highlight = false,
}: {
  label: string;
  value: string;
  variant?: "default" | "positive" | "negative";
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-lg p-3",
      highlight ? "bg-primary/5 border border-primary/20" : "bg-muted/50"
    )}>
      <dt className="text-xs text-muted-foreground truncate">{label}</dt>
      <dd
        className={cn(
          "mt-1 text-sm font-semibold tabular-nums",
          variant === "positive" && "text-green-600",
          variant === "negative" && "text-destructive",
          highlight && "text-primary"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
