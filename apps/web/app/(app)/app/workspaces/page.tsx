import { Plus, FolderKanban, Calendar, MapPin, Users, Settings, HelpCircle } from "lucide-react";
import Link from "next/link";
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

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function WorkspacesPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const error = typeof searchParams.error === "string" ? searchParams.error : "";

  const workspacesRaw = await apiFetch<ListWorkspacesResponse>("/api/v1/workspaces");
  const workspaces = ListWorkspacesResponseSchema.parse(workspacesRaw);

  const hasWorkspaces = workspaces.items.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      {/* Hero Educativo */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 via-background to-background p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Meus Projetos</h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Projetos são espaços de trabalho separados para organizar seus flips. 
              Use para separar por ano, região ou tipo de investimento.
            </p>
          </div>
          <div className="hidden rounded-full bg-primary/10 p-3 sm:block">
            <FolderKanban className="h-6 w-6 text-primary" />
          </div>
        </div>

        {/* Cards de Exemplo */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/50 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
              <Calendar className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Flips 2025</p>
              <p className="text-xs text-muted-foreground">Organize por período</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/50 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
              <MapPin className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Zona Sul SP</p>
              <p className="text-xs text-muted-foreground">Separe por região</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/50 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
              <Users className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Parceria João</p>
              <p className="text-xs text-muted-foreground">Isole negócios com sócios</p>
            </div>
          </div>
        </div>

        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <HelpCircle className="h-3.5 w-3.5" />
          Cada projeto tem seus próprios imóveis, prospects e configurações
        </p>
      </div>

      {/* Criar Novo Projeto */}
      <Card>
        <CardHeader>
          <CardTitle>Criar Novo Projeto</CardTitle>
          <CardDescription>
            Dê um nome descritivo para facilitar a organização
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
              placeholder="Ex: Flips 2025, Zona Sul, Parceria João..."
              className="flex-1"
            />
            <Button type="submit">
              <Plus className="mr-1 h-4 w-4" />
              Criar projeto
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de Projetos */}
      <Card>
        <CardHeader>
          <CardTitle>Seus Projetos</CardTitle>
          <CardDescription>
            {hasWorkspaces 
              ? `Você tem ${workspaces.items.length} projeto${workspaces.items.length > 1 ? "s" : ""}`
              : "Você ainda não tem nenhum projeto"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasWorkspaces ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <FolderKanban className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="mt-4 font-medium">Crie seu primeiro projeto</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Um projeto agrupa todos os imóveis, análises e documentos de uma operação de flip.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border">
              {workspaces.items.map((ws) => (
                <div
                  key={ws.id}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FolderKanban className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{ws.name}</span>
                        {ws.membership?.role === "owner" ? (
                          <Badge variant="secondary" className="text-xs">
                            Proprietário
                          </Badge>
                        ) : ws.membership?.role === "member" ? (
                          <Badge variant="outline" className="text-xs">
                            Membro
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Criado em {formatDate(ws.created_at)}
                      </p>
                    </div>
                  </div>
                  <Link href={`/app/workspaces/${ws.id}/settings`}>
                    <Button variant="ghost" size="icon">
                      <Settings className="h-4 w-4" />
                      <span className="sr-only">Configurações</span>
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

