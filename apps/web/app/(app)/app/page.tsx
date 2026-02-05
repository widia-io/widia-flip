import {
  ListWorkspacesResponseSchema,
  UserPreferencesSchema,
  type ListWorkspacesResponse,
  type UserPreferences,
} from "@widia/shared";

import { apiFetch } from "@/lib/apiFetch";
import { getDashboardAction } from "@/lib/actions/dashboard";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { getServerSession } from "@/lib/serverAuth";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { WorkspaceDashboard } from "@/components/WorkspaceDashboard";
import {
  WelcomeHero,
  OnboardingJourney,
  QuickActions,
  PlatformStats,
  ConceptExplainer,
  OtherWorkspaces,
  DashboardHeader,
} from "@/components/dashboard";

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
  const [workspacesRaw, preferences, activeWorkspaceId, session] =
    await Promise.all([
      apiFetch<ListWorkspacesResponse>("/api/v1/workspaces"),
      getUserPreferences(),
      getActiveWorkspaceId(),
      getServerSession(),
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

  // Calculate completed steps for onboarding
  const checklist = preferences?.onboarding_checklist || {
    created_workspace: false,
    added_prospect: false,
    calculated_score: false,
    converted_to_property: false,
  };
  const completedSteps = Object.values(checklist).filter(Boolean).length;
  const totalSteps = 4;

  // First-time user experience (no workspaces OR showing onboarding)
  const isFirstTimeExperience = !hasWorkspaces || showOnboarding;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* First-time user: Enhanced welcome experience */}
      {isFirstTimeExperience ? (
        <>
          {/* Welcome Hero */}
          <WelcomeHero
            userName={session?.user?.name}
            completedSteps={completedSteps}
            totalSteps={totalSteps}
          />

          {/* Onboarding Journey */}
          {showOnboarding && <OnboardingJourney checklist={checklist} />}

          {/* Concept Explainer - Educational content for first-time users */}
          <ConceptExplainer />

          {/* Quick Actions */}
          <QuickActions hasWorkspaces={hasWorkspaces} />

          {/* Platform Stats */}
          <PlatformStats />
        </>
      ) : (
        <>
          {/* Returning user: Standard dashboard */}
          <DashboardHeader workspaceName={workspace?.name || ""} />

          {/* Show compact onboarding if not completed */}
          {showOnboarding && (
            <OnboardingChecklist checklist={preferences.onboarding_checklist} />
          )}

          {/* Dashboard Content */}
          {dashboardData ? (
            <>
              {dashboardError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                  {dashboardError}
                </div>
              )}
              <WorkspaceDashboard
                data={dashboardData}
                workspaceSlug={workspace.id}
              />
            </>
          ) : dashboardError ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {dashboardError}
            </div>
          ) : null}
        </>
      )}

      {/* Workspace List - shown for users with multiple workspaces */}
      {hasWorkspaces && workspaces.items.length > 1 && (
        <OtherWorkspaces
          workspaces={workspaces.items}
          currentWorkspaceId={workspace?.id}
        />
      )}
    </div>
  );
}
