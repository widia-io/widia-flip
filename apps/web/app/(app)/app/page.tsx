import { Building2, Search } from "lucide-react";
import Link from "next/link";
import {
  ListWorkspacesResponseSchema,
  type ListWorkspacesResponse,
} from "@widia/shared";

import { apiFetch } from "@/lib/apiFetch";
import { CreateWorkspaceForm } from "@/components/CreateWorkspaceForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function AppHomePage() {
  const workspacesRaw = await apiFetch<ListWorkspacesResponse>("/api/v1/workspaces");
  const workspaces = ListWorkspacesResponseSchema.parse(workspacesRaw);

  const hasWorkspaces = workspaces.items.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-semibold">Olá! 👋</h1>
        <p className="mt-1 text-muted-foreground">
          {hasWorkspaces
            ? "Gerencie seus flips imobiliários de forma simples."
            : "Crie seu primeiro projeto para começar."}
        </p>
      </div>

      {/* Quick Actions */}
      {hasWorkspaces && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <Link href="/app/prospects">
            <Card className="transition-colors hover:border-primary/50">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Search className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Prospecção</CardTitle>
                  <CardDescription>Encontre e analise oportunidades</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/app/properties">
            <Card className="transition-colors hover:border-primary/50">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Meus Imóveis</CardTitle>
                  <CardDescription>Acompanhe seus investimentos</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>
      )}

      {/* Projects Section */}
      <Card>
        <CardHeader>
          <CardTitle>Meus Projetos</CardTitle>
          <CardDescription>
            Organize seus flips em projetos separados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateWorkspaceForm />

          <div className="mt-4 divide-y divide-border rounded-lg border border-border">
            {workspaces.items.length === 0 ? (
              <div className="p-6 text-center">
                <Building2 className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Você ainda não tem nenhum projeto.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Crie um acima para começar a gerenciar seus flips.
                </p>
              </div>
            ) : (
              workspaces.items.map((ws) => (
                <div key={ws.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="font-medium">{ws.name}</span>
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
