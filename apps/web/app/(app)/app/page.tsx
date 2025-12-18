import {
  ListWorkspacesResponseSchema,
  type ListWorkspacesResponse,
} from "@widia/shared";

import { createWorkspaceAction } from "@/lib/actions/workspaces";
import { apiFetch } from "@/lib/apiFetch";

export default async function AppHomePage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const error = typeof searchParams.error === "string" ? searchParams.error : "";

  const health = await apiFetch<{ status: string }>("/api/v1/health");
  const workspacesRaw = await apiFetch<ListWorkspacesResponse>("/api/v1/workspaces");
  const workspaces = ListWorkspacesResponseSchema.parse(workspacesRaw);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <section className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
        <div className="text-sm text-neutral-400">Go API</div>
        <div className="mt-1 text-lg font-semibold">
          Health: <span className="text-emerald-400">{health.status}</span>
        </div>
        <div className="mt-1 text-xs text-neutral-500">
          (A chamada é server-side via BFF: Next → Go com Bearer)
        </div>
      </section>

      <section className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-neutral-400">Tenant</div>
            <div className="mt-1 text-lg font-semibold">Workspaces</div>
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded-md border border-red-900/60 bg-red-950/50 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <form action={createWorkspaceAction} className="mt-4 flex gap-2">
          <input
            name="name"
            placeholder="Nome do workspace (ex: Bruno Flip)"
            className="flex-1 rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600"
          />
          <button
            type="submit"
            className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 hover:bg-neutral-800"
          >
            Criar
          </button>
        </form>

        <div className="mt-4 divide-y divide-neutral-900 rounded-md border border-neutral-900">
          {workspaces.items.length === 0 ? (
            <div className="p-4 text-sm text-neutral-400">
              Nenhum workspace ainda. Crie o primeiro acima.
            </div>
          ) : (
            workspaces.items.map((ws) => (
              <div key={ws.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium text-neutral-100">{ws.name}</div>
                  <div className="text-xs text-neutral-500">{ws.id}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}


