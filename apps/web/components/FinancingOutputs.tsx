"use client";

import type { FinancingOutputs, FinancingAnalysisResponse } from "@widia/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type EffectiveRates = FinancingAnalysisResponse["effective_rates"];

interface FinancingOutputsProps {
  outputs: FinancingOutputs;
  rates?: EffectiveRates;
}

export function FinancingOutputsDisplay({ outputs, rates }: FinancingOutputsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const formatRateLabel = (label: string, rate?: number) => {
    if (rate === undefined) return label;
    return `${label} (${(rate * 100).toFixed(1)}%)`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Resultados do Cálculo</CardTitle>
        {outputs.is_partial && (
          <Badge variant="outline">Dados incompletos</Badge>
        )}
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <OutputItem
            label="Valor Entrada"
            value={formatCurrency(outputs.down_payment_value)}
          />
          <OutputItem
            label="Valor Financiado"
            value={formatCurrency(outputs.financed_value)}
          />
          <OutputItem
            label="Total Parcelas"
            value={formatCurrency(outputs.payments_total)}
          />
          <OutputItem
            label="Taxas Bancárias"
            value={formatCurrency(outputs.bank_fees_total)}
          />
          <OutputItem label={formatRateLabel("ITBI", rates?.itbi_rate)} value={formatCurrency(outputs.itbi_value)} />
          <OutputItem
            label={formatRateLabel("Registro", rates?.registry_rate)}
            value={formatCurrency(outputs.registry_value)}
          />
          <OutputItem
            label="Custos Aquisição"
            value={formatCurrency(outputs.acquisition_fees)}
          />
          <OutputItem
            label="Total Pago"
            value={formatCurrency(outputs.total_paid)}
          />
          <OutputItem
            label="Investimento Total"
            value={formatCurrency(outputs.investment_total)}
            highlight
          />
          <OutputItem
            label={formatRateLabel("Corretagem", rates?.broker_rate)}
            value={formatCurrency(outputs.broker_fee)}
          />
          <OutputItem
            label="Lucro Bruto"
            value={formatCurrency(outputs.gross_profit)}
            variant={outputs.gross_profit > 0 ? "positive" : outputs.gross_profit < 0 ? "negative" : "default"}
          />
          <OutputItem
            label={formatRateLabel("Imposto PJ", rates?.pj_tax_rate)}
            value={formatCurrency(outputs.pj_tax_value)}
          />
          <OutputItem
            label="Lucro Líquido"
            value={formatCurrency(outputs.net_profit)}
            highlight
            variant={outputs.net_profit > 0 ? "positive" : outputs.net_profit < 0 ? "negative" : "default"}
          />
          <OutputItem
            label="ROI"
            value={formatPercent(outputs.roi)}
            highlight
            variant={outputs.roi > 0 ? "positive" : outputs.roi < 0 ? "negative" : "default"}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function OutputItem({
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
          "mt-1 text-lg font-semibold",
          variant === "positive" && "text-primary",
          variant === "negative" && "text-destructive"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
