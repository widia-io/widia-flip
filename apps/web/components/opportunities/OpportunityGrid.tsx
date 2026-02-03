"use client";

import type { Opportunity } from "@widia/shared";
import { OpportunityCard } from "./OpportunityCard";

interface OpportunityGridProps {
  opportunities: Opportunity[];
}

export function OpportunityGrid({ opportunities }: OpportunityGridProps) {
  if (opportunities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
        <p className="text-muted-foreground">Nenhuma oportunidade encontrada</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tente ajustar os filtros ou aguarde novas coletas
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {opportunities.map((opportunity) => (
        <OpportunityCard key={opportunity.id} opportunity={opportunity} />
      ))}
    </div>
  );
}
