"use client";

import { useMemo } from "react";

import type { Property } from "@widia/shared";

import { Badge } from "@/components/ui/badge";
import { PropertyCard } from "@/components/PropertyCard";
import { cn } from "@/lib/utils";
import {
  PIPELINE_STAGES,
  getStatusConfig,
} from "@/lib/constants/property-status";

interface PropertyKanbanViewProps {
  readonly properties: Property[];
}

export function PropertyKanbanView({ properties }: PropertyKanbanViewProps) {
  const columns = useMemo(() => {
    const grouped: Record<string, Property[]> = {};
    for (const status of PIPELINE_STAGES) {
      grouped[status] = properties.filter((p) => p.status_pipeline === status);
    }
    return grouped;
  }, [properties]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0">
      {PIPELINE_STAGES.map((status) => {
        const config = getStatusConfig(status);
        const items = columns[status] || [];
        const StatusIcon = config.icon;

        return (
          <div
            key={status}
            className="flex-shrink-0 w-72 rounded-lg bg-muted/30 p-3"
          >
            {/* Column header */}
            <div className="flex items-center gap-2 mb-3">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded",
                  config.color
                )}
              >
                <StatusIcon className={cn("h-3.5 w-3.5", config.textColor)} />
              </div>
              <span className="font-medium text-sm">{config.label}</span>
              <Badge variant="secondary" className="ml-auto text-xs">
                {items.length}
              </Badge>
            </div>

            {/* Cards */}
            <div className="space-y-2">
              {items.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum imóvel
                </div>
              ) : (
                items.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    compact
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
