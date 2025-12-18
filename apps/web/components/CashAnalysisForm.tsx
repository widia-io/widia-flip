"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";

import type { CashInputs, CashOutputs } from "@widia/shared";
import { updateCashAnalysisAction, createCashSnapshotAction } from "@/lib/actions/properties";
import { CashAnalysisOutputs } from "@/components/CashAnalysisOutputs";

interface CashAnalysisFormProps {
  propertyId: string;
  initialInputs?: CashInputs;
  initialOutputs?: CashOutputs;
}

export function CashAnalysisForm({
  propertyId,
  initialInputs,
  initialOutputs,
}: CashAnalysisFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [inputs, setInputs] = useState({
    purchase_price: initialInputs?.purchase_price ?? null,
    renovation_cost: initialInputs?.renovation_cost ?? null,
    other_costs: initialInputs?.other_costs ?? null,
    sale_price: initialInputs?.sale_price ?? null,
  });

  const [outputs, setOutputs] = useState<CashOutputs | null>(
    initialOutputs ?? null,
  );

  // Debounced save
  const [debouncedInputs, setDebouncedInputs] = useState(inputs);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInputs(inputs);
    }, 500);
    return () => clearTimeout(timer);
  }, [inputs]);

  useEffect(() => {
    // Only save if we have at least one value
    const hasValue = Object.values(debouncedInputs).some((v) => v !== null);
    if (!hasValue) return;

    // Build request with only non-null values
    const requestData: Record<string, number> = {};
    if (debouncedInputs.purchase_price !== null) {
      requestData.purchase_price = debouncedInputs.purchase_price;
    }
    if (debouncedInputs.renovation_cost !== null) {
      requestData.renovation_cost = debouncedInputs.renovation_cost;
    }
    if (debouncedInputs.other_costs !== null) {
      requestData.other_costs = debouncedInputs.other_costs;
    }
    if (debouncedInputs.sale_price !== null) {
      requestData.sale_price = debouncedInputs.sale_price;
    }

    startTransition(async () => {
      const result = await updateCashAnalysisAction(propertyId, requestData);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setError(null);
        setOutputs(result.data.outputs);
      }
    });
  }, [debouncedInputs, propertyId]);

  const handleInputChange = (field: keyof typeof inputs, value: string) => {
    const numValue = value === "" ? null : parseFloat(value);
    setInputs((prev) => ({
      ...prev,
      [field]: numValue,
    }));
  };

  const handleSaveSnapshot = async () => {
    setIsSavingSnapshot(true);
    setError(null);
    setSuccess(null);

    const result = await createCashSnapshotAction(propertyId);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Análise salva com sucesso!");
      router.refresh();
      setTimeout(() => setSuccess(null), 3000);
    }

    setIsSavingSnapshot(false);
  };

  const canSaveSnapshot = outputs && !outputs.is_partial;

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-neutral-100">
            Viabilidade à Vista
          </h3>
          {isPending && (
            <span className="text-xs text-neutral-500">Calculando...</span>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-900/60 bg-red-950/50 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg border border-green-900/60 bg-green-950/50 p-3 text-sm text-green-200">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">
              Preço de Compra (R$)
            </label>
            <input
              type="number"
              value={inputs.purchase_price ?? ""}
              onChange={(e) => handleInputChange("purchase_price", e.target.value)}
              placeholder="500000"
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-500 mb-1">
              Custo de Reforma (R$)
            </label>
            <input
              type="number"
              value={inputs.renovation_cost ?? ""}
              onChange={(e) => handleInputChange("renovation_cost", e.target.value)}
              placeholder="50000"
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-500 mb-1">
              Outros Custos (R$)
            </label>
            <input
              type="number"
              value={inputs.other_costs ?? ""}
              onChange={(e) => handleInputChange("other_costs", e.target.value)}
              placeholder="10000"
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-500 mb-1">
              Preço de Venda (R$)
            </label>
            <input
              type="number"
              value={inputs.sale_price ?? ""}
              onChange={(e) => handleInputChange("sale_price", e.target.value)}
              placeholder="700000"
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Outputs */}
      {outputs && <CashAnalysisOutputs outputs={outputs} />}

      {/* Save Snapshot Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSnapshot}
          disabled={isSavingSnapshot || !canSaveSnapshot}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSavingSnapshot ? "Salvando..." : "Salvar Análise"}
        </button>
      </div>
    </div>
  );
}
