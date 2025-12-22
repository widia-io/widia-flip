"use client";

import Link from "next/link";
import { MapPin, Maximize, Calendar } from "lucide-react";

import type { Property } from "@widia/shared";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PropertyCardProps {
  property: Property;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  prospecting: { label: "Prospecção", variant: "outline" },
  analyzing: { label: "Analisando", variant: "secondary" },
  bought: { label: "Comprado", variant: "default" },
  renovation: { label: "Reforma", variant: "secondary" },
  for_sale: { label: "À Venda", variant: "outline" },
  sold: { label: "Vendido", variant: "default" },
  archived: { label: "Arquivado", variant: "secondary" },
};

export function PropertyCard({ property }: PropertyCardProps) {
  const status = STATUS_CONFIG[property.status_pipeline] ?? {
    label: property.status_pipeline,
    variant: "secondary" as const,
  };

  const formatArea = (value: number | null | undefined) => {
    if (value == null) return "-";
    return `${value} m²`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/app/properties/${property.id}`}
            className="block font-medium text-foreground hover:text-primary hover:underline truncate"
          >
            {property.address || "Endereço não informado"}
          </Link>

          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {property.neighborhood && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {property.neighborhood}
              </span>
            )}
            {property.area_usable && (
              <span className="flex items-center gap-1">
                <Maximize className="h-3 w-3" />
                {formatArea(property.area_usable)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(property.created_at)}
            </span>
          </div>
        </div>

        <Badge variant={status.variant} className="shrink-0">
          {status.label}
        </Badge>
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <Button size="sm" variant="outline" className="w-full" asChild>
          <Link href={`/app/properties/${property.id}`}>
            Abrir
          </Link>
        </Button>
      </div>
    </Card>
  );
}
