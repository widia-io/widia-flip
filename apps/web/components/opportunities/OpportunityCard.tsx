"use client";

import { useState } from "react";
import type { Opportunity, OpportunityStatus } from "@widia/shared";
import { ExternalLink, Bed, Bath, Car, Ruler, MapPin, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OpportunityDetailModal } from "./OpportunityDetailModal";
import { OpportunityStatusControl } from "./OpportunityStatusControl";
import { cn } from "@/lib/utils";

interface OpportunityCardProps {
  opportunity: Opportunity;
  onStatusUpdated?: (status: OpportunityStatus) => void;
}

function formatPrice(cents: number): string {
  const value = cents / 100;
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}K`;
  }
  return `R$ ${value.toFixed(0)}`;
}

function getScoreColor(score: number): string {
  if (score >= 70) return "bg-green-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function getScoreLabel(score: number): string {
  if (score >= 70) return "Excelente";
  if (score >= 50) return "Bom";
  return "Regular";
}

export function OpportunityCard({ opportunity, onStatusUpdated }: OpportunityCardProps) {
  const [showDetail, setShowDetail] = useState(false);

  const discountPct = opportunity.discount_pct
    ? Math.round(opportunity.discount_pct * 100)
    : null;

  return (
    <>
      <Card
        className="cursor-pointer transition-shadow hover:shadow-md"
        onClick={() => setShowDetail(true)}
      >
        <CardContent className="p-4">
          {/* Header with Score */}
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="line-clamp-2 text-sm font-medium leading-tight">
                {opportunity.title || "Imóvel sem título"}
              </h3>
              {opportunity.neighborhood && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {opportunity.neighborhood}
                </p>
              )}
            </div>
            <Badge
              className={cn(
                "shrink-0 text-white",
                getScoreColor(opportunity.score)
              )}
            >
              {opportunity.score}
            </Badge>
          </div>

          <div
            className="mb-3"
            onClick={(event) => event.stopPropagation()}
            role="presentation"
          >
            <OpportunityStatusControl
              opportunityId={opportunity.id}
              status={opportunity.status}
              onUpdated={onStatusUpdated}
              compact
            />
          </div>

          {/* Price */}
          <div className="mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold">
                {formatPrice(opportunity.price_cents)}
              </span>
              {discountPct !== null && discountPct > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-green-600">
                  <TrendingDown className="h-3 w-3" />
                  {discountPct}% abaixo
                </span>
              )}
            </div>
            {opportunity.price_per_m2 && (
              <p className="text-xs text-muted-foreground">
                R$ {opportunity.price_per_m2.toFixed(0)}/m²
              </p>
            )}
          </div>

          {/* Features */}
          <div className="mb-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {opportunity.area_m2 && (
              <span className="flex items-center gap-1">
                <Ruler className="h-3 w-3" />
                {opportunity.area_m2}m²
              </span>
            )}
            {opportunity.bedrooms && (
              <span className="flex items-center gap-1">
                <Bed className="h-3 w-3" />
                {opportunity.bedrooms}
              </span>
            )}
            {opportunity.bathrooms && (
              <span className="flex items-center gap-1">
                <Bath className="h-3 w-3" />
                {opportunity.bathrooms}
              </span>
            )}
            {opportunity.parking_spots && (
              <span className="flex items-center gap-1">
                <Car className="h-3 w-3" />
                {opportunity.parking_spots}
              </span>
            )}
          </div>

          {/* Score breakdown hint */}
          <div className="mb-3 text-xs text-muted-foreground">
            <span className="font-medium">{getScoreLabel(opportunity.score)}</span>
            {opportunity.score_breakdown.discount > 0 && (
              <span> • Desconto +{opportunity.score_breakdown.discount}</span>
            )}
            {opportunity.score_breakdown.keywords > 0 && (
              <span> • Reform +{opportunity.score_breakdown.keywords}</span>
            )}
          </div>

          {/* Action */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              window.open(opportunity.canonical_url, "_blank");
            }}
          >
            <ExternalLink className="mr-2 h-3 w-3" />
            Ver no ZAP
          </Button>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <OpportunityDetailModal
        opportunity={opportunity}
        open={showDetail}
        onOpenChange={setShowDetail}
        onStatusUpdated={onStatusUpdated}
      />
    </>
  );
}
