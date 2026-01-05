import type { ReactNode } from "react";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ListWorkspacesResponseSchema, UserPreferencesSchema, AdminStatusResponseSchema, UserEntitlementsSchema, type UserEntitlements } from "@widia/shared";

import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { PaywallProvider } from "@/components/PaywallModal";
import { FeatureTourWrapper } from "@/components/FeatureTourWrapper";
import { SidebarProvider } from "@/lib/hooks/useSidebar";
import { getServerSession } from "@/lib/serverAuth";
import { apiFetch } from "@/lib/apiFetch";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { auth } from "@/lib/auth";

async function getUserPreferences() {
  try {
    const data = await apiFetch("/api/v1/user/preferences");
    const parsed = UserPreferencesSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function getAdminStatus() {
  try {
    const data = await apiFetch("/api/v1/user/admin-status");
    const parsed = AdminStatusResponseSchema.safeParse(data);
    return parsed.success ? parsed.data.isAdmin : false;
  } catch {
    return false;
  }
}

async function getUserEntitlements(): Promise<UserEntitlements | null> {
  try {
    const data = await apiFetch<UserEntitlements>("/api/v1/billing/me");
    return UserEntitlementsSchema.parse(data);
  } catch {
    return null;
  }
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  // Fetch user's workspaces, preferences, admin status, and entitlements in parallel
  let workspacesRaw: { items: { id: string; name: string }[] };
  let preferences: Awaited<ReturnType<typeof getUserPreferences>> = null;
  let isAdmin = false;
  let entitlements: UserEntitlements | null = null;

  try {
    [workspacesRaw, preferences, isAdmin, entitlements] = await Promise.all([
      apiFetch<{ items: { id: string; name: string }[] }>("/api/v1/workspaces"),
      getUserPreferences(),
      getAdminStatus(),
      getUserEntitlements(),
    ]);
  } catch (error) {
    // Token missing/expired - clear session and redirect to login
    if (error instanceof Error &&
        (error.message.includes("NO_ACCESS_TOKEN") || error.message.includes("UNAUTHORIZED"))) {
      await auth.api.signOut({ headers: await headers() });
      redirect("/login");
    }
    throw error;
  }
  const workspaces = ListWorkspacesResponseSchema.parse(workspacesRaw);

  // Get active workspace from cookie
  let activeWorkspaceId = await getActiveWorkspaceId();

  // Validate activeWorkspaceId against user's actual workspaces
  // If no workspaces or invalid ID, clear it
  if (workspaces.items.length > 0) {
    const workspaceIds = workspaces.items.map((ws) => ws.id);
    if (!activeWorkspaceId || !workspaceIds.includes(activeWorkspaceId)) {
      activeWorkspaceId = workspaces.items[0].id;
    }
  } else {
    // No workspaces - don't use stale cookie value
    activeWorkspaceId = null;
  }

  // Auto-start feature tour for new users who haven't completed it
  // If preferences is null (new user) or feature_tour_completed is false, show tour
  const shouldAutoStartTour = !preferences || !preferences.feature_tour_completed;

  return (
    <PaywallProvider>
      <SidebarProvider>
        <div className="flex min-h-screen bg-background text-foreground">
          <Sidebar isAdmin={isAdmin} />

          <div className="flex min-w-0 flex-1 flex-col">
            <Header
              userEmail={session.user.email}
              workspaces={workspaces.items}
              activeWorkspaceId={activeWorkspaceId}
              entitlements={entitlements}
            />
            <main className="flex-1 px-4 py-4 sm:py-6">{children}</main>
          </div>
        </div>

        {/* Feature Tour */}
        <FeatureTourWrapper autoStart={shouldAutoStartTour ?? false} />
      </SidebarProvider>
    </PaywallProvider>
  );
}
