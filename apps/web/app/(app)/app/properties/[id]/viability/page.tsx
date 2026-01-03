import { getPropertyAction, getCashAnalysisAction, listCashSnapshotsAction } from "@/lib/actions/properties";
import { CashAnalysisForm } from "@/components/CashAnalysisForm";
import { CashSnapshotHistory } from "@/components/CashSnapshotHistory";

export default async function PropertyViabilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [propertyResult, analysisResult, snapshotsResult] = await Promise.all([
    getPropertyAction(id),
    getCashAnalysisAction(id),
    listCashSnapshotsAction(id),
  ]);

  if (propertyResult.error) {
    return (
      <div className="rounded-lg border border-red-900/60 bg-red-950/50 p-4 text-sm text-red-200">
        {propertyResult.error}
      </div>
    );
  }

  if (analysisResult.error) {
    return (
      <div className="rounded-lg border border-red-900/60 bg-red-950/50 p-4 text-sm text-red-200">
        {analysisResult.error}
      </div>
    );
  }

  const property = propertyResult.data!;
  const analysis = analysisResult.data;
  const snapshots = snapshotsResult.data?.items ?? [];

  return (
    <div className="space-y-6">
      <CashAnalysisForm
        propertyId={id}
        workspaceId={property.workspace_id}
        initialInputs={analysis?.inputs}
        initialOutputs={analysis?.outputs}
        initialRates={analysis?.effective_rates}
      />

      <CashSnapshotHistory snapshots={snapshots} propertyId={id} />
    </div>
  );
}
