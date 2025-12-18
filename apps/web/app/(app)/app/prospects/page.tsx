import { ListWorkspacesResponseSchema } from "@widia/shared";

import { ProspectTable } from "@/components/ProspectTable";
import { apiFetch } from "@/lib/apiFetch";
import { listProspectsAction } from "@/lib/actions/prospects";

export default async function ProspectsPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const statusFilter =
    typeof searchParams.status === "string" ? searchParams.status : undefined;
  const searchQuery =
    typeof searchParams.q === "string" ? searchParams.q : undefined;

  // Get user's first workspace (MVP: single workspace)
  const workspacesRaw = await apiFetch<{ items: { id: string; name: string }[] }>(
    "/api/v1/workspaces",
  );
  const workspaces = ListWorkspacesResponseSchema.parse(workspacesRaw);

  if (workspaces.items.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-8 text-center">
          <h2 className="text-lg font-semibold text-neutral-100">
            Nenhum workspace encontrado
          </h2>
          <p className="mt-2 text-sm text-neutral-400">
            Crie um workspace primeiro para começar a prospectar imóveis.
          </p>
          <a
            href="/app"
            className="mt-4 inline-block rounded-md border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-neutral-100 hover:bg-neutral-800"
          >
            Ir para Dashboard
          </a>
        </div>
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
          <h1 className="text-2xl font-semibold text-neutral-100">Prospecção</h1>
          <p className="text-sm text-neutral-400">{workspaceName}</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/50 p-4 text-sm text-red-200">
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
