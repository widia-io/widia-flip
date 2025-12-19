import { listCostsAction } from "@/lib/actions/costs";
import { CostsList } from "@/components/CostsList";

export default async function PropertyCostsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const costsResult = await listCostsAction(id);

  if (costsResult.error) {
    return (
      <div className="rounded-lg border border-red-900/60 bg-red-950/50 p-4 text-sm text-red-200">
        {costsResult.error}
      </div>
    );
  }

  const costs = costsResult.data;

  return (
    <div className="space-y-6">
      <CostsList
        propertyId={id}
        initialCosts={costs?.items ?? []}
        totalPlanned={costs?.total_planned ?? 0}
        totalPaid={costs?.total_paid ?? 0}
      />
    </div>
  );
}

