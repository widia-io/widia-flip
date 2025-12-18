import { getCashAnalysisAction, listCashSnapshotsAction } from "@/lib/actions/properties";
import { CashAnalysisForm } from "@/components/CashAnalysisForm";
import { CashSnapshotHistory } from "@/components/CashSnapshotHistory";

export default async function PropertyViabilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [analysisResult, snapshotsResult] = await Promise.all([
    getCashAnalysisAction(id),
    listCashSnapshotsAction(id),
  ]);

  if (analysisResult.error) {
    return (
      <div className="rounded-lg border border-red-900/60 bg-red-950/50 p-4 text-sm text-red-200">
        {analysisResult.error}
      </div>
    );
  }

  const analysis = analysisResult.data;
  const snapshots = snapshotsResult.data?.items ?? [];

  return (
    <div className="space-y-6">
      <CashAnalysisForm
        propertyId={id}
        initialInputs={analysis?.inputs}
        initialOutputs={analysis?.outputs}
      />

      <CashSnapshotHistory snapshots={snapshots} />
    </div>
  );
}
