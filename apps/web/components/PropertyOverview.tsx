"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

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
    if (value == null) return "-";
    return `${value} m²`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Status Change */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Alterar Status
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
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Informações do Imóvel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Endereço</dt>
              <dd className="mt-1 text-sm">
                {property.address || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Bairro</dt>
              <dd className="mt-1 text-sm">
                {property.neighborhood || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Área Útil</dt>
              <dd className="mt-1 text-sm">
                {formatArea(property.area_usable)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">ID</dt>
              <dd className="mt-1 text-xs font-mono text-muted-foreground">
                {property.id}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Criado em</dt>
              <dd className="mt-1 text-sm">
                {formatDate(property.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Atualizado em</dt>
              <dd className="mt-1 text-sm">
                {formatDate(property.updated_at)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {property.origin_prospect_id && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Origem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Este imóvel foi convertido de uma prospecção.
            </p>
            <p className="mt-1 text-xs text-muted-foreground font-mono">
              Prospect ID: {property.origin_prospect_id}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
