"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import type { CashOutputs } from "@widia/shared";
import { CalculatorOutputs } from "@/components/CalculatorOutputs";
import { AuthModal } from "@/components/AuthModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface CalculatorFormProps {
  readonly isLoggedIn: boolean;
}

const STORAGE_KEY = "widia_calculator_inputs";

function getSaveButtonText(isSaving: boolean, isLoggedIn: boolean): string {
  if (isSaving) return "Salvando...";
  if (isLoggedIn) return "Salvar Análise";
  return "Salvar Análise (requer login)";
}

interface CalculatorInputs {
  purchase_price: number | null;
  renovation_cost: number | null;
  other_costs: number | null;
  sale_price: number | null;
}

export function CalculatorForm({ isLoggedIn }: CalculatorFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inputs, setInputs] = useState<CalculatorInputs>({
    purchase_price: null,
    renovation_cost: null,
    other_costs: null,
    sale_price: null,
  });

  const [outputs, setOutputs] = useState<CashOutputs | null>(null);

  // Load from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setInputs(parsed);
      } catch {
        // Ignore invalid JSON
      }
    }
  }, []);

  // Auto-save after login: check if we have pending data
  useEffect(() => {
    if (isLoggedIn) {
      const pendingAction = sessionStorage.getItem("widia_pending_save");
      if (pendingAction === "true") {
        sessionStorage.removeItem("widia_pending_save");
        // Trigger save automatically
        handleSave();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // Debounced calculation
  const [debouncedInputs, setDebouncedInputs] = useState(inputs);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInputs(inputs);
    }, 400);
    return () => clearTimeout(timer);
  }, [inputs]);

  useEffect(() => {
    // Only calculate if we have at least purchase price or sale price
    const hasValue =
      debouncedInputs.purchase_price !== null ||
      debouncedInputs.sale_price !== null;
    if (!hasValue) return;

    // Save to sessionStorage
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(debouncedInputs));

    startTransition(async () => {
      try {
        const res = await fetch("/api/calculator/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            purchase_price: debouncedInputs.purchase_price,
            renovation_cost: debouncedInputs.renovation_cost,
            other_costs: debouncedInputs.other_costs,
            sale_price: debouncedInputs.sale_price,
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          setError(`Erro ao calcular: ${text}`);
          return;
        }

        const data = await res.json();
        setOutputs(data.outputs);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao calcular");
      }
    });
  }, [debouncedInputs]);

  const handleInputChange = (field: keyof CalculatorInputs, value: string) => {
    const numValue = value === "" ? null : Number.parseFloat(value);
    setInputs((prev) => ({
      ...prev,
      [field]: numValue,
    }));
  };

  const handleSave = async () => {
    if (!isLoggedIn) {
      // Save inputs to sessionStorage and mark pending save
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
      sessionStorage.setItem("widia_pending_save", "true");
      setShowAuthModal(true);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/calculator/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchase_price: inputs.purchase_price,
          renovation_cost: inputs.renovation_cost,
          other_costs: inputs.other_costs,
          sale_price: inputs.sale_price,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || "Erro ao salvar análise");
      }

      const data = await res.json();
      // Clear storage
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem("widia_pending_save");
      // Redirect to property
      router.push(`/app/properties/${data.property_id}/viability`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // Page will reload and useEffect will trigger save
    router.refresh();
  };

  const canSave = outputs && !outputs.is_partial;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Inputs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Dados do Imóvel</CardTitle>
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

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="purchase_price">Preço de Compra (R$) *</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  value={inputs.purchase_price ?? ""}
                  onChange={(e) =>
                    handleInputChange("purchase_price", e.target.value)
                  }
                  placeholder="500000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="renovation_cost">Custo de Reforma (R$)</Label>
                <Input
                  id="renovation_cost"
                  type="number"
                  value={inputs.renovation_cost ?? ""}
                  onChange={(e) =>
                    handleInputChange("renovation_cost", e.target.value)
                  }
                  placeholder="50000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="other_costs">Outros Custos (R$)</Label>
                <Input
                  id="other_costs"
                  type="number"
                  value={inputs.other_costs ?? ""}
                  onChange={(e) =>
                    handleInputChange("other_costs", e.target.value)
                  }
                  placeholder="10000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sale_price">Preço de Venda (R$) *</Label>
                <Input
                  id="sale_price"
                  type="number"
                  value={inputs.sale_price ?? ""}
                  onChange={(e) =>
                    handleInputChange("sale_price", e.target.value)
                  }
                  placeholder="700000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Outputs */}
        <Card>
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
          </CardHeader>

          <CardContent>
            {outputs ? (
              <CalculatorOutputs outputs={outputs} />
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                Preencha os valores para ver o resultado
              </div>
            )}

            {/* Save Button */}
            <div className="mt-6 pt-6 border-t border-border">
              <Button
                onClick={handleSave}
                disabled={isSaving || !canSave}
                className="w-full"
                size="lg"
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {getSaveButtonText(isSaving, isLoggedIn)}
              </Button>
              {!canSave && outputs?.is_partial && (
                <p className="mt-2 text-xs text-muted-foreground text-center">
                  Preencha preço de compra e venda para salvar
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}
