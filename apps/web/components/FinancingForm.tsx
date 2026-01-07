"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Info } from "lucide-react";

import type { FinancingInputs, FinancingOutputs, FinancingPayment, FinancingAnalysisResponse } from "@widia/shared";
import {
  updateFinancingAction,
  createFinancingSnapshotAction,
} from "@/lib/actions/financing";
import { usePaywall } from "@/components/PaywallModal";
import { FinancingOutputsDisplay } from "@/components/FinancingOutputs";
import { FinancingPaymentsList } from "@/components/FinancingPaymentsList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type EffectiveRates = FinancingAnalysisResponse["effective_rates"];

interface FinancingFormProps {
  propertyId: string;
  workspaceId: string;
  planId?: string;
  initialInputs?: FinancingInputs;
  initialPayments?: FinancingPayment[];
  initialOutputs?: FinancingOutputs;
  initialRates?: EffectiveRates;
}

export function FinancingForm({
  propertyId,
  workspaceId,
  planId: initialPlanId,
  initialInputs,
  initialPayments,
  initialOutputs,
  initialRates,
}: FinancingFormProps) {
  const router = useRouter();
  const { showPaywall } = usePaywall();
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

  const [rates, setRates] = useState<EffectiveRates | undefined>(initialRates);

  // Sync outputs with initialOutputs when page refreshes (e.g., after payment change)
  useEffect(() => {
    if (initialOutputs) {
      setOutputs(initialOutputs);
    }
  }, [initialOutputs]);

  useEffect(() => {
    if (initialRates) {
      setRates(initialRates);
    }
  }, [initialRates]);

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
        setRates(result.data.effective_rates);
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

    // Flush debounce: force update inputs to BD before creating snapshot
    const hasValue = Object.values(inputs).some((v) => v !== null);
    if (hasValue) {
      const requestData: Record<string, number> = {};
      if (inputs.purchase_price !== null) requestData.purchase_price = inputs.purchase_price;
      if (inputs.sale_price !== null) requestData.sale_price = inputs.sale_price;
      if (inputs.down_payment_percent !== null) requestData.down_payment_percent = inputs.down_payment_percent;
      if (inputs.term_months !== null) requestData.term_months = inputs.term_months;
      if (inputs.cet !== null) requestData.cet = inputs.cet;
      if (inputs.interest_rate !== null) requestData.interest_rate = inputs.interest_rate;
      if (inputs.insurance !== null) requestData.insurance = inputs.insurance;
      if (inputs.appraisal_fee !== null) requestData.appraisal_fee = inputs.appraisal_fee;
      if (inputs.other_fees !== null) requestData.other_fees = inputs.other_fees;
      if (inputs.remaining_debt !== null) requestData.remaining_debt = inputs.remaining_debt;
      await updateFinancingAction(propertyId, requestData);
    }

    const result = await createFinancingSnapshotAction(propertyId);

    if ("enforcement" in result && result.enforcement) {
      showPaywall(result.enforcement, workspaceId);
    } else if ("error" in result && result.error) {
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Simulador de Financiamento</CardTitle>
          {isPending && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-primary/50 bg-primary/10 p-3 text-sm text-primary">
              {success}
            </div>
          )}

          {/* Row 1: Purchase/Sale Price, Entry */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="purchase_price">Preço de Compra (R$)</Label>
              <Input
                id="purchase_price"
                type="number"
                value={inputs.purchase_price ?? ""}
                onChange={(e) => handleInputChange("purchase_price", e.target.value)}
                placeholder="500000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sale_price">Preço de Venda (R$)</Label>
              <Input
                id="sale_price"
                type="number"
                value={inputs.sale_price ?? ""}
                onChange={(e) => handleInputChange("sale_price", e.target.value)}
                placeholder="700000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="down_payment_percent">Entrada (%)</Label>
              <Input
                id="down_payment_percent"
                type="number"
                value={inputs.down_payment_percent !== null ? (inputs.down_payment_percent * 100).toFixed(0) : ""}
                onChange={(e) => handlePercentChange("down_payment_percent", e.target.value)}
                placeholder="20"
                min="0"
                max="100"
              />
            </div>

            <div className="space-y-2">
              <Label>Valor Entrada</Label>
              <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                {downPaymentValue > 0 ? formatCurrency(downPaymentValue) : "-"}
              </div>
            </div>
          </div>

          {/* Row 2: Financed Value, Term, Rates */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Valor Financiado</Label>
              <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                {financedValue > 0 ? formatCurrency(financedValue) : "-"}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="term_months">Prazo (meses)</Label>
              <Input
                id="term_months"
                type="number"
                value={inputs.term_months ?? ""}
                onChange={(e) => handleInputChange("term_months", e.target.value)}
                placeholder="360"
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cet" className="flex items-center gap-1">
                CET (% a.a.)
                <Info className="h-3 w-3 text-muted-foreground" />
              </Label>
              <Input
                id="cet"
                type="number"
                value={inputs.cet !== null ? (inputs.cet * 100).toFixed(2) : ""}
                onChange={(e) => handlePercentChange("cet", e.target.value)}
                placeholder="12"
                step="0.01"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interest_rate">Juros Nominal (% a.a.)</Label>
              <Input
                id="interest_rate"
                type="number"
                value={inputs.interest_rate !== null ? (inputs.interest_rate * 100).toFixed(2) : ""}
                onChange={(e) => handlePercentChange("interest_rate", e.target.value)}
                placeholder="10"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          {/* Row 3: Bank Fees */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="insurance" className="flex items-center gap-1">
                Seguro (R$)
                <Info className="h-3 w-3 text-muted-foreground" />
              </Label>
              <Input
                id="insurance"
                type="number"
                value={inputs.insurance ?? ""}
                onChange={(e) => handleInputChange("insurance", e.target.value)}
                placeholder="5000"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="appraisal_fee" className="flex items-center gap-1">
                Avaliação (R$)
                <Info className="h-3 w-3 text-muted-foreground" />
              </Label>
              <Input
                id="appraisal_fee"
                type="number"
                value={inputs.appraisal_fee ?? ""}
                onChange={(e) => handleInputChange("appraisal_fee", e.target.value)}
                placeholder="1500"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="other_fees">Outras Taxas (R$)</Label>
              <Input
                id="other_fees"
                type="number"
                value={inputs.other_fees ?? ""}
                onChange={(e) => handleInputChange("other_fees", e.target.value)}
                placeholder="500"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="remaining_debt" className="flex items-center gap-1">
                Saldo Devedor (R$)
                <Info className="h-3 w-3 text-muted-foreground" />
              </Label>
              <Input
                id="remaining_debt"
                type="number"
                value={inputs.remaining_debt ?? ""}
                onChange={(e) => handleInputChange("remaining_debt", e.target.value)}
                placeholder="350000"
                min="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments */}
      <FinancingPaymentsList
        planId={planId}
        propertyId={propertyId}
        payments={initialPayments ?? []}
        onPaymentChange={handlePaymentChange}
      />

      {/* Outputs */}
      {outputs && <FinancingOutputsDisplay outputs={outputs} rates={rates} />}

      {/* Save Snapshot Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveSnapshot}
          disabled={isSavingSnapshot || !canSaveSnapshot}
        >
          {isSavingSnapshot ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar Análise
        </Button>
      </div>
    </div>
  );
}
