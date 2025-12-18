import Link from "next/link";

import { PropertyTabs } from "@/components/PropertyTabs";
import { getPropertyAction } from "@/lib/actions/properties";

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
        <div className="rounded-lg border border-red-900/60 bg-red-950/50 p-8 text-center">
          <h2 className="text-lg font-semibold text-red-200">
            Imóvel não encontrado
          </h2>
          <p className="mt-2 text-sm text-red-300">
            {result.error || "O imóvel solicitado não existe ou você não tem acesso."}
          </p>
          <Link
            href="/app/properties"
            className="mt-4 inline-block rounded-md border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-neutral-100 hover:bg-neutral-800"
          >
            Voltar para Imóveis
          </Link>
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
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <Link href="/app/properties" className="hover:text-neutral-200">
              Imóveis
            </Link>
            <span>/</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-neutral-100">
            {displayName}
          </h1>
          {property.neighborhood && property.address && (
            <p className="text-sm text-neutral-400">{property.neighborhood}</p>
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

  const colors: Record<string, string> = {
    prospecting: "bg-blue-900/50 text-blue-300",
    analyzing: "bg-yellow-900/50 text-yellow-300",
    bought: "bg-green-900/50 text-green-300",
    renovation: "bg-orange-900/50 text-orange-300",
    for_sale: "bg-purple-900/50 text-purple-300",
    sold: "bg-emerald-900/50 text-emerald-300",
    archived: "bg-neutral-800 text-neutral-400",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${colors[status] || "bg-neutral-800 text-neutral-400"}`}
    >
      {labels[status] || status}
    </span>
  );
}
