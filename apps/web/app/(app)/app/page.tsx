import { Plus } from "lucide-react";
import {
  ListWorkspacesResponseSchema,
  type ListWorkspacesResponse,
} from "@widia/shared";

import { createWorkspaceAction } from "@/lib/actions/workspaces";
import { apiFetch } from "@/lib/apiFetch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Bem-vindo ao Widia Flip
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Status do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">API:</span>
            <Badge variant="default" className="bg-primary">
              {health.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspaces</CardTitle>
          <CardDescription>
            Gerencie seus espaços de trabalho
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <form action={createWorkspaceAction} className="flex gap-2">
            <Input
              name="name"
              placeholder="Nome do workspace (ex: Meus Flips)"
              className="flex-1"
            />
            <Button type="submit">
              <Plus className="h-4 w-4 mr-1" />
              Criar
            </Button>
          </form>

          <div className="mt-4 divide-y divide-border rounded-lg border border-border">
            {workspaces.items.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                Nenhum workspace ainda. Crie o primeiro acima.
              </div>
            ) : (
              workspaces.items.map((ws) => (
                <div key={ws.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium">{ws.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{ws.id}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
