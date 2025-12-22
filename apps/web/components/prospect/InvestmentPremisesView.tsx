"use client";

import { useMemo } from "react";
import { Target, Receipt, Wallet, AlertCircle } from "lucide-react";
import type { Prospect, EconomicsBreakdown, FlipScoreBreakdownV1 } from "@widia/shared";
import { PremiseCard } from "./PremiseCard";
import { PaymentMethodToggle } from "./PaymentMethodToggle";
import { MetricDisplay } from "@/components/ui/metric-display";
import { Badge } from "@/components/ui/badge";

interface InvestmentPremisesViewProps {
  prospect: Prospect;
}

function getEconomics(
  breakdown: Prospect["flip_score_breakdown"]
): EconomicsBreakdown | null {
  if (!breakdown) return null;
  const b = breakdown as FlipScoreBreakdownV1;
  return b.economics ?? null;
}

export function InvestmentPremisesView({ prospect }: InvestmentPremisesViewProps) {
  const economics = getEconomics(prospect.flip_score_breakdown);
  const isV1 = prospect.flip_score_version === "v1";

  const pricePerSqmSale = useMemo(() => {
    if (!prospect.expected_sale_price || !prospect.area_usable) return null;
    return prospect.expected_sale_price / prospect.area_usable;
  }, [prospect.expected_sale_price, prospect.area_usable]);

  const reservePercent = useMemo(() => {
    if (!economics?.buffer || !economics.investment_total) return null;
    return (economics.buffer / economics.investment_total) * 100;
  }, [economics]);

  const purchasePrice = prospect.offer_price ?? prospect.asking_price;

  const hasInvestmentData =
    prospect.offer_price != null ||
    prospect.expected_sale_price != null ||
    prospect.renovation_cost_estimate != null ||
    prospect.hold_months != null ||
    prospect.other_costs_estimate != null;

  if (!hasInvestmentData && !isV1) {
    return (
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Target className="h-4 w-4" />
          Análise de Investimento
        </h3>
        <p className="text-sm text-muted-foreground">
          Preencha os dados de investimento para ver a análise e calcular o Flip Score v1.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Target className="h-4 w-4" />
          Análise de Investimento
        </h3>
        {isV1 && (
          <Badge variant="outline" className="bg-primary/10 text-primary text-[10px]">
            v1
          </Badge>
        )}
        {economics?.is_partial && (
          <Badge variant="outline" className="border-amber-500 text-amber-600 text-[10px]">
            <AlertCircle className="mr-1 h-3 w-3" />
            Incompleto
          </Badge>
        )}
      </div>

      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {/* Card 1: Objetivo do Investimento */}
        <PremiseCard title="Objetivo do Investimento" icon={Target}>
          <div className="grid grid-cols-2 gap-2">
            <MetricDisplay
              label="Preço m² Venda"
              value={pricePerSqmSale}
              format="currency"
              tooltip="Calculado: Venda Esperada ÷ Área Útil"
            />
            <MetricDisplay
              label="Meta ROI"
              value={economics?.roi}
              format="percent"
              variant={
                economics?.roi != null
                  ? economics.roi >= 20
                    ? "positive"
                    : economics.roi < 0
                    ? "negative"
                    : "default"
                  : "muted"
              }
              tooltip="Calculado pelo backend após Atualizar Score"
            />
            <MetricDisplay
              label="Reforma"
              value={prospect.renovation_cost_estimate}
              format="currency"
            />
            <MetricDisplay
              label="Holding"
              value={prospect.hold_months}
              format="months"
            />
          </div>
        </PremiseCard>

        {/* Card 2: Tributos e Custos */}
        <PremiseCard title="Tributos e Custos" icon={Receipt}>
          <div className="grid grid-cols-2 gap-2">
            <MetricDisplay label="ITBI" value="3%" format="static" variant="muted" />
            <MetricDisplay label="Escritura" value="1%" format="static" variant="muted" />
            <MetricDisplay label="Corretagem" value="6%" format="static" variant="muted" />
            <MetricDisplay label="IR (PJ)" value="15%" format="static" variant="muted" />
            <div className="col-span-2">
              <MetricDisplay
                label="Reserva"
                value={reservePercent}
                format="percent"
                highlight={reservePercent != null && reservePercent > 10}
                variant={
                  reservePercent != null
                    ? reservePercent >= 10
                      ? "positive"
                      : reservePercent < 0
                      ? "negative"
                      : "default"
                    : "muted"
                }
                tooltip="Margem: (Venda Esperada - Break-even) / Investimento Total"
              />
            </div>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Taxas padrão BR. Configure no workspace para alterar.
          </p>
        </PremiseCard>

        {/* Card 3: Forma de Pagamento */}
        <PremiseCard title="Forma de Pagamento" icon={Wallet}>
          <div className="space-y-3">
            <PaymentMethodToggle value="cash" financingDisabled financingDisabledMessage="Em breve" />
            <MetricDisplay
              label="Valor de Compra"
              value={purchasePrice}
              format="currency"
              highlight
              tooltip={prospect.offer_price ? "Valor da proposta" : "Preço pedido (sem proposta)"}
            />
            {prospect.other_costs_estimate != null && prospect.other_costs_estimate > 0 && (
              <MetricDisplay
                label="Outros Custos"
                value={prospect.other_costs_estimate}
                format="currency"
              />
            )}
            {/* Financing fields (disabled/grayed) */}
            <div className="grid grid-cols-2 gap-2 opacity-40">
              <MetricDisplay label="Entrada" value="—" format="static" variant="muted" />
              <MetricDisplay label="Taxa Juros" value="—" format="static" variant="muted" />
              <MetricDisplay label="Prazo" value="—" format="static" variant="muted" />
              <MetricDisplay label="Taxas Bancárias" value="—" format="static" variant="muted" />
            </div>
          </div>
        </PremiseCard>
      </div>
    </section>
  );
}
