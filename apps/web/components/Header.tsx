"use client";

import { LogOut, Menu } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WorkspaceSelector } from "@/components/WorkspaceSelector";
import { useSidebar } from "@/lib/hooks/useSidebar";

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
}

export function Header({ userEmail, workspaces, activeWorkspaceId }: HeaderProps) {
  const { toggle } = useSidebar();

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
      </div>

      {/* Right side: workspace selector + actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        <WorkspaceSelector
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
        />
        <div className="hidden sm:block h-6 w-px bg-border" />
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
