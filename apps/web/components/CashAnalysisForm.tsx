"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Save,
  Calculator,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

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
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-base font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Calculator className="h-4 w-4 text-primary" />
              </div>
              Viabilidade à Vista
            </CardTitle>
            {isPending && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Calculando...</span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="flex items-center gap-3 rounded-lg border border-green-500/50 bg-green-500/5 p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          {/* Custos de Entrada */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-amber-500/10">
                <TrendingDown className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                Custos de Entrada
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pl-8">
              <div className="space-y-2">
                <Label
                  htmlFor="purchase_price"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Preço de Compra (R$)
                </Label>
                <NumberInput
                  id="purchase_price"
                  value={inputs.purchase_price}
                  onChange={(v) => handleInputChange("purchase_price", v)}
                  placeholder="500.000"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="renovation_cost"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Custo de Reforma (R$)
                </Label>
                <NumberInput
                  id="renovation_cost"
                  value={inputs.renovation_cost}
                  onChange={(v) => handleInputChange("renovation_cost", v)}
                  placeholder="50.000"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="other_costs"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Outros Custos (R$)
                </Label>
                <NumberInput
                  id="other_costs"
                  value={inputs.other_costs}
                  onChange={(v) => handleInputChange("other_costs", v)}
                  placeholder="10.000"
                />
              </div>
            </div>
          </div>

          {/* Venda Esperada */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-green-500/10">
                <TrendingUp className="h-3.5 w-3.5 text-green-600" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                Venda Esperada
              </span>
            </div>
            <div className="pl-8 max-w-xs">
              <div className="space-y-2">
                <Label
                  htmlFor="sale_price"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Preço de Venda (R$)
                </Label>
                <NumberInput
                  id="sale_price"
                  value={inputs.sale_price}
                  onChange={(v) => handleInputChange("sale_price", v)}
                  placeholder="700.000"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Outputs */}
      {outputs && <CashAnalysisOutputs outputs={outputs} rates={rates} />}

      {/* Save Snapshot Button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSaveSnapshot}
          disabled={isSavingSnapshot || !canSaveSnapshot}
          size="lg"
          className="gap-2"
        >
          {isSavingSnapshot ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar Análise
        </Button>
      </div>
    </div>
  );
}
