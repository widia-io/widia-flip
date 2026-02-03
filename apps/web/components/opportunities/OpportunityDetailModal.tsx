"use client";

import type { Opportunity } from "@widia/shared";
import { ExternalLink, Bed, Bath, Car, Ruler, MapPin, Building, Calendar, TrendingDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface OpportunityDetailModalProps {
  opportunity: Opportunity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getScoreColor(score: number): string {
  if (score >= 70) return "bg-green-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export function OpportunityDetailModal({
  opportunity,
  open,
  onOpenChange,
}: OpportunityDetailModalProps) {
  const discountPct = opportunity.discount_pct
    ? Math.round(opportunity.discount_pct * 100)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-8 text-lg leading-tight">
            {opportunity.title || "Imóvel sem título"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Score and Price Section */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold">
                  {formatPrice(opportunity.price_cents)}
                </span>
                <Badge
                  className={cn(
                    "text-white",
                    getScoreColor(opportunity.score)
                  )}
                >
                  Score {opportunity.score}
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {opportunity.price_per_m2 && (
                  <span>R$ {opportunity.price_per_m2.toFixed(0)}/m²</span>
                )}
                {discountPct !== null && discountPct > 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <TrendingDown className="h-4 w-4" />
                    {discountPct}% abaixo da mediana
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>
              {[opportunity.address, opportunity.neighborhood, opportunity.city, opportunity.state]
                .filter(Boolean)
                .join(", ")}
            </span>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {opportunity.area_m2 && (
              <div className="flex items-center gap-2 text-sm">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                <span>{opportunity.area_m2}m²</span>
              </div>
            )}
            {opportunity.bedrooms && (
              <div className="flex items-center gap-2 text-sm">
                <Bed className="h-4 w-4 text-muted-foreground" />
                <span>{opportunity.bedrooms} quartos</span>
              </div>
            )}
            {opportunity.bathrooms && (
              <div className="flex items-center gap-2 text-sm">
                <Bath className="h-4 w-4 text-muted-foreground" />
                <span>{opportunity.bathrooms} banheiros</span>
              </div>
            )}
            {opportunity.parking_spots && (
              <div className="flex items-center gap-2 text-sm">
                <Car className="h-4 w-4 text-muted-foreground" />
                <span>{opportunity.parking_spots} vagas</span>
              </div>
            )}
          </div>

          {/* Costs */}
          {(opportunity.condo_fee_cents || opportunity.iptu_cents) && (
            <div className="flex flex-wrap gap-4 text-sm">
              {opportunity.condo_fee_cents && (
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>Condomínio: {formatPrice(opportunity.condo_fee_cents)}</span>
                </div>
              )}
              {opportunity.iptu_cents && (
                <div className="flex items-center gap-2">
                  <span>IPTU: {formatPrice(opportunity.iptu_cents)}</span>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Score Breakdown */}
          <div>
            <h4 className="mb-3 text-sm font-medium">Breakdown do Score</h4>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div className="rounded-lg bg-muted p-2">
                <div className="text-xs text-muted-foreground">Desconto</div>
                <div className="font-medium">+{opportunity.score_breakdown.discount}</div>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <div className="text-xs text-muted-foreground">Área</div>
                <div className="font-medium">+{opportunity.score_breakdown.area}</div>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <div className="text-xs text-muted-foreground">Quartos</div>
                <div className="font-medium">+{opportunity.score_breakdown.bedrooms}</div>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <div className="text-xs text-muted-foreground">Vagas</div>
                <div className="font-medium">+{opportunity.score_breakdown.parking}</div>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <div className="text-xs text-muted-foreground">Reforma</div>
                <div className="font-medium">+{opportunity.score_breakdown.keywords}</div>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <div className="text-xs text-muted-foreground">Penalidades</div>
                <div className="font-medium text-red-500">
                  {opportunity.score_breakdown.penalties}
                </div>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <div className="text-xs text-muted-foreground">Tempo</div>
                <div className="font-medium">{opportunity.score_breakdown.decay}</div>
              </div>
              <div className="rounded-lg bg-primary/10 p-2">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="font-bold text-primary">{opportunity.score}</div>
              </div>
            </div>
          </div>

          {/* Description */}
          {opportunity.description && (
            <>
              <Separator />
              <div>
                <h4 className="mb-2 text-sm font-medium">Descrição</h4>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {opportunity.description}
                </p>
              </div>
            </>
          )}

          {/* Dates */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Visto em: {formatDate(opportunity.first_seen_at)}
            </span>
            {opportunity.first_seen_at !== opportunity.last_seen_at && (
              <span>Atualizado: {formatDate(opportunity.last_seen_at)}</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button asChild className="flex-1">
              <a
                href={opportunity.canonical_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Ver no ZAP
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
