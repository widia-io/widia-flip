import { Building2, Search, Sparkles, Lightbulb } from "lucide-react";
import Link from "next/link";
import {
  ListWorkspacesResponseSchema,
  UserPreferencesSchema,
  type ListWorkspacesResponse,
  type UserPreferences,
} from "@widia/shared";

import { apiFetch } from "@/lib/apiFetch";
import { CreateWorkspaceForm } from "@/components/CreateWorkspaceForm";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
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
  const [workspacesRaw, preferences] = await Promise.all([
    apiFetch<ListWorkspacesResponse>("/api/v1/workspaces"),
    getUserPreferences(),
  ]);

  const workspaces = ListWorkspacesResponseSchema.parse(workspacesRaw);
  const hasWorkspaces = workspaces.items.length > 0;

  // Show onboarding if not completed
  const showOnboarding = preferences && !preferences.onboarding_completed;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-semibold">
          {hasWorkspaces ? "Olá!" : "Bem-vindo ao Meu Flip!"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {hasWorkspaces
            ? "Gerencie seus flips imobiliários de forma simples."
            : "Sua plataforma para análise de investimentos imobiliários."}
        </p>
      </div>

      {/* Onboarding Checklist */}
      {showOnboarding && (
        <OnboardingChecklist checklist={preferences.onboarding_checklist} />
      )}

      {/* Quick Actions */}
      {hasWorkspaces && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <Link href="/app/prospects">
            <Card className="transition-colors hover:border-primary/50 hover:shadow-sm">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Search className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Prospecção</CardTitle>
                  <CardDescription>
                    Encontre e analise oportunidades
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/app/properties">
            <Card className="transition-colors hover:border-primary/50 hover:shadow-sm">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Meus Imóveis</CardTitle>
                  <CardDescription>
                    Acompanhe seus investimentos
                  </CardDescription>
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
              <div className="py-8 px-4">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                    <Sparkles className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium">Comece sua jornada</h3>
                  <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                    Crie seu primeiro projeto acima para começar a gerenciar
                    seus flips imobiliários.
                  </p>
                  <div className="mt-4 flex items-start gap-2 rounded-lg bg-primary/5 px-4 py-3 text-left max-w-sm">
                    <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <p className="text-xs text-muted-foreground">
                      <strong>Dica:</strong> Organize projetos por ano (ex:
                      &ldquo;Flips 2025&rdquo;), região ou tipo de parceria.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              workspaces.items.map((ws) => (
                <Link
                  key={ws.id}
                  href={`/app/workspaces/${ws.id}/settings`}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="font-medium">{ws.name}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
