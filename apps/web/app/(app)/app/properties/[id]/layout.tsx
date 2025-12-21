import Link from "next/link";

import { PropertyTabs } from "@/components/PropertyTabs";
import { getPropertyAction } from "@/lib/actions/properties";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function PropertyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPropertyAction(id);

  if (result.error || !result.data) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
          <h2 className="text-lg font-semibold text-destructive">
            Imóvel não encontrado
          </h2>
          <p className="mt-2 text-sm text-destructive/80">
            {result.error || "O imóvel solicitado não existe ou você não tem acesso."}
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/app/properties">Voltar para Imóveis</Link>
          </Button>
        </div>
      </div>
    );
  }

  const property = result.data;
  const displayName = property.address || property.neighborhood || `Imóvel ${property.id.slice(0, 8)}`;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/app/properties" className="hover:text-foreground transition-colors">
              Imóveis
            </Link>
            <span>/</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold">
            {displayName}
          </h1>
          {property.neighborhood && property.address && (
            <p className="text-sm text-muted-foreground">{property.neighborhood}</p>
          )}
        </div>
        <StatusBadge status={property.status_pipeline} />
      </div>

      {/* Tabs */}
      <PropertyTabs
        propertyId={id}
        hasProspectOrigin={!!property.origin_prospect_id}
      />

      {/* Content */}
      <div>{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    prospecting: "Prospecção",
    analyzing: "Analisando",
    bought: "Comprado",
    renovation: "Reforma",
    for_sale: "À Venda",
    sold: "Vendido",
    archived: "Arquivado",
  };

  const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    prospecting: "outline",
    analyzing: "secondary",
    bought: "default",
    renovation: "secondary",
    for_sale: "outline",
    sold: "default",
    archived: "secondary",
  };

  return (
    <Badge variant={variants[status] || "secondary"}>
      {labels[status] || status}
    </Badge>
  );
}
