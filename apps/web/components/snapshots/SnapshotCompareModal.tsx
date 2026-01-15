"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Scale,
  ArrowUp,
  ArrowDown,
  Minus,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Percent,
  Wallet,
  Receipt,
  Settings,
  Building2,
  Calendar,
  Loader2,
  AlertCircle,
  Trophy,
  Crown,
} from "lucide-react";

import type { FullSnapshot, SnapshotType, UnifiedSnapshot } from "@widia/shared";
import { compareSnapshotsAction } from "@/lib/actions/snapshots";
import { formatCurrency } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SnapshotCompareModalProps {
  snapshots: [UnifiedSnapshot, UnifiedSnapshot];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FIELD_LABELS: Record<string, string> = {
  purchase_price: "Preço de Compra",
  renovation_cost: "Custo de Reforma",
  other_costs: "Outros Custos",
  sale_price: "Preço de Venda",
  itbi: "ITBI",
  itbi_value: "ITBI",
  registration: "Registro",
  registry_value: "Registro",
  acquisition_cost: "Custo de Aquisição",
  total_investment: "Investimento Total",
  investment_total: "Investimento Total",
  brokerage: "Corretagem",
  broker_fee: "Corretagem",
  gross_profit: "Lucro Bruto",
  pj_tax: "Imposto PJ",
  pj_tax_value: "Imposto PJ",
  net_profit: "Lucro Líquido",
  roi: "ROI",
  itbi_rate: "Taxa ITBI",
  registration_rate: "Taxa Registro",
  registry_rate: "Taxa Registro",
  brokerage_rate: "Taxa Corretagem",
  broker_rate: "Taxa Corretagem",
  pj_tax_rate: "Taxa Imposto PJ",
  down_payment: "Entrada",
  loan_amount: "Valor Financiado",
  interest_rate: "Taxa de Juros",
  loan_term: "Prazo",
  monthly_payment: "Parcela Mensal",
  total_interest: "Juros Totais",
  total_paid: "Total Pago",
};

const HIDDEN_FIELDS = ["is_partial"];

const FIELD_DESCRIPTIONS: Record<string, string> = {
  purchase_price: "Valor de aquisição do imóvel no ato da compra",
  renovation_cost: "Custo estimado ou realizado de reforma/melhorias no imóvel",
  other_costs: "Despesas adicionais como mudança, limpeza, pequenos reparos",
  sale_price: "Valor esperado ou realizado na venda do imóvel",
  itbi: "Imposto de Transmissão de Bens Imóveis - pago na compra",
  itbi_value: "Imposto de Transmissão de Bens Imóveis - pago na compra",
  registration: "Custos de registro do imóvel em cartório",
  registry_value: "Custos de registro do imóvel em cartório",
  acquisition_cost: "Soma de: preço de compra + ITBI + registro",
  total_investment: "Todo capital investido: aquisição + reforma + outros custos",
  investment_total: "Todo capital investido: aquisição + reforma + outros custos",
  brokerage: "Comissão paga ao corretor na venda (geralmente 6%)",
  broker_fee: "Comissão paga ao corretor na venda (geralmente 6%)",
  gross_profit: "Lucro antes dos impostos: preço de venda - investimento total - corretagem",
  pj_tax: "Imposto sobre lucro para pessoa jurídica (lucro presumido)",
  pj_tax_value: "Imposto sobre lucro para pessoa jurídica (lucro presumido)",
  net_profit: "Lucro final após todos os custos e impostos",
  roi: "Retorno sobre Investimento: lucro líquido / investimento total × 100",
  itbi_rate: "Percentual do ITBI sobre o preço de compra (varia por cidade)",
  registration_rate: "Percentual do registro sobre o preço de compra",
  registry_rate: "Percentual do registro sobre o preço de compra",
  brokerage_rate: "Percentual da corretagem sobre o preço de venda",
  broker_rate: "Percentual da corretagem sobre o preço de venda",
  pj_tax_rate: "Percentual do imposto PJ sobre o lucro bruto",
  down_payment: "Valor pago como entrada no financiamento",
  loan_amount: "Valor financiado pelo banco",
  interest_rate: "Taxa de juros anual do financiamento",
  loan_term: "Prazo total do financiamento em meses",
  monthly_payment: "Valor da parcela mensal do financiamento",
  total_interest: "Total de juros pagos ao longo do financiamento",
  total_paid: "Soma de todas as parcelas pagas",
};

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";

  const numVal = typeof value === "number" ? value : parseFloat(String(value));

  if (isNaN(numVal)) return String(value);

  if (key.includes("rate") || key === "roi") {
    return `${numVal.toFixed(2)}%`;
  }

  if (key.includes("price") || key.includes("cost") || key.includes("profit") ||
      key.includes("payment") || key.includes("investment") || key.includes("tax") ||
      key === "itbi" || key === "registration" || key === "brokerage" ||
      key.includes("loan") || key.includes("interest") || key.includes("paid") ||
      key === "down_payment" || key === "acquisition_cost" || key === "gross_profit" ||
      key === "net_profit" || key === "total_investment") {
    return formatCurrency(numVal);
  }

  if (key === "loan_term") {
    return `${numVal} meses`;
  }

  return String(numVal);
}

function DiffIndicator({
  value1,
  value2,
  invert = false
}: {
  value1: unknown;
  value2: unknown;
  invert?: boolean;
}) {
  const num1 = typeof value1 === "number" ? value1 : parseFloat(String(value1));
  const num2 = typeof value2 === "number" ? value2 : parseFloat(String(value2));

  if (isNaN(num1) || isNaN(num2) || num1 === num2) {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
        <Minus className="h-3 w-3 text-muted-foreground" />
      </div>
    );
  }

  const isHigher = num2 > num1;
  const isPositive = invert ? !isHigher : isHigher;

  if (isPositive) {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/10">
        <ArrowUp className="h-3.5 w-3.5 text-green-600" />
      </div>
    );
  }
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/10">
      <ArrowDown className="h-3.5 w-3.5 text-destructive" />
    </div>
  );
}

function WinnerIndicator({ side }: { side: "left" | "right" | "tie" }) {
  if (side === "tie") return null;

  return (
    <div className={cn(
      "absolute -top-2 z-10",
      side === "left" ? "-left-2" : "-right-2"
    )}>
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 shadow-lg shadow-amber-500/30">
        <Crown className="h-4 w-4 text-white" />
      </div>
    </div>
  );
}

function CompareSection({
  title,
  icon: Icon,
  iconColor,
  data1,
  data2,
  invertFields = []
}: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  data1: Record<string, unknown>;
  data2: Record<string, unknown>;
  invertFields?: string[];
}) {
  const allKeys = [...new Set([...Object.keys(data1 || {}), ...Object.keys(data2 || {})])]
    .filter((key) => !HIDDEN_FIELDS.includes(key));

  if (allKeys.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Section Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", iconColor)}>
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>

        {/* Comparison Grid */}
        <div className="divide-y">
          {allKeys.map((key) => {
            const label = FIELD_LABELS[key] || key.replace(/_/g, " ");
            const description = FIELD_DESCRIPTIONS[key];
            const val1 = data1?.[key];
            const val2 = data2?.[key];

            const num1 = typeof val1 === "number" ? val1 : parseFloat(String(val1));
            const num2 = typeof val2 === "number" ? val2 : parseFloat(String(val2));
            const hasWinner = !isNaN(num1) && !isNaN(num2) && num1 !== num2;
            const invert = invertFields.includes(key);
            const leftWins = hasWinner && (invert ? num1 < num2 : num1 > num2);
            const rightWins = hasWinner && (invert ? num2 < num1 : num2 > num1);

            return (
              <div
                key={key}
                className="grid grid-cols-[1fr,auto,1fr] items-center hover:bg-muted/30 transition-colors"
              >
                {/* Left Value */}
                <div className={cn(
                  "px-4 py-3 text-right transition-colors",
                  leftWins && "bg-green-500/5"
                )}>
                  <span className={cn(
                    "text-sm font-semibold tabular-nums",
                    leftWins && "text-green-600"
                  )}>
                    {formatValue(key, val1)}
                  </span>
                </div>

                {/* Center Label */}
                <div className="flex flex-col items-center gap-1.5 px-4 py-3 min-w-[140px] border-x bg-muted/20">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground capitalize">
                      {label}
                    </span>
                    {description && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[250px] text-center">
                          {description}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <DiffIndicator value1={val1} value2={val2} invert={invert} />
                </div>

                {/* Right Value */}
                <div className={cn(
                  "px-4 py-3 text-left transition-colors",
                  rightWins && "bg-green-500/5"
                )}>
                  <span className={cn(
                    "text-sm font-semibold tabular-nums",
                    rightWins && "text-green-600"
                  )}>
                    {formatValue(key, val2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function SnapshotCompareModal({ snapshots, open, onOpenChange }: SnapshotCompareModalProps) {
  const [isPending, startTransition] = useTransition();
  const [fullSnapshots, setFullSnapshots] = useState<[FullSnapshot, FullSnapshot] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    startTransition(async () => {
      const result = await compareSnapshotsAction(
        [snapshots[0].id, snapshots[1].id],
        [snapshots[0].snapshot_type as SnapshotType, snapshots[1].snapshot_type as SnapshotType],
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.data?.snapshots.length === 2) {
        setFullSnapshots([result.data.snapshots[0], result.data.snapshots[1]]);
      }
    });
  }, [snapshots, open]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Determine winner based on ROI
  const getWinner = (): "left" | "right" | "tie" => {
    if (!fullSnapshots) return "tie";
    const roi1 = (fullSnapshots[0].outputs as Record<string, number>).roi ?? 0;
    const roi2 = (fullSnapshots[1].outputs as Record<string, number>).roi ?? 0;
    if (roi1 > roi2) return "left";
    if (roi2 > roi1) return "right";
    return "tie";
  };

  const winner = getWinner();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        <TooltipProvider delayDuration={300}>
          <div className="flex flex-col h-full max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-5 border-b bg-gradient-to-r from-primary/5 via-transparent to-primary/5 shrink-0">
            <DialogHeader className="space-y-0">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Scale className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <DialogTitle className="text-xl font-bold">
                    Comparar Análises
                  </DialogTitle>
                  <DialogDescription className="text-sm mt-1">
                    Comparação lado a lado das métricas de viabilidade
                  </DialogDescription>
                </div>
                {winner !== "tie" && (
                  <Badge className="gap-1.5 bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20">
                    <Trophy className="h-3.5 w-3.5" />
                    Melhor ROI: {winner === "left" ? "Esquerda" : "Direita"}
                  </Badge>
                )}
              </div>
            </DialogHeader>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-6 space-y-6">
            {/* Loading State */}
            {isPending && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
                <div className="text-center">
                  <p className="font-medium">Carregando análises...</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Buscando dados para comparação
                  </p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-destructive">Erro ao carregar</p>
                  <p className="text-sm text-muted-foreground mt-1">{error}</p>
                </div>
              </div>
            )}

            {fullSnapshots && (
              <>
                {/* Property Headers */}
                <div className="grid grid-cols-[1fr,auto,1fr] gap-4">
                  {/* Left Property */}
                  <Card className={cn(
                    "relative hover:shadow-md transition-shadow",
                    winner === "left" && "border-amber-500/50 bg-amber-500/5"
                  )}>
                    <WinnerIndicator side={winner === "left" ? "left" : "tie"} />
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 shrink-0">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">
                            {fullSnapshots[0].property_name || "Imóvel"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {fullSnapshots[0].snapshot_type === "cash" ? "À Vista" : "Financiamento"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(fullSnapshots[0].created_at)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* VS Divider */}
                  <div className="flex items-center justify-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted border-2 border-background shadow">
                      <span className="text-xs font-bold text-muted-foreground">VS</span>
                    </div>
                  </div>

                  {/* Right Property */}
                  <Card className={cn(
                    "relative hover:shadow-md transition-shadow",
                    winner === "right" && "border-amber-500/50 bg-amber-500/5"
                  )}>
                    <WinnerIndicator side={winner === "right" ? "right" : "tie"} />
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 shrink-0">
                          <Building2 className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">
                            {fullSnapshots[1].property_name || "Imóvel"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {fullSnapshots[1].snapshot_type === "cash" ? "À Vista" : "Financiamento"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(fullSnapshots[1].created_at)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Key Metrics Comparison */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Net Profit Comparison */}
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        </div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Lucro Líquido
                        </p>
                      </div>
                      <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2">
                        <div className="text-center">
                          <p className={cn(
                            "text-xl font-bold tabular-nums",
                            (fullSnapshots[0].outputs as Record<string, number>).net_profit > 0
                              ? "text-green-600"
                              : (fullSnapshots[0].outputs as Record<string, number>).net_profit < 0
                                ? "text-destructive"
                                : ""
                          )}>
                            {formatCurrency((fullSnapshots[0].outputs as Record<string, number>).net_profit)}
                          </p>
                        </div>
                        <DiffIndicator
                          value1={(fullSnapshots[0].outputs as Record<string, number>).net_profit}
                          value2={(fullSnapshots[1].outputs as Record<string, number>).net_profit}
                        />
                        <div className="text-center">
                          <p className={cn(
                            "text-xl font-bold tabular-nums",
                            (fullSnapshots[1].outputs as Record<string, number>).net_profit > 0
                              ? "text-green-600"
                              : (fullSnapshots[1].outputs as Record<string, number>).net_profit < 0
                                ? "text-destructive"
                                : ""
                          )}>
                            {formatCurrency((fullSnapshots[1].outputs as Record<string, number>).net_profit)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ROI Comparison */}
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                          <Percent className="h-5 w-5 text-blue-600" />
                        </div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          ROI
                        </p>
                      </div>
                      <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2">
                        <div className="text-center">
                          <p className={cn(
                            "text-xl font-bold tabular-nums",
                            (fullSnapshots[0].outputs as Record<string, number>).roi > 0
                              ? "text-green-600"
                              : (fullSnapshots[0].outputs as Record<string, number>).roi < 0
                                ? "text-destructive"
                                : ""
                          )}>
                            {((fullSnapshots[0].outputs as Record<string, number>).roi ?? 0).toFixed(2)}%
                          </p>
                        </div>
                        <DiffIndicator
                          value1={(fullSnapshots[0].outputs as Record<string, number>).roi}
                          value2={(fullSnapshots[1].outputs as Record<string, number>).roi}
                        />
                        <div className="text-center">
                          <p className={cn(
                            "text-xl font-bold tabular-nums",
                            (fullSnapshots[1].outputs as Record<string, number>).roi > 0
                              ? "text-green-600"
                              : (fullSnapshots[1].outputs as Record<string, number>).roi < 0
                                ? "text-destructive"
                                : ""
                          )}>
                            {((fullSnapshots[1].outputs as Record<string, number>).roi ?? 0).toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Sections */}
                <CompareSection
                  title="Dados de Entrada"
                  icon={TrendingDown}
                  iconColor="bg-amber-500/10 text-amber-600"
                  data1={fullSnapshots[0].inputs as Record<string, unknown>}
                  data2={fullSnapshots[1].inputs as Record<string, unknown>}
                  invertFields={["purchase_price", "renovation_cost", "other_costs"]}
                />

                <CompareSection
                  title="Custos e Resultados"
                  icon={Receipt}
                  iconColor="bg-blue-500/10 text-blue-600"
                  data1={fullSnapshots[0].outputs as Record<string, unknown>}
                  data2={fullSnapshots[1].outputs as Record<string, unknown>}
                  invertFields={["itbi", "itbi_value", "registration", "registry_value", "brokerage", "broker_fee", "pj_tax", "pj_tax_value", "acquisition_cost", "total_investment", "investment_total"]}
                />

                {(fullSnapshots[0].rates || fullSnapshots[1].rates) && (
                  <CompareSection
                    title="Taxas Aplicadas"
                    icon={Settings}
                    iconColor="bg-purple-500/10 text-purple-600"
                    data1={(fullSnapshots[0].rates || {}) as Record<string, unknown>}
                    data2={(fullSnapshots[1].rates || {}) as Record<string, unknown>}
                    invertFields={["itbi_rate", "registration_rate", "registry_rate", "brokerage_rate", "broker_rate", "pj_tax_rate"]}
                  />
                )}
              </>
            )}
          </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-muted/30 shrink-0">
              <p className="text-xs text-muted-foreground text-center">
                <span className="inline-flex items-center gap-1.5">
                  <ArrowUp className="h-3 w-3 text-green-600" />
                  <span>Melhor</span>
                </span>
                <span className="mx-3">•</span>
                <span className="inline-flex items-center gap-1.5">
                  <ArrowDown className="h-3 w-3 text-destructive" />
                  <span>Pior</span>
                </span>
                <span className="mx-3">•</span>
                <span className="inline-flex items-center gap-1.5">
                  <Minus className="h-3 w-3 text-muted-foreground" />
                  <span>Igual</span>
                </span>
              </p>
            </div>
          </div>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
