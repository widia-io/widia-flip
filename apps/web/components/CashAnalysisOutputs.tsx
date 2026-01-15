"use client";

import {
  BarChart3,
  Wallet,
  TrendingUp,
  Percent,
  AlertCircle,
} from "lucide-react";
import type { CashOutputs, CashAnalysisResponse } from "@widia/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type EffectiveRates = CashAnalysisResponse["effective_rates"];

interface CashAnalysisOutputsProps {
  outputs: CashOutputs;
  rates?: EffectiveRates;
}

export function CashAnalysisOutputs({ outputs, rates }: CashAnalysisOutputsProps) {
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
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
              <BarChart3 className="h-4 w-4" />
            </div>
            Resultados do Cálculo
          </CardTitle>
          {outputs.is_partial && (
            <Badge variant="outline" className="border-amber-300 text-amber-600">
              <AlertCircle className="h-3 w-3 mr-1" />
              Dados incompletos
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main KPIs - 3 Column Grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {/* Investimento Total */}
          <div className="rounded-xl border bg-card p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Investimento Total
              </span>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {formatCurrency(outputs.investment_total)}
            </p>
          </div>

          {/* Lucro Líquido */}
          <div
            className={cn(
              "rounded-xl border p-4 hover:shadow-md transition-shadow",
              outputs.net_profit > 0
                ? "bg-green-500/5 border-green-500/20"
                : outputs.net_profit < 0
                ? "bg-destructive/5 border-destructive/20"
                : "bg-card"
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  outputs.net_profit > 0
                    ? "bg-green-500/10"
                    : outputs.net_profit < 0
                    ? "bg-destructive/10"
                    : "bg-muted"
                )}
              >
                <TrendingUp
                  className={cn(
                    "h-5 w-5",
                    outputs.net_profit > 0
                      ? "text-green-600"
                      : outputs.net_profit < 0
                      ? "text-destructive"
                      : "text-muted-foreground"
                  )}
                />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Lucro Líquido
              </span>
            </div>
            <p
              className={cn(
                "text-2xl font-bold tabular-nums",
                outputs.net_profit > 0
                  ? "text-green-600"
                  : outputs.net_profit < 0
                  ? "text-destructive"
                  : ""
              )}
            >
              {formatCurrency(outputs.net_profit)}
            </p>
          </div>

          {/* ROI */}
          <div
            className={cn(
              "rounded-xl border p-4 hover:shadow-md transition-shadow",
              outputs.roi > 0
                ? "bg-green-500/5 border-green-500/20"
                : outputs.roi < 0
                ? "bg-destructive/5 border-destructive/20"
                : "bg-card"
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  outputs.roi > 0
                    ? "bg-green-500/10"
                    : outputs.roi < 0
                    ? "bg-destructive/10"
                    : "bg-muted"
                )}
              >
                <Percent
                  className={cn(
                    "h-5 w-5",
                    outputs.roi > 0
                      ? "text-green-600"
                      : outputs.roi < 0
                      ? "text-destructive"
                      : "text-muted-foreground"
                  )}
                />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                ROI
              </span>
            </div>
            <p
              className={cn(
                "text-2xl font-bold tabular-nums",
                outputs.roi > 0
                  ? "text-green-600"
                  : outputs.roi < 0
                  ? "text-destructive"
                  : ""
              )}
            >
              {formatPercent(outputs.roi)}
            </p>
          </div>
        </div>

        {/* Detail Items Grid */}
        <div className="pt-2 border-t">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <DetailItem
              label={formatRateLabel("ITBI", rates?.itbi_rate)}
              value={formatCurrency(outputs.itbi_value)}
            />
            <DetailItem
              label={formatRateLabel("Registro", rates?.registry_rate)}
              value={formatCurrency(outputs.registry_value)}
            />
            <DetailItem
              label="Custo Aquisição"
              value={formatCurrency(outputs.acquisition_cost)}
            />
            <DetailItem
              label={formatRateLabel("Corretagem", rates?.broker_rate)}
              value={formatCurrency(outputs.broker_fee)}
            />
            <DetailItem
              label="Lucro Bruto"
              value={formatCurrency(outputs.gross_profit)}
              variant={
                outputs.gross_profit > 0
                  ? "positive"
                  : outputs.gross_profit < 0
                  ? "negative"
                  : "default"
              }
            />
            <DetailItem
              label={formatRateLabel("Imposto PJ", rates?.pj_tax_rate)}
              value={formatCurrency(outputs.pj_tax_value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailItem({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: "default" | "positive" | "negative";
}) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <dt className="text-xs text-muted-foreground truncate">{label}</dt>
      <dd
        className={cn(
          "mt-1 text-sm font-semibold tabular-nums",
          variant === "positive" && "text-green-600",
          variant === "negative" && "text-destructive"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
