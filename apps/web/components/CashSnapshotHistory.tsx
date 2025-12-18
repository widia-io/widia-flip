"use client";

import type { CashSnapshot } from "@widia/shared";

interface CashSnapshotHistoryProps {
  snapshots: CashSnapshot[];
}

export function CashSnapshotHistory({ snapshots }: CashSnapshotHistoryProps) {
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
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6">
        <h3 className="text-sm font-medium text-neutral-100 mb-2">
          Histórico de Análises
        </h3>
        <p className="text-sm text-neutral-400">
          Nenhuma análise salva ainda. Preencha os dados e clique em
          &ldquo;Salvar Análise&rdquo; para criar um snapshot.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950">
      <div className="border-b border-neutral-800 px-4 py-3">
        <h3 className="text-sm font-medium text-neutral-100">
          Histórico de Análises ({snapshots.length})
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-800 text-left text-xs text-neutral-500">
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium text-right">Compra</th>
              <th className="px-4 py-3 font-medium text-right">Venda</th>
              <th className="px-4 py-3 font-medium text-right">Lucro</th>
              <th className="px-4 py-3 font-medium text-right">ROI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {snapshots.map((snapshot) => {
              const inputs = snapshot.inputs;
              const outputs = snapshot.outputs;
              const isPositive = outputs.net_profit > 0;
              const isNegative = outputs.net_profit < 0;

              return (
                <tr key={snapshot.id} className="hover:bg-neutral-900/50">
                  <td className="px-4 py-3 text-sm text-neutral-300">
                    {formatDate(snapshot.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-300 text-right">
                    {inputs.purchase_price
                      ? formatCurrency(inputs.purchase_price)
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-300 text-right">
                    {inputs.sale_price
                      ? formatCurrency(inputs.sale_price)
                      : "-"}
                  </td>
                  <td
                    className={`px-4 py-3 text-sm text-right font-medium ${
                      isPositive
                        ? "text-green-400"
                        : isNegative
                          ? "text-red-400"
                          : "text-neutral-300"
                    }`}
                  >
                    {formatCurrency(outputs.net_profit)}
                  </td>
                  <td
                    className={`px-4 py-3 text-sm text-right font-medium ${
                      isPositive
                        ? "text-green-400"
                        : isNegative
                          ? "text-red-400"
                          : "text-neutral-300"
                    }`}
                  >
                    {outputs.roi.toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
