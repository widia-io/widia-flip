"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, Ruler, Calendar, RefreshCw } from "lucide-react";

import type { Property } from "@widia/shared";
import { updatePropertyStatusAction } from "@/lib/actions/properties";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PropertyOverviewProps {
  property: Property;
}

const STATUS_OPTIONS = [
  { value: "prospecting", label: "Prospecção" },
  { value: "analyzing", label: "Analisando" },
  { value: "bought", label: "Comprado" },
  { value: "renovation", label: "Reforma" },
  { value: "for_sale", label: "À Venda" },
  { value: "sold", label: "Vendido" },
  { value: "archived", label: "Arquivado" },
];

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
            <RefreshCw className="h-4 w-4" />
            Etapa do Flip
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((option) => (
              <Button
                key={option.value}
                onClick={() => handleStatusChange(option.value)}
                disabled={isPending || property.status_pipeline === option.value}
                variant={property.status_pipeline === option.value ? "default" : "secondary"}
                size="sm"
                className={cn(
                  property.status_pipeline === option.value && "cursor-default"
                )}
              >
                {option.label}
              </Button>
            ))}
          </div>
          {isPending && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Atualizando...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Property Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhes do Imóvel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Endereço</p>
                <p className="text-sm font-medium">
                  {property.address || "Não informado"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Bairro</p>
                <p className="text-sm font-medium">
                  {property.neighborhood || "Não informado"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Ruler className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Área Útil</p>
                <p className="text-sm font-medium">
                  {formatArea(property.area_usable)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Adicionado em</p>
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
