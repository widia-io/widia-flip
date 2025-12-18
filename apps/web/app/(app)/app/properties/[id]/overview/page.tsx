import { getPropertyAction } from "@/lib/actions/properties";
import { PropertyOverview } from "@/components/PropertyOverview";

export default async function PropertyOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPropertyAction(id);

  if (result.error || !result.data) {
    return (
      <div className="rounded-lg border border-red-900/60 bg-red-950/50 p-4 text-sm text-red-200">
        {result.error || "Erro ao carregar imóvel"}
      </div>
    );
  }

  return <PropertyOverview property={result.data} />;
}
