"use client";

import type { CashOutputs, PublicCashBasicOutputs } from "@widia/shared";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type CalculatorOutputsProps =
  | {
      mode: "basic";
      outputs: PublicCashBasicOutputs;
    }
  | {
      mode?: "full";
      outputs: CashOutputs;
    };

export function CalculatorOutputs(props: CalculatorOutputsProps) {
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

  if (props.mode === "basic") {
    return (
      <div className="space-y-4">
        {props.outputs.is_partial && (
          <Badge variant="outline" className="mb-2">
            Dados incompletos
          </Badge>
        )}

        <div className="grid grid-cols-1 gap-3">
          <OutputItem
            label="ROI"
            value={formatPercent(props.outputs.roi)}
            highlight
            variant={props.outputs.roi > 0 ? "positive" : props.outputs.roi < 0 ? "negative" : "default"}
          />
        </div>
      </div>
    );
  }

  const outputs = props.outputs;

  return (
    <div className="space-y-4">
      {outputs.is_partial && (
        <Badge variant="outline" className="mb-2">
          Dados incompletos
        </Badge>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <OutputItem label="ITBI" value={formatCurrency(outputs.itbi_value)} />
        <OutputItem
          label="Registro"
          value={formatCurrency(outputs.registry_value)}
        />
        <OutputItem
          label="Custo Aquisição"
          value={formatCurrency(outputs.acquisition_cost)}
        />
        <OutputItem
          label="Investimento Total"
          value={formatCurrency(outputs.investment_total)}
          highlight
        />
        <OutputItem
          label="Corretagem"
          value={formatCurrency(outputs.broker_fee)}
        />
        <OutputItem
          label="Lucro Bruto"
          value={formatCurrency(outputs.gross_profit)}
          variant={outputs.gross_profit > 0 ? "positive" : outputs.gross_profit < 0 ? "negative" : "default"}
        />
        <OutputItem
          label="Imposto PJ"
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
    </div>
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
