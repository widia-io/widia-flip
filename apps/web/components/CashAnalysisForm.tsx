"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";

import type { CashInputs, CashOutputs, CashAnalysisResponse } from "@widia/shared";
import { updateCashAnalysisAction, createCashSnapshotAction } from "@/lib/actions/properties";
import { usePaywall } from "@/components/PaywallModal";
import { CashAnalysisOutputs } from "@/components/CashAnalysisOutputs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type EffectiveRates = CashAnalysisResponse["effective_rates"];

interface CashAnalysisFormProps {
  propertyId: string;
  workspaceId: string;
  initialInputs?: CashInputs;
  initialOutputs?: CashOutputs;
  initialRates?: EffectiveRates;
}

export function CashAnalysisForm({
  propertyId,
  workspaceId,
  initialInputs,
  initialOutputs,
  initialRates,
}: CashAnalysisFormProps) {
  const router = useRouter();
  const { showPaywall } = usePaywall();
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

  const [rates, setRates] = useState<EffectiveRates | undefined>(initialRates);

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
        setRates(result.data.effective_rates);
      }
    });
  }, [debouncedInputs, propertyId]);

  const handleInputChange = (field: keyof typeof inputs, value: number | null) => {
    setInputs((prev) => ({
      ...prev,
      [field]: value,
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
      if (inputs.renovation_cost !== null) requestData.renovation_cost = inputs.renovation_cost;
      if (inputs.other_costs !== null) requestData.other_costs = inputs.other_costs;
      if (inputs.sale_price !== null) requestData.sale_price = inputs.sale_price;
      await updateCashAnalysisAction(propertyId, requestData);
    }

    const result = await createCashSnapshotAction(propertyId);

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

  const canSaveSnapshot = outputs && !outputs.is_partial;

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Viabilidade à Vista</CardTitle>
          {isPending && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg border border-primary/50 bg-primary/10 p-3 text-sm text-primary">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="purchase_price">Preço de Compra (R$)</Label>
              <NumberInput
                id="purchase_price"
                value={inputs.purchase_price}
                onChange={(v) => handleInputChange("purchase_price", v)}
                placeholder="500.000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="renovation_cost">Custo de Reforma (R$)</Label>
              <NumberInput
                id="renovation_cost"
                value={inputs.renovation_cost}
                onChange={(v) => handleInputChange("renovation_cost", v)}
                placeholder="50.000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="other_costs">Outros Custos (R$)</Label>
              <NumberInput
                id="other_costs"
                value={inputs.other_costs}
                onChange={(v) => handleInputChange("other_costs", v)}
                placeholder="10.000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sale_price">Preço de Venda (R$)</Label>
              <NumberInput
                id="sale_price"
                value={inputs.sale_price}
                onChange={(v) => handleInputChange("sale_price", v)}
                placeholder="700.000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Outputs */}
      {outputs && <CashAnalysisOutputs outputs={outputs} rates={rates} />}

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
