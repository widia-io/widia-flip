"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";

import type { FinancingInputs, FinancingOutputs, FinancingPayment } from "@widia/shared";
import {
  updateFinancingAction,
  createFinancingSnapshotAction,
} from "@/lib/actions/financing";
import { FinancingOutputsDisplay } from "@/components/FinancingOutputs";
import { FinancingPaymentsList } from "@/components/FinancingPaymentsList";

interface FinancingFormProps {
  propertyId: string;
  planId?: string;
  initialInputs?: FinancingInputs;
  initialPayments?: FinancingPayment[];
  initialOutputs?: FinancingOutputs;
}

export function FinancingForm({
  propertyId,
  planId: initialPlanId,
  initialInputs,
  initialPayments,
  initialOutputs,
}: FinancingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | undefined>(initialPlanId);

  const [inputs, setInputs] = useState({
    purchase_price: initialInputs?.purchase_price ?? null,
    sale_price: initialInputs?.sale_price ?? null,
    down_payment_percent: initialInputs?.down_payment_percent ?? null,
    term_months: initialInputs?.term_months ?? null,
    cet: initialInputs?.cet ?? null,
    interest_rate: initialInputs?.interest_rate ?? null,
    insurance: initialInputs?.insurance ?? null,
    appraisal_fee: initialInputs?.appraisal_fee ?? null,
    other_fees: initialInputs?.other_fees ?? null,
    remaining_debt: initialInputs?.remaining_debt ?? null,
  });

  const [outputs, setOutputs] = useState<FinancingOutputs | null>(
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
    if (debouncedInputs.sale_price !== null) {
      requestData.sale_price = debouncedInputs.sale_price;
    }
    if (debouncedInputs.down_payment_percent !== null) {
      requestData.down_payment_percent = debouncedInputs.down_payment_percent;
    }
    if (debouncedInputs.term_months !== null) {
      requestData.term_months = debouncedInputs.term_months;
    }
    if (debouncedInputs.cet !== null) {
      requestData.cet = debouncedInputs.cet;
    }
    if (debouncedInputs.interest_rate !== null) {
      requestData.interest_rate = debouncedInputs.interest_rate;
    }
    if (debouncedInputs.insurance !== null) {
      requestData.insurance = debouncedInputs.insurance;
    }
    if (debouncedInputs.appraisal_fee !== null) {
      requestData.appraisal_fee = debouncedInputs.appraisal_fee;
    }
    if (debouncedInputs.other_fees !== null) {
      requestData.other_fees = debouncedInputs.other_fees;
    }
    if (debouncedInputs.remaining_debt !== null) {
      requestData.remaining_debt = debouncedInputs.remaining_debt;
    }

    startTransition(async () => {
      const result = await updateFinancingAction(propertyId, requestData);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setError(null);
        setOutputs(result.data.outputs);
        if (result.data.plan_id) {
          setPlanId(result.data.plan_id);
        }
      }
    });
  }, [debouncedInputs, propertyId]);

  const handleInputChange = (field: keyof typeof inputs, value: string) => {
    let numValue: number | null = null;
    if (value !== "") {
      numValue = parseFloat(value);
      if (isNaN(numValue)) numValue = null;
    }
    setInputs((prev) => ({
      ...prev,
      [field]: numValue,
    }));
  };

  const handlePercentChange = (field: keyof typeof inputs, value: string) => {
    let numValue: number | null = null;
    if (value !== "") {
      // User enters as percentage (e.g., 20), we store as decimal (0.20)
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        numValue = parsed / 100;
      }
    }
    setInputs((prev) => ({
      ...prev,
      [field]: numValue,
    }));
  };

  const handleSaveSnapshot = async () => {
    setIsSavingSnapshot(true);
    setError(null);
    setSuccess(null);

    const result = await createFinancingSnapshotAction(propertyId);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Análise salva com sucesso!");
      router.refresh();
      setTimeout(() => setSuccess(null), 3000);
    }

    setIsSavingSnapshot(false);
  };

  const handlePaymentChange = () => {
    router.refresh();
  };

  const canSaveSnapshot = outputs && !outputs.is_partial && planId;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate display values
  const downPaymentValue = outputs?.down_payment_value ?? 0;
  const financedValue = outputs?.financed_value ?? 0;

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-neutral-100">
            Simulador de Financiamento
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

        {/* Row 1: Purchase/Sale Price, Entry */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
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

          <div>
            <label className="block text-xs text-neutral-500 mb-1">
              Entrada (%)
            </label>
            <input
              type="number"
              value={inputs.down_payment_percent !== null ? (inputs.down_payment_percent * 100).toFixed(0) : ""}
              onChange={(e) => handlePercentChange("down_payment_percent", e.target.value)}
              placeholder="20"
              min="0"
              max="100"
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-500 mb-1">
              Valor Entrada (calculado)
            </label>
            <div className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-300">
              {downPaymentValue > 0 ? formatCurrency(downPaymentValue) : "-"}
            </div>
          </div>
        </div>

        {/* Row 2: Financed Value, Term, Rates */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">
              Valor Financiado (calculado)
            </label>
            <div className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-300">
              {financedValue > 0 ? formatCurrency(financedValue) : "-"}
            </div>
          </div>

          <div>
            <label className="block text-xs text-neutral-500 mb-1">
              Prazo (meses)
            </label>
            <input
              type="number"
              value={inputs.term_months ?? ""}
              onChange={(e) => handleInputChange("term_months", e.target.value)}
              placeholder="360"
              min="1"
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-500 mb-1">
              CET (% a.a.)
              <span className="ml-1 text-neutral-600" title="Custo Efetivo Total anual">ⓘ</span>
            </label>
            <input
              type="number"
              value={inputs.cet !== null ? (inputs.cet * 100).toFixed(2) : ""}
              onChange={(e) => handlePercentChange("cet", e.target.value)}
              placeholder="12"
              step="0.01"
              min="0"
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-500 mb-1">
              Juros Nominal (% a.a.)
            </label>
            <input
              type="number"
              value={inputs.interest_rate !== null ? (inputs.interest_rate * 100).toFixed(2) : ""}
              onChange={(e) => handlePercentChange("interest_rate", e.target.value)}
              placeholder="10"
              step="0.01"
              min="0"
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Row 3: Bank Fees */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">
              Seguro (R$)
              <span className="ml-1 text-neutral-600" title="Seguro MIP/DFI total">ⓘ</span>
            </label>
            <input
              type="number"
              value={inputs.insurance ?? ""}
              onChange={(e) => handleInputChange("insurance", e.target.value)}
              placeholder="5000"
              min="0"
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-500 mb-1">
              Avaliação (R$)
              <span className="ml-1 text-neutral-600" title="Taxa de avaliação do imóvel">ⓘ</span>
            </label>
            <input
              type="number"
              value={inputs.appraisal_fee ?? ""}
              onChange={(e) => handleInputChange("appraisal_fee", e.target.value)}
              placeholder="1500"
              min="0"
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-500 mb-1">
              Outras Taxas (R$)
            </label>
            <input
              type="number"
              value={inputs.other_fees ?? ""}
              onChange={(e) => handleInputChange("other_fees", e.target.value)}
              placeholder="500"
              min="0"
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-500 mb-1">
              Saldo Devedor (R$)
              <span className="ml-1 text-neutral-600" title="Saldo restante do financiamento">ⓘ</span>
            </label>
            <input
              type="number"
              value={inputs.remaining_debt ?? ""}
              onChange={(e) => handleInputChange("remaining_debt", e.target.value)}
              placeholder="350000"
              min="0"
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Payments */}
      <FinancingPaymentsList
        planId={planId}
        propertyId={propertyId}
        payments={initialPayments ?? []}
        onPaymentChange={handlePaymentChange}
      />

      {/* Outputs */}
      {outputs && <FinancingOutputsDisplay outputs={outputs} />}

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
