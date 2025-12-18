import { listTimelineEventsAction } from "@/lib/actions/timeline";
import { TimelineList } from "@/components/TimelineList";

export default async function PropertyTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await listTimelineEventsAction(id);

  if (result.error) {
    return (
      <div className="rounded-lg border border-red-900/60 bg-red-950/50 p-4 text-sm text-red-200">
        {result.error}
      </div>
    );
  }

  const events = result.data?.items ?? [];

  return <TimelineList events={events} />;
}
