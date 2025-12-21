import type { ReactNode } from "react";

import { redirect } from "next/navigation";
import { ListWorkspacesResponseSchema } from "@widia/shared";

import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { getServerSession } from "@/lib/serverAuth";
import { apiFetch } from "@/lib/apiFetch";
import { getActiveWorkspaceId } from "@/lib/workspace";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  // Fetch user's workspaces
  const workspacesRaw = await apiFetch<{ items: { id: string; name: string }[] }>(
    "/api/v1/workspaces",
  );
  const workspaces = ListWorkspacesResponseSchema.parse(workspacesRaw);

  // Get active workspace from cookie
  let activeWorkspaceId = await getActiveWorkspaceId();
  
  // If no active workspace or it doesn't exist in the list, use the first one
  // (The cookie will be set when the user interacts with the selector)
  if (workspaces.items.length > 0) {
    const workspaceIds = workspaces.items.map((ws) => ws.id);
    if (!activeWorkspaceId || !workspaceIds.includes(activeWorkspaceId)) {
      activeWorkspaceId = workspaces.items[0].id;
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header 
          userEmail={session.user.email}
          workspaces={workspaces.items}
          activeWorkspaceId={activeWorkspaceId}
        />
        <main className="flex-1 px-4 py-6">{children}</main>
      </div>
    </div>
  );
}


