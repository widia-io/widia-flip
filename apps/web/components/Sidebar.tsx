"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Building2, FolderKanban, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useSidebar } from "@/lib/hooks/useSidebar";

const staticNavItems = [
  { href: "/app", label: "Dashboard", icon: Home },
  { href: "/app/prospects", label: "Prospecção", icon: Search },
  { href: "/app/properties", label: "Imóveis", icon: Building2 },
  { href: "/app/workspaces", label: "Projetos", icon: FolderKanban },
];

function SidebarContent({ onNavigate, activeWorkspaceId }: { onNavigate?: () => void; activeWorkspaceId?: string }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-4">
        <Link href="/app" className="flex items-center gap-2" onClick={onNavigate}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">W</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">Widia Flip</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {staticNavItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/app" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {/* Billing link - only show if workspace is selected */}
        {activeWorkspaceId && (
          <Link
            href={`/app/workspaces/${activeWorkspaceId}/billing`}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname.includes("/billing")
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <CreditCard className="h-4 w-4" />
            Faturamento
          </Link>
        )}
      </nav>
    </div>
  );
}

interface SidebarProps {
  activeWorkspaceId?: string;
}

export function Sidebar({ activeWorkspaceId }: SidebarProps) {
  const { isOpen, close } = useSidebar();

  return (
    <>
      {/* Mobile drawer */}
      <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent onNavigate={close} activeWorkspaceId={activeWorkspaceId} />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex h-full w-64 flex-col border-r border-border bg-background">
        <SidebarContent activeWorkspaceId={activeWorkspaceId} />
      </aside>
    </>
  );
}
