"use client";

import Link from "next/link";
import { useMemo } from "react";
import { MapPin, Maximize } from "lucide-react";

import type { Property } from "@widia/shared";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getStatusConfig,
  PIPELINE_STAGES,
} from "@/lib/constants/property-status";

interface PropertyCardProps {
  property: Property;
  compact?: boolean;
}

export function PropertyCard({ property, compact = false }: PropertyCardProps) {
  const statusConfig = getStatusConfig(property.status_pipeline);
  const StatusIcon = statusConfig.icon;

  const daysInStatus = useMemo(() => {
    const updated = new Date(property.updated_at);
    const now = new Date();
    return Math.floor(
      (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24)
    );
  }, [property.updated_at]);

  const formatArea = (value: number | null | undefined) => {
    if (value == null) return null;
    return `${value} m²`;
  };

  if (compact) {
    return (
      <Link href={`/app/properties/${property.id}`}>
        <Card className="p-3 cursor-pointer hover:shadow-md transition-shadow">
          <h4 className="font-medium truncate text-sm">
            {property.address || "Sem endereço"}
          </h4>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {property.neighborhood || "-"}
          </p>
          {property.area_usable && (
            <p className="text-xs text-muted-foreground">
              {formatArea(property.area_usable)}
            </p>
          )}
        </Card>
      </Link>
    );
  }

  return (
    <Card className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:border-primary/50">
      {/* Status-based header */}
      <div
        className={cn(
          "h-20 flex items-center justify-center",
          statusConfig.color
        )}
      >
        <StatusIcon
          className={cn("h-10 w-10 opacity-50", statusConfig.textColor)}
        />
      </div>

      <CardContent className="p-4">
        {/* Address + Badge */}
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/app/properties/${property.id}`}
            className="font-semibold truncate hover:text-primary hover:underline"
          >
            {property.address || "Sem endereço"}
          </Link>
          <Badge variant={statusConfig.variant} className="shrink-0">
            {statusConfig.label}
          </Badge>
        </div>

        {/* Neighborhood + Area */}
        <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
          {property.neighborhood && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              {property.neighborhood}
            </span>
          )}
          {property.area_usable && (
            <span className="flex items-center gap-1">
              <Maximize className="h-3 w-3 shrink-0" />
              {formatArea(property.area_usable)}
            </span>
          )}
        </div>

        {/* Progress indicator */}
        <div className="mt-4">
          <div className="flex gap-1">
            {PIPELINE_STAGES.map((stage, i) => (
              <div
                key={stage}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  i <= statusConfig.progressIndex ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {daysInStatus} {daysInStatus === 1 ? "dia" : "dias"} nesta etapa
          </p>
        </div>

        {/* Quick action on hover */}
        <div className="mt-3 pt-3 border-t opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="outline" className="w-full" asChild>
            <Link href={`/app/properties/${property.id}`}>Abrir</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
