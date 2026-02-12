"use client";

import type { Opportunity, OpportunityStatus } from "@widia/shared";
import { ExternalLink } from "lucide-react";

import { OpportunityStatusControl } from "./OpportunityStatusControl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface OpportunityTableProps {
  opportunities: Opportunity[];
  onStatusUpdated: (id: string, status: OpportunityStatus) => void;
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function formatDate(dateValue: string): string {
  return new Date(dateValue).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function OpportunityTable({ opportunities, onStatusUpdated }: OpportunityTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/80">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Score</TableHead>
            <TableHead>Localização</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead>R$/m²</TableHead>
            <TableHead>Área</TableHead>
            <TableHead>Quartos</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Atualizado</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {opportunities.map((opportunity) => (
            <TableRow key={opportunity.id}>
              <TableCell className="font-semibold">{opportunity.score}</TableCell>
              <TableCell className="min-w-[240px]">
                <div className="font-medium">{opportunity.neighborhood ?? "-"}</div>
                <div className="text-xs text-muted-foreground">
                  {[opportunity.city, opportunity.state?.toUpperCase()].filter(Boolean).join(" - ") || "-"}
                </div>
              </TableCell>
              <TableCell>{formatPrice(opportunity.price_cents)}</TableCell>
              <TableCell>
                {opportunity.price_per_m2
                  ? `R$ ${Math.round(opportunity.price_per_m2).toLocaleString("pt-BR")}`
                  : "-"}
              </TableCell>
              <TableCell>{opportunity.area_m2 ? `${opportunity.area_m2}m²` : "-"}</TableCell>
              <TableCell>{opportunity.bedrooms ?? "-"}</TableCell>
              <TableCell>
                <OpportunityStatusControl
                  opportunityId={opportunity.id}
                  status={opportunity.status}
                  onUpdated={(status) => onStatusUpdated(opportunity.id, status)}
                  compact
                />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatDate(opportunity.last_seen_at)}
              </TableCell>
              <TableCell className="text-right">
                <a
                  href={opportunity.canonical_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Abrir
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
