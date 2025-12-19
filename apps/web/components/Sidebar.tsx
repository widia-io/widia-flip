"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/app", label: "Dashboard", icon: Home },
    { href: "/app/prospects", label: "Prospecção", icon: Search },
    { href: "/app/properties", label: "Imóveis", icon: Building2 },
  ];

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-background">
      <div className="border-b border-border px-4 py-4">
        <Link href="/app" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">W</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">Widia Flip</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/app" && pathname.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
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
      </nav>
    </aside>
  );
}


