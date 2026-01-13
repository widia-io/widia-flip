"use client";

import { useRouter } from "next/navigation";
import { Lock, TrendingUp, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface StringNumberInputProps {
  readonly id?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
}

function StringNumberInput({ id, value, onChange, placeholder, disabled }: StringNumberInputProps) {
  const numValue = value === "" ? null : Number.parseFloat(value);
  return (
    <NumberInput
      id={id}
      value={Number.isNaN(numValue) ? null : numValue}
      onChange={(v) => onChange(v === null ? "" : v.toString())}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}

interface InvestmentFormData {
  offer_price: string;
  expected_sale_price: string;
  renovation_cost_estimate: string;
  hold_months: string;
  other_costs_estimate: string;
}

interface InvestmentAnalysisFieldsetProps {
  canAccess: boolean;
  formData: InvestmentFormData;
  onChange: (field: keyof InvestmentFormData, value: string) => void;
  disabled?: boolean;
  workspaceId?: string;
  idPrefix?: string;
}

export function InvestmentAnalysisFieldset({
  canAccess,
  formData,
  onChange,
  disabled = false,
  workspaceId,
  idPrefix = "",
}: InvestmentAnalysisFieldsetProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    router.push("/app/billing");
  };

  const id = (field: string) => `${idPrefix}${field}`;

  // Locked state for Starter users
  if (!canAccess) {
    return (
      <fieldset className="relative space-y-4 rounded-lg border border-muted-foreground/20 bg-muted/30 p-4">
        <legend className="flex items-center gap-2 px-2 text-sm font-medium text-muted-foreground">
          <TrendingUp className="h-4 w-4" />
          Analise de Investimento
          <Badge variant="secondary" className="ml-1 gap-1 text-[10px]">
            <Lock className="h-3 w-3" />
            PRO
          </Badge>
        </legend>

        {/* Overlay with upgrade message */}
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-medium">
            Desbloqueie a analise de ROI e metricas avancadas
          </p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Calcule o Flip Score v1 com base em premissas de investimento reais.
          </p>
          {workspaceId && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleUpgrade}
              className="mt-4 gap-1"
            >
              Fazer Upgrade
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Disabled fields preview (blurred) */}
        <div className="pointer-events-none select-none opacity-30 blur-[2px]">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Preco de Venda Esperado</Label>
              <Input disabled placeholder="ARV" />
            </div>
            <div className="space-y-2">
              <Label>Custo de Reforma</Label>
              <Input disabled placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Prazo (meses)</Label>
              <Input disabled placeholder="6" />
            </div>
          </div>
        </div>
      </fieldset>
    );
  }

  // Unlocked state for Pro/Growth users
  return (
    <fieldset className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <legend className="flex items-center gap-2 px-2 text-sm font-medium">
        <TrendingUp className="h-4 w-4 text-primary" />
        Analise de Investimento
        <span className="ml-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] text-primary">
          Score v1
        </span>
      </legend>
      <p className="text-xs text-muted-foreground">
        Preencha para calcular o Flip Score v1 baseado em ROI.
      </p>

      {/* Objetivo do Investimento */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-muted-foreground">
          Objetivo do Investimento
        </h4>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor={id("expected_sale_price")}>
              Preco de Venda Esperado (R$)
            </Label>
            <StringNumberInput
              id={id("expected_sale_price")}
              value={formData.expected_sale_price}
              onChange={(v) => onChange("expected_sale_price", v)}
              placeholder="700.000"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("renovation_cost_estimate")}>
              Custo de Reforma (R$)
            </Label>
            <StringNumberInput
              id={id("renovation_cost_estimate")}
              value={formData.renovation_cost_estimate}
              onChange={(v) => onChange("renovation_cost_estimate", v)}
              placeholder="50.000"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("hold_months")}>Prazo (meses)</Label>
            <StringNumberInput
              id={id("hold_months")}
              value={formData.hold_months}
              onChange={(v) => onChange("hold_months", v)}
              placeholder="6"
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* Tributos e Custos (info only) */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground">
          Tributos e Custos
        </h4>
        <p className="text-xs text-muted-foreground/70">
          Taxas padrao BR: ITBI 3%, Escritura 1%, Corretagem 6%, IR 15%
        </p>
      </div>

      {/* Estrategia de Compra */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-muted-foreground">
          Estrategia de Compra
        </h4>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor={id("offer_price")}>Valor da Proposta (R$)</Label>
            <StringNumberInput
              id={id("offer_price")}
              value={formData.offer_price}
              onChange={(v) => onChange("offer_price", v)}
              placeholder="500.000"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("other_costs_estimate")}>
              Outros Custos (R$)
            </Label>
            <StringNumberInput
              id={id("other_costs_estimate")}
              value={formData.other_costs_estimate}
              onChange={(v) => onChange("other_costs_estimate", v)}
              placeholder="10.000"
              disabled={disabled}
            />
          </div>
          <div className="flex items-end">
            <Badge variant="secondary" className="mb-2">
              A Vista
            </Badge>
          </div>
        </div>
      </div>
    </fieldset>
  );
}
