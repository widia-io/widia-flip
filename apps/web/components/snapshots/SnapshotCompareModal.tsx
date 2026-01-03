"use client";

import { useEffect, useState, useTransition } from "react";
import { X, ArrowUp, ArrowDown, Minus } from "lucide-react";

import type { FullSnapshot, SnapshotType, UnifiedSnapshot } from "@widia/shared";
import { compareSnapshotsAction } from "@/lib/actions/snapshots";
import { formatCurrency } from "@/lib/format";

interface SnapshotCompareModalProps {
  snapshots: [UnifiedSnapshot, UnifiedSnapshot];
  onClose: () => void;
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
  // Financing specific
  down_payment: "Entrada",
  loan_amount: "Valor Financiado",
  interest_rate: "Taxa de Juros",
  loan_term: "Prazo",
  monthly_payment: "Parcela Mensal",
  total_interest: "Juros Totais",
  total_paid: "Total Pago",
};

const HIDDEN_FIELDS = ["is_partial"];

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "-";

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

function DiffIndicator({ value1, value2, invert = false }: { value1: unknown; value2: unknown; invert?: boolean }) {
  const num1 = typeof value1 === "number" ? value1 : parseFloat(String(value1));
  const num2 = typeof value2 === "number" ? value2 : parseFloat(String(value2));

  if (isNaN(num1) || isNaN(num2) || num1 === num2) {
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  }

  const isHigher = num2 > num1;
  const isPositive = invert ? !isHigher : isHigher;

  if (isPositive) {
    return <ArrowUp className="h-3 w-3 text-green-600" />;
  }
  return <ArrowDown className="h-3 w-3 text-red-600" />;
}

function CompareSection({
  title,
  data1,
  data2,
  invertFields = []
}: {
  title: string;
  data1: Record<string, unknown>;
  data2: Record<string, unknown>;
  invertFields?: string[];
}) {
  const allKeys = [...new Set([...Object.keys(data1 || {}), ...Object.keys(data2 || {})])]
    .filter((key) => !HIDDEN_FIELDS.includes(key));

  if (allKeys.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm text-muted-foreground border-b pb-1">{title}</h4>
      <div className="space-y-1">
        {allKeys.map((key) => {
          const label = FIELD_LABELS[key] || key.replace(/_/g, " ");
          const val1 = data1?.[key];
          const val2 = data2?.[key];

          return (
            <div key={key} className="grid grid-cols-[1fr,auto,1fr] gap-2 text-sm items-center">
              <div className="text-right font-mono">{formatValue(key, val1)}</div>
              <div className="flex flex-col items-center gap-0.5 min-w-[80px]">
                <span className="text-xs text-muted-foreground capitalize">{label}</span>
                <DiffIndicator value1={val1} value2={val2} invert={invertFields.includes(key)} />
              </div>
              <div className="text-left font-mono">{formatValue(key, val2)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SnapshotCompareModal({ snapshots, onClose }: SnapshotCompareModalProps) {
  const [isPending, startTransition] = useTransition();
  const [fullSnapshots, setFullSnapshots] = useState<[FullSnapshot, FullSnapshot] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [snapshots]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Comparar Análises</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {isPending && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          )}

          {error && (
            <div className="text-center py-12 text-red-600">
              {error}
            </div>
          )}

          {fullSnapshots && (
            <div className="space-y-6">
              {/* Headers */}
              <div className="grid grid-cols-[1fr,auto,1fr] gap-2">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="font-medium">{fullSnapshots[0].property_name || "Imóvel"}</div>
                  <div className="text-xs text-muted-foreground">
                    {fullSnapshots[0].snapshot_type === "cash" ? "À Vista" : "Financiamento"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(fullSnapshots[0].created_at)}
                  </div>
                </div>
                <div className="flex items-center justify-center min-w-[80px]">
                  <span className="text-xs text-muted-foreground">vs</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="font-medium">{fullSnapshots[1].property_name || "Imóvel"}</div>
                  <div className="text-xs text-muted-foreground">
                    {fullSnapshots[1].snapshot_type === "cash" ? "À Vista" : "Financiamento"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(fullSnapshots[1].created_at)}
                  </div>
                </div>
              </div>

              {/* Sections */}
              <CompareSection
                title="Entradas"
                data1={fullSnapshots[0].inputs as Record<string, unknown>}
                data2={fullSnapshots[1].inputs as Record<string, unknown>}
                invertFields={["purchase_price", "renovation_cost", "other_costs"]}
              />

              <CompareSection
                title="Resultados"
                data1={fullSnapshots[0].outputs as Record<string, unknown>}
                data2={fullSnapshots[1].outputs as Record<string, unknown>}
                invertFields={["itbi", "registration", "brokerage", "pj_tax", "acquisition_cost", "total_investment"]}
              />

              {(fullSnapshots[0].rates || fullSnapshots[1].rates) && (
                <CompareSection
                  title="Taxas"
                  data1={(fullSnapshots[0].rates || {}) as Record<string, unknown>}
                  data2={(fullSnapshots[1].rates || {}) as Record<string, unknown>}
                  invertFields={["itbi_rate", "registration_rate", "brokerage_rate", "pj_tax_rate"]}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
