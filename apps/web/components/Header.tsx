import { LogOut } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WorkspaceSelector } from "@/components/WorkspaceSelector";

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
  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
          {getInitials(userEmail)}
        </div>
        <span className="text-sm text-muted-foreground">{userEmail}</span>
      </div>

      <div className="flex items-center gap-3">
        <WorkspaceSelector
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
        />
        <div className="h-6 w-px bg-border" />
        <ThemeToggle />
        <form action={signOutAction}>
          <Button variant="ghost" size="sm" type="submit">
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </form>
      </div>
    </header>
  );
}
