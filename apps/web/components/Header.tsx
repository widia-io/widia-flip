import { LogOut } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

function getInitials(email: string): string {
  const name = email.split("@")[0];
  return name.substring(0, 2).toUpperCase();
}

export function Header(props: { userEmail: string }) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
          {getInitials(props.userEmail)}
        </div>
        <span className="text-sm text-muted-foreground">{props.userEmail}</span>
      </div>

      <form action={signOutAction}>
        <Button variant="ghost" size="sm" type="submit">
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </form>
    </header>
  );
}


