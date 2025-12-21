import Link from "next/link";
import { ListWorkspacesResponseSchema } from "@widia/shared";

import { PropertyTable } from "@/components/PropertyTable";
import { apiFetch } from "@/lib/apiFetch";
import { listPropertiesAction } from "@/lib/actions/properties";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function PropertiesPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const statusFilter =
    typeof searchParams.status_pipeline === "string"
      ? searchParams.status_pipeline
      : undefined;

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
              Você precisa criar um projeto para começar.
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

  const propertiesResult = await listPropertiesAction(workspaceId, {
    status_pipeline: statusFilter,
  });

  const properties = propertiesResult.data?.items ?? [];
  const error = propertiesResult.error;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Imóveis</h1>
          <p className="text-sm text-muted-foreground">{workspaceName}</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <PropertyTable
        properties={properties}
        statusFilter={statusFilter}
      />
    </div>
  );
}
