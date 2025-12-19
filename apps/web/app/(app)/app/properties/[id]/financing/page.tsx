import { getFinancingAction, listFinancingSnapshotsAction } from "@/lib/actions/financing";
import { FinancingForm } from "@/components/FinancingForm";
import { FinancingSnapshotHistory } from "@/components/FinancingSnapshotHistory";

export default async function PropertyFinancingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [financingResult, snapshotsResult] = await Promise.all([
    getFinancingAction(id),
    listFinancingSnapshotsAction(id),
  ]);

  if (financingResult.error) {
    return (
      <div className="rounded-lg border border-red-900/60 bg-red-950/50 p-4 text-sm text-red-200">
        {financingResult.error}
      </div>
    );
  }

  const financing = financingResult.data;
  const snapshots = snapshotsResult.data?.items ?? [];

  return (
    <div className="space-y-6">
      <FinancingForm
        propertyId={id}
        planId={financing?.plan_id}
        initialInputs={financing?.inputs}
        initialPayments={financing?.payments}
        initialOutputs={financing?.outputs}
      />

      <FinancingSnapshotHistory snapshots={snapshots} />
    </div>
  );
}
