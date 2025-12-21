import Link from "next/link";
import { ListWorkspacesResponseSchema } from "@widia/shared";

import { ProspectTable } from "@/components/ProspectTable";
import { apiFetch } from "@/lib/apiFetch";
import { listProspectsAction } from "@/lib/actions/prospects";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ProspectsPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const statusFilter =
    typeof searchParams.status === "string" ? searchParams.status : undefined;
  const searchQuery =
    typeof searchParams.q === "string" ? searchParams.q : undefined;

  // Get user's first project (MVP: single workspace)
  const workspacesRaw = await apiFetch<{ items: { id: string; name: string }[] }>(
    "/api/v1/workspaces",
  );
  const workspaces = ListWorkspacesResponseSchema.parse(workspacesRaw);

  if (workspaces.items.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Card>
          <CardContent className="py-8 text-center">
            <h2 className="text-lg font-semibold">
              Crie seu primeiro projeto
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Você precisa criar um projeto para começar a prospectar imóveis.
            </p>
            <Button asChild className="mt-4">
              <Link href="/app">Criar projeto</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const workspaceId = workspaces.items[0].id;
  const workspaceName = workspaces.items[0].name;

  const prospectsResult = await listProspectsAction(workspaceId, {
    status: statusFilter,
    q: searchQuery,
  });

  const prospects = prospectsResult.data?.items ?? [];
  const error = prospectsResult.error;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Prospecção</h1>
          <p className="text-sm text-muted-foreground">{workspaceName}</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <ProspectTable
        prospects={prospects}
        workspaceId={workspaceId}
        statusFilter={statusFilter}
        searchQuery={searchQuery}
      />
    </div>
  );
}
