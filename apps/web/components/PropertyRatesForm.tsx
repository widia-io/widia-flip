"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { Loader2, RotateCcw } from "lucide-react";

import type {
  PropertyRatesResponse,
  TaxRatePresetKey,
} from "@widia/shared";
import { TAX_RATE_PRESETS } from "@widia/shared";
import { updatePropertyRatesAction } from "@/lib/actions/propertyRates";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PropertyRatesFormProps {
  propertyId: string;
  initialRates: PropertyRatesResponse;
}

type RateField = "itbi_rate" | "registry_rate" | "broker_rate" | "pj_tax_rate";

const RATE_LABELS: Record<RateField, string> = {
  itbi_rate: "ITBI",
  registry_rate: "Registro",
  broker_rate: "Corretagem",
  pj_tax_rate: "Imposto PJ",
};

export function PropertyRatesForm({ propertyId, initialRates }: PropertyRatesFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [rates, setRates] = useState(initialRates);
  const [custom, setCustom] = useState({
    itbi_rate: initialRates.custom.itbi_rate,
    registry_rate: initialRates.custom.registry_rate,
    broker_rate: initialRates.custom.broker_rate,
    pj_tax_rate: initialRates.custom.pj_tax_rate,
  });

  // Debounced save
  const [debouncedCustom, setDebouncedCustom] = useState(custom);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCustom(custom);
    }, 500);
    return () => clearTimeout(timer);
  }, [custom]);

  const saveRates = useCallback(
    (newCustom: typeof custom) => {
      startTransition(async () => {
        const result = await updatePropertyRatesAction(propertyId, newCustom);
        if (result.error) {
          setError(result.error);
        } else if (result.data) {
          setError(null);
          setRates(result.data);
          setSuccess("Taxas salvas");
          setTimeout(() => setSuccess(null), 2000);
        }
      });
    },
    [propertyId]
  );

  useEffect(() => {
    // Only save if different from initial
    const hasChange =
      debouncedCustom.itbi_rate !== initialRates.custom.itbi_rate ||
      debouncedCustom.registry_rate !== initialRates.custom.registry_rate ||
      debouncedCustom.broker_rate !== initialRates.custom.broker_rate ||
      debouncedCustom.pj_tax_rate !== initialRates.custom.pj_tax_rate;

    if (hasChange) {
      saveRates(debouncedCustom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedCustom, propertyId]);

  const applyPreset = (presetKey: TaxRatePresetKey) => {
    const preset = TAX_RATE_PRESETS[presetKey];
    setCustom((prev) => ({
      ...prev,
      itbi_rate: preset.itbi_rate,
      registry_rate: preset.registry_rate,
      broker_rate: preset.broker_rate,
      // Keep pj_tax_rate as-is (not in presets)
    }));
  };

  const clearRate = (field: RateField) => {
    setCustom((prev) => ({
      ...prev,
      [field]: null,
    }));
  };

  const handleRateChange = (field: RateField, value: string) => {
    const numValue = value === "" ? null : parseFloat(value) / 100;
    if (numValue !== null && (numValue < 0 || numValue > 1)) return;
    setCustom((prev) => ({
      ...prev,
      [field]: numValue,
    }));
  };

  const getDisplayValue = (field: RateField): string => {
    const customValue = custom[field];
    if (customValue !== null) {
      return (customValue * 100).toFixed(1);
    }
    return "";
  };

  const getPlaceholder = (field: RateField): string => {
    const wsValue = rates.workspace_rates[field];
    return `${(wsValue * 100).toFixed(1)} (herdado)`;
  };

  const isCustom = (field: RateField): boolean => {
    return custom[field] !== null;
  };

  return (
    <div className="space-y-6">
      {/* Presets */}
      <Card>
        <CardHeader>
          <CardTitle>Presets Regionais</CardTitle>
          <CardDescription>
            Aplique taxas padrao para sua regiao com um clique
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TAX_RATE_PRESETS) as TaxRatePresetKey[]).map((key) => (
              <Button
                key={key}
                variant="outline"
                onClick={() => applyPreset(key)}
                disabled={isPending}
              >
                {TAX_RATE_PRESETS[key].label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Rates */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Taxas Customizadas</CardTitle>
            <CardDescription>
              Defina taxas especificas para este imovel. Campos vazios herdam do workspace.
            </CardDescription>
          </div>
          {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
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

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {(["itbi_rate", "registry_rate", "broker_rate", "pj_tax_rate"] as RateField[]).map(
              (field) => (
                <div key={field} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={field}>{RATE_LABELS[field]} (%)</Label>
                    <Badge variant={isCustom(field) ? "default" : "secondary"}>
                      {isCustom(field) ? "Customizado" : "Herdado"}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id={field}
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={getDisplayValue(field)}
                      onChange={(e) => handleRateChange(field, e.target.value)}
                      placeholder={getPlaceholder(field)}
                      className={!isCustom(field) ? "text-muted-foreground" : ""}
                    />
                    {isCustom(field) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => clearRate(field)}
                        title="Usar valor do workspace"
                        disabled={isPending}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {!isCustom(field) && (
                    <p className="text-xs text-muted-foreground">
                      Usando valor padrao do workspace ({(rates.workspace_rates[field] * 100).toFixed(1)}%)
                    </p>
                  )}
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Effective Rates Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Taxas Efetivas</CardTitle>
          <CardDescription>
            Valores finais que serao usados nos calculos de viabilidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(["itbi_rate", "registry_rate", "broker_rate", "pj_tax_rate"] as RateField[]).map(
              (field) => (
                <div key={field}>
                  <span className="text-xs text-muted-foreground">{RATE_LABELS[field]}</span>
                  <p className="text-lg font-semibold">
                    {(rates.effective[field] * 100).toFixed(1)}%
                  </p>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
