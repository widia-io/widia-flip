"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  ExternalLink,
  Bed,
  Bath,
  Car,
  Building2,
  Phone,
  Trash2,
  ArrowRightCircle,
  MapPin,
  Eye,
} from "lucide-react";

import type { Prospect } from "@widia/shared";

import {
  deleteProspectAction,
  convertProspectAction,
  restoreProspectAction,
} from "@/lib/actions/prospects";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProspectViewModal } from "@/components/ProspectViewModal";
import { FlipScoreBadge } from "@/components/FlipScoreBadge";

interface ProspectCardProps {
  prospect: Prospect;
  canAccessFlipScoreV1?: boolean;
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline"; tooltip: string }
> = {
  active: { label: "Ativo", variant: "default", tooltip: "Lead em acompanhamento. Arquive quando não fizer mais sentido." },
  discarded: { label: "Descartado", variant: "secondary", tooltip: "Lead descartado. Pode ser restaurado." },
  converted: { label: "Convertido", variant: "outline", tooltip: "Já convertido para Imóvel para análise." },
};

export function ProspectCard({ prospect, canAccessFlipScoreV1 = false }: ProspectCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirmConvert, setShowConfirmConvert] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteProspectAction(prospect.id);

      if (result.success) {
        toast.success("Prospect excluído", {
          description: prospect.neighborhood || prospect.address || "Imóvel removido",
          action: {
            label: "Desfazer",
            onClick: async () => {
              const restoreResult = await restoreProspectAction(prospect.id);
              if (restoreResult.success) {
                toast.success("Prospect restaurado");
                router.refresh();
              } else {
                toast.error("Erro ao restaurar", {
                  description: restoreResult.error,
                });
              }
            },
          },
          duration: 5000,
        });
        router.refresh();
      } else {
        toast.error("Erro ao excluir", {
          description: result.error,
        });
      }
    });
  };

  const handleConvert = () => {
    startTransition(async () => {
      const result = await convertProspectAction(prospect.id);
      if (result.error) {
        toast.error("Erro ao converter", {
          description: result.error,
        });
      }
      setShowConfirmConvert(false);
    });
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest('[role="button"]')
    ) {
      return;
    }
    setShowViewModal(true);
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return null;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatArea = (value: number | null | undefined) => {
    if (value == null) return null;
    return `${value} m²`;
  };

  const formatPricePerSqm = (value: number | null | undefined) => {
    if (value == null) return null;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const isConverted = prospect.status === "converted";
  const status = statusConfig[prospect.status] ?? {
    label: prospect.status,
    variant: "secondary" as const,
    tooltip: "Status do lead",
  };

  const pricePerSqm = formatPricePerSqm(prospect.price_per_sqm);
  const area = formatArea(prospect.area_usable);
  const price = formatCurrency(prospect.asking_price);
  const condoFee = formatCurrency(prospect.condo_fee);
  const iptu = formatCurrency(prospect.iptu);

  return (
    <TooltipProvider delayDuration={300}>
      <Card
        className="group relative cursor-pointer overflow-hidden transition-all hover:shadow-lg"
        onClick={handleCardClick}
      >
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b bg-muted/30 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-base font-semibold">
                  {prospect.neighborhood || "Sem bairro"}
                </h3>
                {prospect.link && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={prospect.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
                        aria-label="Abrir anúncio original"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>Abrir anúncio original</TooltipContent>
                  </Tooltip>
                )}
              </div>
              {prospect.address && (
                <p className="mt-0.5 flex items-center gap-1 truncate text-sm font-medium text-foreground/80">
                  <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {prospect.address}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex flex-col items-end gap-0.5">
                <FlipScoreBadge
                  score={prospect.flip_score}
                  size="sm"
                  showLabel
                  version={prospect.flip_score_version ?? undefined}
                />
                {prospect.flip_score_version === "v1" && prospect.flip_score_breakdown?.economics && (
                  <span className="text-[10px] font-medium text-muted-foreground">
                    ROI {prospect.flip_score_breakdown.economics.roi.toFixed(0)}%
                  </span>
                )}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant={status.variant} className="cursor-default">
                    {status.label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>{status.tooltip}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-3 px-4 py-3">
            {/* Price & Area Row */}
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              {price && (
                <span className="text-xl font-bold text-primary">{price}</span>
              )}
              {pricePerSqm && (
                <span className="text-sm text-muted-foreground">
                  ({pricePerSqm}/m²)
                </span>
              )}
            </div>

            {/* Property Details Grid */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {area && (
                <div className="flex items-center gap-1.5" title="Área útil">
                  <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span>{area}</span>
                </div>
              )}
              {prospect.bedrooms != null && (
                <div className="flex items-center gap-1.5" title="Quartos">
                  <Bed className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span>{prospect.bedrooms}</span>
                </div>
              )}
              {prospect.bathrooms != null && (
                <div className="flex items-center gap-1.5" title="Banheiros">
                  <Bath className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span>{prospect.bathrooms}</span>
                </div>
              )}
              {prospect.parking != null && (
                <div className="flex items-center gap-1.5" title="Vagas">
                  <Car className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span>{prospect.parking}</span>
                </div>
              )}
            </div>

            {/* Additional Details */}
            <div className="flex flex-wrap gap-2 text-xs">
              {prospect.floor != null && (
                <span className="rounded-full bg-muted px-2 py-0.5">
                  {prospect.floor}º andar
                </span>
              )}
              {prospect.elevator && (
                <span className="rounded-full bg-muted px-2 py-0.5">
                  Elevador
                </span>
              )}
              <span className="rounded-full bg-muted px-2 py-0.5">
                Condomínio: {condoFee || <Tooltip><TooltipTrigger asChild><span className="text-muted-foreground/60">—</span></TooltipTrigger><TooltipContent>Não informado</TooltipContent></Tooltip>}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5">
                IPTU: {iptu || <Tooltip><TooltipTrigger asChild><span className="text-muted-foreground/60">—</span></TooltipTrigger><TooltipContent>Não informado</TooltipContent></Tooltip>}
              </span>
              {prospect.face && (
                <span className="rounded-full bg-muted px-2 py-0.5">
                  Face: {prospect.face}
                </span>
              )}
              {prospect.expected_sale_price != null && (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 font-medium text-primary">
                  ARV: {formatCurrency(prospect.expected_sale_price)}
                </span>
              )}
              {prospect.renovation_cost_estimate != null && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  Reforma: {formatCurrency(prospect.renovation_cost_estimate)}
                </span>
              )}
            </div>

            {/* Broker Info */}
            {(prospect.agency || prospect.broker_name || prospect.broker_phone) && (
              <div className="border-t pt-3 text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {prospect.agency && (
                    <span>
                      <span className="text-xs text-muted-foreground/70">Imobiliária: </span>
                      {prospect.agency}
                    </span>
                  )}
                  {prospect.broker_name && (
                    <span className="font-medium text-foreground">
                      <span className="text-xs font-normal text-muted-foreground/70">Corretor: </span>
                      {prospect.broker_name}
                    </span>
                  )}
                  {prospect.broker_phone && (
                    <a
                      href={`tel:${prospect.broker_phone}`}
                      className="flex items-center gap-1 text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Ligar para ${prospect.broker_phone}`}
                    >
                      <Phone className="h-3 w-3" aria-hidden="true" />
                      {prospect.broker_phone}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Comments */}
            {prospect.comments && (
              <p className="line-clamp-2 text-sm italic text-muted-foreground">
                &ldquo;{prospect.comments}&rdquo;
              </p>
            )}
          </div>

          {/* Actions Footer */}
          <div className="flex items-center justify-between gap-2 border-t bg-muted/20 px-4 py-2">
            {/* Left: Open button */}
            <Button
              size="sm"
              variant="default"
              onClick={() => setShowViewModal(true)}
              disabled={isPending}
              className="h-8 gap-1.5"
              aria-label="Abrir detalhes do prospect"
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              Abrir
            </Button>

            {/* Right: Convert + Delete */}
            <div className="flex items-center gap-2">
              {/* Convert button */}
              {!isConverted && (
                <>
                  {showConfirmConvert ? (
                    <div className="flex items-center gap-1">
                      <span className="mr-1 text-xs text-muted-foreground">
                        Converter?
                      </span>
                      <Button
                        size="sm"
                        onClick={handleConvert}
                        disabled={isPending}
                        className="h-7 px-2"
                      >
                        {isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                        ) : (
                          "Sim"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowConfirmConvert(false)}
                        disabled={isPending}
                        className="h-7 px-2"
                      >
                        Não
                      </Button>
                    </div>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowConfirmConvert(true)}
                          disabled={isPending}
                          className="h-8 gap-1.5"
                          aria-label="Converter prospect em imóvel"
                        >
                          <ArrowRightCircle className="h-4 w-4" aria-hidden="true" />
                          Converter
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Move este lead para Imóveis e inicia o fluxo de análise</TooltipContent>
                    </Tooltip>
                  )}
                </>
              )}

              {/* Delete button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDelete}
                    disabled={isPending}
                    className="h-8 text-muted-foreground hover:text-destructive"
                    aria-label="Remover lead"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Remover lead</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View/Edit Modal */}
      <ProspectViewModal
        prospect={prospect}
        open={showViewModal}
        onOpenChange={setShowViewModal}
        canAccessFlipScoreV1={canAccessFlipScoreV1}
      />
    </TooltipProvider>
  );
}
