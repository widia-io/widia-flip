"use client";

import { useEffect, useMemo, useState } from "react";
import type { Opportunity, OpportunityStatus } from "@widia/shared";
import { LayoutGrid, Table as TableIcon } from "lucide-react";

import { OpportunityCard } from "./OpportunityCard";
import { OpportunityTable } from "./OpportunityTable";
import { Button } from "@/components/ui/button";

interface OpportunityGridProps {
  opportunities: Opportunity[];
}

type OpportunityViewMode = "cards" | "table";

export function OpportunityGrid({ opportunities }: OpportunityGridProps) {
  const [view, setView] = useState<OpportunityViewMode>("cards");
  const [items, setItems] = useState(opportunities);

  useEffect(() => {
    setItems(opportunities);
  }, [opportunities]);

  useEffect(() => {
    const saved = localStorage.getItem("opportunity-view-mode");
    if (saved === "cards" || saved === "table") {
      setView(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("opportunity-view-mode", view);
  }, [view]);

  const hasItems = items.length > 0;

  const handleStatusUpdated = (id: string, status: OpportunityStatus) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
            }
          : item
      )
    );
  };

  const title = useMemo(() => {
    if (!hasItems) return "Nenhuma oportunidade encontrada";
    return `${items.length} oportunidades carregadas`;
  }, [hasItems, items.length]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">
            Cards para leitura rápida e tabela para triagem densa.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-card p-1">
          <Button
            type="button"
            variant={view === "cards" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("cards")}
          >
            <LayoutGrid className="mr-1.5 h-4 w-4" />
            Cards
          </Button>
          <Button
            type="button"
            variant={view === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("table")}
          >
            <TableIcon className="mr-1.5 h-4 w-4" />
            Tabela
          </Button>
        </div>
      </div>

      {!hasItems ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 py-12">
          <p className="text-muted-foreground">Nenhuma oportunidade encontrada</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajuste os filtros e tente novamente.
          </p>
        </div>
      ) : view === "table" ? (
        <OpportunityTable opportunities={items} onStatusUpdated={handleStatusUpdated} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              onStatusUpdated={(status) => handleStatusUpdated(opportunity.id, status)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
