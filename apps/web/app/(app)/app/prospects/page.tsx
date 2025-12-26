import Link from "next/link";
import { ListWorkspacesResponseSchema } from "@widia/shared";

import { ProspectGrid } from "@/components/ProspectGrid";
import { apiFetch } from "@/lib/apiFetch";
import { listProspectsAction } from "@/lib/actions/prospects";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getActiveWorkspaceId } from "@/lib/workspace";

export default async function ProspectsPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const statusFilter =
    typeof searchParams.status === "string" ? searchParams.status : undefined;
  const searchQuery =
    typeof searchParams.q === "string" ? searchParams.q : undefined;

  // Get active workspace from cookie
  const activeWorkspaceId = await getActiveWorkspaceId();
  
  // Fetch workspaces to get the name and validate
  const workspacesRaw = await apiFetch<{ items: { id: string; name: string }[] }>(
    "/api/v1/workspaces",
  );
  const workspaces = ListWorkspacesResponseSchema.parse(workspacesRaw);

  if (workspaces.items.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="py-8 text-center">
            <h2 className="text-lg font-semibold">
              Crie seu primeiro projeto
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Você precisa criar um projeto para começar a prospectar imóveis.
            </p>
            <Button asChild className="mt-4">
              <Link href="/app/workspaces">Criar projeto</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use active workspace if it exists, otherwise fallback to first
  const validActiveWorkspace = activeWorkspaceId && workspaces.items.some(ws => ws.id === activeWorkspaceId);
  const workspace = validActiveWorkspace
    ? workspaces.items.find(ws => ws.id === activeWorkspaceId)!
    : workspaces.items[0];
  const workspaceId = workspace.id;
  const workspaceName = workspace.name;

  const prospectsResult = await listProspectsAction(workspaceId, {
    status: statusFilter,
    q: searchQuery,
  });

  const prospects = prospectsResult.data?.items ?? [];
  const error = prospectsResult.error;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Prospecção
          </h1>
          <p className="text-sm text-muted-foreground">{workspaceName}</p>
        </div>
      </div>

      {/* Error State */}
      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {/* Main Content */}
      <ProspectGrid
        prospects={prospects}
        workspaceId={workspaceId}
        statusFilter={statusFilter}
        searchQuery={searchQuery}
      />
    </div>
  );
}
