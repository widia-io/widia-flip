import { ListWorkspacesResponseSchema } from "@widia/shared";
import Link from "next/link";

import { apiFetch } from "@/lib/apiFetch";
import { listWorkspaceSnapshotsAction } from "@/lib/actions/snapshots";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SnapshotsPageClient } from "@/components/snapshots/SnapshotsPageClient";

export default async function SnapshotsPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = (await props.searchParams) ?? {};

  const snapshotType =
    typeof searchParams.type === "string" ? searchParams.type : undefined;
  const statusPipeline =
    typeof searchParams.status === "string" ? searchParams.status : undefined;
  const propertySearch =
    typeof searchParams.search === "string" ? searchParams.search : undefined;

  const activeWorkspaceId = await getActiveWorkspaceId();

  const workspacesRaw = await apiFetch<{ items: { id: string; name: string }[] }>(
    "/api/v1/workspaces",
  );
  const workspaces = ListWorkspacesResponseSchema.parse(workspacesRaw);

  if (workspaces.items.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Card>
          <CardContent className="py-8 text-center">
            <h2 className="text-lg font-semibold">Crie seu primeiro projeto</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Você precisa criar um projeto para começar.
            </p>
            <Button asChild className="mt-4">
              <Link href="/app/workspaces">Criar projeto</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const validActiveWorkspace =
    activeWorkspaceId &&
    workspaces.items.some((ws) => ws.id === activeWorkspaceId);
  const workspace = validActiveWorkspace
    ? workspaces.items.find((ws) => ws.id === activeWorkspaceId)!
    : workspaces.items[0];
  const workspaceId = workspace.id;
  const workspaceName = workspace.name;

  const snapshotsResult = await listWorkspaceSnapshotsAction(workspaceId, {
    snapshot_type: snapshotType as "cash" | "financing" | "all" | undefined,
    status_pipeline: statusPipeline,
    property_search: propertySearch,
  });

  const snapshots = snapshotsResult.data?.items ?? [];
  const totalCount = snapshotsResult.data?.total_count ?? 0;
  const error = snapshotsResult.error;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Análises</h1>
          <p className="text-sm text-muted-foreground">{workspaceName}</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <SnapshotsPageClient
        snapshots={snapshots}
        totalCount={totalCount}
        initialFilters={{
          snapshot_type: snapshotType as "cash" | "financing" | "all" | undefined,
          status_pipeline: statusPipeline,
          property_search: propertySearch,
        }}
      />
    </div>
  );
}
