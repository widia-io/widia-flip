import { listScheduleAction } from "@/lib/actions/schedule";
import { getPropertyAction } from "@/lib/actions/properties";
import { ScheduleList } from "@/components/ScheduleList";

export default async function PropertySchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [scheduleResult, propertyResult] = await Promise.all([
    listScheduleAction(id),
    getPropertyAction(id),
  ]);

  if (scheduleResult.error) {
    return (
      <div className="rounded-lg border border-red-900/60 bg-red-950/50 p-4 text-sm text-red-200">
        {scheduleResult.error}
      </div>
    );
  }

  const schedule = scheduleResult.data;
  const workspaceId = propertyResult.data?.workspace_id ?? "";

  return (
    <div className="space-y-6">
      <ScheduleList
        propertyId={id}
        workspaceId={workspaceId}
        initialItems={schedule?.items ?? []}
        summary={schedule?.summary}
      />
    </div>
  );
}
