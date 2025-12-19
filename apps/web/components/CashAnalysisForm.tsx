"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";

import type { CashInputs, CashOutputs } from "@widia/shared";
import { updateCashAnalysisAction, createCashSnapshotAction } from "@/lib/actions/properties";
import { CashAnalysisOutputs } from "@/components/CashAnalysisOutputs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
              <Input
                id="purchase_price"
                type="number"
                value={inputs.purchase_price ?? ""}
                onChange={(e) => handleInputChange("purchase_price", e.target.value)}
                placeholder="500000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="renovation_cost">Custo de Reforma (R$)</Label>
              <Input
                id="renovation_cost"
                type="number"
                value={inputs.renovation_cost ?? ""}
                onChange={(e) => handleInputChange("renovation_cost", e.target.value)}
                placeholder="50000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="other_costs">Outros Custos (R$)</Label>
              <Input
                id="other_costs"
                type="number"
                value={inputs.other_costs ?? ""}
                onChange={(e) => handleInputChange("other_costs", e.target.value)}
                placeholder="10000"
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
          </div>
        </CardContent>
      </Card>

      {/* Outputs */}
      {outputs && <CashAnalysisOutputs outputs={outputs} />}

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
