import { Building2, Sparkles, Lightbulb } from "lucide-react";
import Link from "next/link";
import {
  ListWorkspacesResponseSchema,
  UserPreferencesSchema,
  type ListWorkspacesResponse,
  type UserPreferences,
} from "@widia/shared";

import { apiFetch } from "@/lib/apiFetch";
import { getDashboardAction } from "@/lib/actions/dashboard";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { CreateWorkspaceForm } from "@/components/CreateWorkspaceForm";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { WorkspaceDashboard } from "@/components/WorkspaceDashboard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

async function getUserPreferences(): Promise<UserPreferences | null> {
  try {
    const data = await apiFetch("/api/v1/user/preferences");
    const parsed = UserPreferencesSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export default async function AppHomePage() {
  const [workspacesRaw, preferences, activeWorkspaceId] = await Promise.all([
    apiFetch<ListWorkspacesResponse>("/api/v1/workspaces"),
    getUserPreferences(),
    getActiveWorkspaceId(),
  ]);

  const workspaces = ListWorkspacesResponseSchema.parse(workspacesRaw);
  const hasWorkspaces = workspaces.items.length > 0;

  // Show onboarding if not completed
  const showOnboarding = preferences && !preferences.onboarding_completed;

  // Get active workspace
  const validActiveWorkspace =
    activeWorkspaceId &&
    workspaces.items.some((ws) => ws.id === activeWorkspaceId);
  const workspace = validActiveWorkspace
    ? workspaces.items.find((ws) => ws.id === activeWorkspaceId)!
    : workspaces.items[0];

  // Fetch dashboard data if workspace exists
  let dashboardData = null;
  let dashboardError = null;
  if (workspace) {
    const result = await getDashboardAction(workspace.id);
    if (result.data) {
      dashboardData = result.data;
    } else {
      dashboardError = result.error;
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-semibold">
          {hasWorkspaces ? "Visao Geral" : "Bem-vindo ao Meu Flip!"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {hasWorkspaces
            ? workspace?.name
            : "Sua plataforma para analise de investimentos imobiliarios."}
        </p>
      </div>

      {/* Onboarding Checklist */}
      {showOnboarding && (
        <OnboardingChecklist checklist={preferences.onboarding_checklist} />
      )}

      {/* Dashboard Content or Empty State */}
      {hasWorkspaces && dashboardData ? (
        <>
          {dashboardError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {dashboardError}
            </div>
          )}
          <WorkspaceDashboard data={dashboardData} workspaceSlug={workspace.id} />
        </>
      ) : !hasWorkspaces ? (
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
              <div className="py-8 px-4">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                    <Sparkles className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium">Comece sua jornada</h3>
                  <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                    Crie seu primeiro projeto acima para comecar a gerenciar
                    seus flips imobiliarios.
                  </p>
                  <div className="mt-4 flex items-start gap-2 rounded-lg bg-primary/5 px-4 py-3 text-left max-w-sm">
                    <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <p className="text-xs text-muted-foreground">
                      <strong>Dica:</strong> Organize projetos por ano (ex:
                      &ldquo;Flips 2025&rdquo;), regiao ou tipo de parceria.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : dashboardError ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {dashboardError}
        </div>
      ) : null}

      {/* Workspace List (collapsed) */}
      {hasWorkspaces && workspaces.items.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Outros Projetos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border rounded-lg border border-border">
              {workspaces.items
                .filter((ws) => ws.id !== workspace?.id)
                .map((ws) => (
                  <Link
                    key={ws.id}
                    href={`/app/workspaces/${ws.id}/settings`}
                    className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="font-medium text-sm">{ws.name}</span>
                    </div>
                  </Link>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
