"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  MapPin,
  Ruler,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Archive,
  Building2,
} from "lucide-react";

import type { Property } from "@widia/shared";
import { updatePropertyStatusAction } from "@/lib/actions/properties";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PropertyOverviewProps {
  property: Property;
}

const STATUS_LABELS: Record<string, string> = {
  prospecting: "Prospecção",
  analyzing: "Analisando",
  bought: "Comprado",
  renovation: "Reforma",
  for_sale: "À Venda",
  sold: "Vendido",
  archived: "Arquivado",
};

const STATUS_COLORS: Record<string, { bg: string; bar: string; text: string }> = {
  prospecting: { bg: "bg-slate-500/10", bar: "bg-slate-400", text: "text-slate-600" },
  analyzing: { bg: "bg-blue-500/10", bar: "bg-blue-500", text: "text-blue-600" },
  bought: { bg: "bg-purple-500/10", bar: "bg-purple-500", text: "text-purple-600" },
  renovation: { bg: "bg-amber-500/10", bar: "bg-amber-500", text: "text-amber-600" },
  for_sale: { bg: "bg-emerald-500/10", bar: "bg-emerald-500", text: "text-emerald-600" },
  sold: { bg: "bg-green-500/10", bar: "bg-green-500", text: "text-green-600" },
  archived: { bg: "bg-gray-500/10", bar: "bg-gray-400", text: "text-gray-500" },
};

const PIPELINE_ORDER = ["prospecting", "analyzing", "bought", "renovation", "for_sale", "sold"];

export function PropertyOverview({ property }: PropertyOverviewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: string) => {
    setError(null);
    startTransition(async () => {
      const result = await updatePropertyStatusAction(property.id, newStatus);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  const formatArea = (value: number | null | undefined) => {
    if (value == null) return "Não informada";
    return `${value} m²`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Status Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Etapa do Flip
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {PIPELINE_ORDER.map((status) => {
            const isActive = property.status_pipeline === status;
            const colors = STATUS_COLORS[status];
            return (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                disabled={isPending}
                className={cn(
                  "w-full flex items-center gap-3 py-2 px-3 -mx-3 rounded-lg transition-colors",
                  isActive ? colors.bg : "hover:bg-muted/50",
                  isPending && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className={cn(
                  "w-24 text-sm text-left transition-colors",
                  isActive ? colors.text : "text-muted-foreground"
                )}>
                  {STATUS_LABELS[status]}
                </span>
                <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      isActive ? colors.bar : "bg-transparent"
                    )}
                    style={{ width: isActive ? "100%" : "0%" }}
                  />
                </div>
                {isActive && <CheckCircle2 className={cn("h-4 w-4", colors.text)} />}
              </button>
            );
          })}

          {/* Archived - separate from main pipeline */}
          <div className="pt-2 mt-2 border-t">
            <button
              onClick={() => handleStatusChange("archived")}
              disabled={isPending}
              className={cn(
                "w-full flex items-center gap-3 py-2 px-3 -mx-3 rounded-lg transition-colors",
                property.status_pipeline === "archived"
                  ? STATUS_COLORS.archived.bg
                  : "hover:bg-muted/50",
                isPending && "opacity-50 cursor-not-allowed"
              )}
            >
              <Archive className={cn(
                "h-4 w-4",
                property.status_pipeline === "archived"
                  ? STATUS_COLORS.archived.text
                  : "text-muted-foreground"
              )} />
              <span className={cn(
                "text-sm text-left transition-colors",
                property.status_pipeline === "archived"
                  ? STATUS_COLORS.archived.text
                  : "text-muted-foreground"
              )}>
                Arquivado
              </span>
              {property.status_pipeline === "archived" && (
                <CheckCircle2 className="h-4 w-4 text-gray-500 ml-auto" />
              )}
            </button>
          </div>

          {isPending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Atualizando...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Property Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Detalhes do Imóvel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Endereço
                </p>
                <p className="text-sm font-medium truncate">
                  {property.address || "Não informado"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                <MapPin className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Bairro
                </p>
                <p className="text-sm font-medium truncate">
                  {property.neighborhood || "Não informado"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <Ruler className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Área Útil
                </p>
                <p className="text-sm font-medium">
                  {formatArea(property.area_usable)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <Calendar className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Adicionado em
                </p>
                <p className="text-sm font-medium">
                  {formatDate(property.created_at)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {property.origin_prospect_id && (
        <div className="rounded-lg bg-muted/50 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            ✨ Este imóvel foi criado a partir de uma prospecção.
          </p>
        </div>
      )}
    </div>
  );
}
