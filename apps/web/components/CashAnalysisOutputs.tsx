"use client";

import type { CashOutputs } from "@widia/shared";

interface CashAnalysisOutputsProps {
  outputs: CashOutputs;
}

export function CashAnalysisOutputs({ outputs }: CashAnalysisOutputsProps) {
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

  const isPositive = (value: number) => value > 0;
  const isNegative = (value: number) => value < 0;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-neutral-100">
          Resultados do Cálculo
        </h3>
        {outputs.is_partial && (
          <span className="rounded-full bg-yellow-900/50 px-2 py-1 text-xs text-yellow-300">
            Dados incompletos
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {/* Acquisition Costs */}
        <OutputItem label="ITBI" value={formatCurrency(outputs.itbi_value)} />
        <OutputItem
          label="Registro"
          value={formatCurrency(outputs.registry_value)}
        />
        <OutputItem
          label="Custo Aquisição"
          value={formatCurrency(outputs.acquisition_cost)}
        />

        {/* Investment */}
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
          valueColor={
            isPositive(outputs.gross_profit)
              ? "text-green-400"
              : isNegative(outputs.gross_profit)
                ? "text-red-400"
                : undefined
          }
        />

        {/* Final Results */}
        <OutputItem
          label="Imposto PJ"
          value={formatCurrency(outputs.pj_tax_value)}
        />
        <OutputItem
          label="Lucro Líquido"
          value={formatCurrency(outputs.net_profit)}
          highlight
          valueColor={
            isPositive(outputs.net_profit)
              ? "text-green-400"
              : isNegative(outputs.net_profit)
                ? "text-red-400"
                : undefined
          }
        />
        <OutputItem
          label="ROI"
          value={formatPercent(outputs.roi)}
          highlight
          valueColor={
            isPositive(outputs.roi)
              ? "text-green-400"
              : isNegative(outputs.roi)
                ? "text-red-400"
                : undefined
          }
        />
      </div>
    </div>
  );
}

function OutputItem({
  label,
  value,
  highlight,
  valueColor,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  valueColor?: string;
}) {
  return (
    <div
      className={`rounded-lg p-3 ${highlight ? "bg-neutral-800/50 border border-neutral-700" : "bg-neutral-900/50"}`}
    >
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd
        className={`mt-1 text-lg font-semibold ${valueColor || "text-neutral-100"}`}
      >
        {value}
      </dd>
    </div>
  );
}
