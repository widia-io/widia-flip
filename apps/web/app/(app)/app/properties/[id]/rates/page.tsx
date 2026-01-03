import { getPropertyRatesAction } from "@/lib/actions/propertyRates";
import { PropertyRatesForm } from "@/components/PropertyRatesForm";

export default async function PropertyRatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = await getPropertyRatesAction(id);

  if (result.error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {result.error}
      </div>
    );
  }

  return <PropertyRatesForm propertyId={id} initialRates={result.data!} />;
}
