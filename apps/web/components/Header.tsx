"use client";

import { LogOut, Menu, HelpCircle } from "lucide-react";
import { type UserEntitlements } from "@widia/shared";

import { signOutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WorkspaceSelector } from "@/components/WorkspaceSelector";
import { TierBadge } from "@/components/TierBadge";
import { useSidebar } from "@/lib/hooks/useSidebar";
import { useFeatureTour } from "@/components/FeatureTour";

function getInitials(email: string): string {
  const name = email.split("@")[0];
  return name.substring(0, 2).toUpperCase();
}

interface Workspace {
  id: string;
  name: string;
}

interface HeaderProps {
  userEmail: string;
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  entitlements: UserEntitlements | null;
}

export function Header({ userEmail, workspaces, activeWorkspaceId, entitlements }: HeaderProps) {
  const { toggle } = useSidebar();
  const { startTour } = useFeatureTour();

  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
      {/* Left side: menu toggle (mobile) + user info */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={toggle}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
          {getInitials(userEmail)}
        </div>
        <span className="hidden sm:inline text-sm text-muted-foreground">{userEmail}</span>
        <TierBadge entitlements={entitlements} />
      </div>

      {/* Right side: workspace selector + actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div data-tour="workspace-selector">
          <WorkspaceSelector
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
          />
        </div>
        <div className="hidden sm:block h-6 w-px bg-border" />
        <Button
          variant="ghost"
          size="icon"
          onClick={startTour}
          className="hidden lg:inline-flex"
          title="Ver tour do app"
        >
          <HelpCircle className="h-4 w-4" />
          <span className="sr-only">Ver tour</span>
        </Button>
        <ThemeToggle />
        <form action={signOutAction}>
          <Button variant="ghost" size="sm" type="submit" className="px-2 sm:px-3">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Sair</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
