"use client";

import type { CashOutputs } from "@widia/shared";

interface CalculatorOutputsProps {
  readonly outputs: CashOutputs;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function CalculatorOutputs({ outputs }: CalculatorOutputsProps) {
  const isPositive = outputs.net_profit > 0;
  const isPartial = outputs.is_partial;

  return (
    <div className="space-y-6">
      {isPartial && (
        <div className="rounded-md border border-yellow-900/60 bg-yellow-950/30 px-3 py-2 text-sm text-yellow-200">
          Resultado parcial — preencha preço de compra e venda
        </div>
      )}

      {/* Main metrics */}
      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-lg bg-neutral-900 p-4">
          <div className="text-sm text-neutral-500 mb-1">
            Investimento Total
          </div>
          <div className="text-2xl font-semibold text-neutral-100">
            {formatCurrency(outputs.investment_total)}
          </div>
        </div>

        <div
          className={`rounded-lg p-4 ${
            isPositive
              ? "bg-green-950/50 border border-green-900/50"
              : "bg-red-950/50 border border-red-900/50"
          }`}
        >
          <div className="text-sm text-neutral-400 mb-1">Lucro Líquido</div>
          <div
            className={`text-2xl font-semibold ${
              isPositive ? "text-green-400" : "text-red-400"
            }`}
          >
            {formatCurrency(outputs.net_profit)}
          </div>
        </div>

        <div
          className={`rounded-lg p-4 ${
            isPositive
              ? "bg-green-950/50 border border-green-900/50"
              : "bg-red-950/50 border border-red-900/50"
          }`}
        >
          <div className="text-sm text-neutral-400 mb-1">ROI</div>
          <div
            className={`text-2xl font-semibold ${
              isPositive ? "text-green-400" : "text-red-400"
            }`}
          >
            {formatPercent(outputs.roi)}
          </div>
        </div>
      </div>

      {/* Secondary metrics (collapsed by default, shown on hover/expand) */}
      <details className="group">
        <summary className="cursor-pointer text-sm text-neutral-500 hover:text-neutral-300">
          Ver detalhes do cálculo
        </summary>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-neutral-800">
            <span className="text-neutral-500">ITBI</span>
            <span className="text-neutral-300">
              {formatCurrency(outputs.itbi_value)}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-neutral-800">
            <span className="text-neutral-500">Registro</span>
            <span className="text-neutral-300">
              {formatCurrency(outputs.registry_value)}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-neutral-800">
            <span className="text-neutral-500">Custo de Aquisição</span>
            <span className="text-neutral-300">
              {formatCurrency(outputs.acquisition_cost)}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-neutral-800">
            <span className="text-neutral-500">Corretagem</span>
            <span className="text-neutral-300">
              {formatCurrency(outputs.broker_fee)}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-neutral-800">
            <span className="text-neutral-500">Lucro Bruto</span>
            <span className="text-neutral-300">
              {formatCurrency(outputs.gross_profit)}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-neutral-800">
            <span className="text-neutral-500">Imposto PJ</span>
            <span className="text-neutral-300">
              {formatCurrency(outputs.pj_tax_value)}
            </span>
          </div>
        </div>
      </details>
    </div>
  );
}
