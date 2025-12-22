import { ChevronRight, FolderKanban } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  WorkspaceSchema,
  WorkspaceSettingsSchema,
  type Workspace,
  type WorkspaceSettings,
} from "@widia/shared";

import { apiFetch } from "@/lib/apiFetch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { WorkspaceSettingsForm } from "./WorkspaceSettingsForm";
import { DangerZone } from "./DangerZone";

async function getWorkspace(id: string): Promise<Workspace | null> {
  try {
    const data = await apiFetch<Workspace>(`/api/v1/workspaces/${id}`);
    return WorkspaceSchema.parse(data);
  } catch {
    return null;
  }
}

async function getWorkspaceSettings(id: string): Promise<WorkspaceSettings | null> {
  try {
    const data = await apiFetch<WorkspaceSettings>(`/api/v1/workspaces/${id}/settings`);
    return WorkspaceSettingsSchema.parse(data);
  } catch {
    return null;
  }
}

export default async function WorkspaceSettingsPage(props: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await props.params;
  const searchParams = (await props.searchParams) ?? {};
  const error = typeof searchParams.error === "string" ? searchParams.error : "";
  const success = typeof searchParams.success === "string" ? searchParams.success : "";

  const [workspace, settings] = await Promise.all([
    getWorkspace(params.id),
    getWorkspaceSettings(params.id),
  ]);

  if (!workspace) {
    notFound();
  }

  const isOwner = workspace.membership?.role === "owner";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/app/workspaces" className="hover:text-foreground">
          Projetos
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{workspace.name}</span>
        <ChevronRight className="h-4 w-4" />
        <span>Configurações</span>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <FolderKanban className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">{workspace.name}</h1>
          <p className="text-sm text-muted-foreground">
            Configurações do projeto
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error === "invalid_workspace_name" 
            ? "Nome do projeto inválido. O nome não pode estar vazio."
            : error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          {success === "workspace_updated" 
            ? "Projeto atualizado com sucesso!"
            : success}
        </div>
      )}

      {/* Informações Gerais */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Projeto</CardTitle>
          <CardDescription>
            Altere o nome e outras configurações do seu projeto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkspaceSettingsForm 
            workspaceId={workspace.id}
            workspaceName={workspace.name}
            pjTaxRate={settings?.pj_tax_rate ?? 0}
            isOwner={isOwner}
          />
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {isOwner && (
        <DangerZone 
          workspaceId={workspace.id}
          workspaceName={workspace.name}
        />
      )}
    </div>
  );
}


