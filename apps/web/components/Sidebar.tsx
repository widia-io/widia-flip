"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Building2, FolderKanban, CreditCard, LineChart, Shield, MessageCircle, Users, CalendarCheck, FileText, DollarSign, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useSidebar } from "@/lib/hooks/useSidebar";
import { SUPPORT_WHATSAPP, SUPPORT_WHATSAPP_URL } from "@/components/WhatsAppButton";

const staticNavItems = [
  { href: "/app", label: "Dashboard", icon: Home, tourId: undefined },
  { href: "/app/opportunities", label: "Oportunidades", icon: Sparkles, tourId: undefined },
  { href: "/app/prospects", label: "Prospecção", icon: Search, tourId: "prospects-link" },
  { href: "/app/properties", label: "Imóveis", icon: Building2, tourId: "properties-link" },
  { href: "/app/schedule", label: "Cronograma", icon: CalendarCheck, tourId: undefined },
  { href: "/app/costs", label: "Custos", icon: DollarSign, tourId: undefined },
  { href: "/app/documents", label: "Documentos", icon: FileText, tourId: undefined },
  { href: "/app/snapshots", label: "Análises", icon: LineChart, tourId: "snapshots-link" },
  { href: "/app/suppliers", label: "Fornecedores", icon: Users, tourId: undefined },
  { href: "/app/workspaces", label: "Projetos", icon: FolderKanban, tourId: undefined },
];

function SidebarContent({ onNavigate, isAdmin }: { onNavigate?: () => void; isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-4">
        <Link href="/app" className="flex items-center gap-2" onClick={onNavigate}>
          <Logo size="full" iconSize={32} />
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {staticNavItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/app" && pathname.startsWith(item.href) && !pathname.includes("/billing"));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              data-tour={item.tourId}
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

        {/* Billing link - always visible */}
        <Link
          href="/app/billing"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname.startsWith("/app/billing")
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <CreditCard className="h-4 w-4" />
          Assinatura
        </Link>

        {/* Admin link - only show for admins */}
        {isAdmin && (
          <Link
            href="/app/admin"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname.startsWith("/app/admin")
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Shield className="h-4 w-4" />
            Admin
          </Link>
        )}
      </nav>

      {/* Support WhatsApp */}
      <div className="border-t border-border px-3 py-4">
        <a
          href={SUPPORT_WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <MessageCircle className="h-4 w-4" />
          <div className="flex flex-col">
            <span>Suporte</span>
            <span className="text-xs opacity-70">{SUPPORT_WHATSAPP}</span>
          </div>
        </a>
      </div>
    </div>
  );
}

interface SidebarProps {
  isAdmin?: boolean;
}

export function Sidebar({ isAdmin }: SidebarProps) {
  const { isOpen, close } = useSidebar();

  return (
    <>
      {/* Mobile drawer */}
      <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent onNavigate={close} isAdmin={isAdmin} />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside
        data-tour="sidebar"
        className="hidden lg:flex h-full w-64 flex-col border-r border-border bg-background"
      >
        <SidebarContent isAdmin={isAdmin} />
      </aside>
    </>
  );
}
