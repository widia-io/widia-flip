"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Banknote,
  Building,
  Percent,
  CalendarDays,
  Receipt,
  FileText,
  Clock,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PropertyTabsProps {
  propertyId: string;
  hasProspectOrigin: boolean;
}

export function PropertyTabs({ propertyId, hasProspectOrigin }: PropertyTabsProps) {
  const pathname = usePathname();
  const basePath = `/app/properties/${propertyId}`;

  const tabs = [
    { href: `${basePath}/overview`, label: "Visão Geral", icon: LayoutDashboard },
    { href: `${basePath}/viability`, label: "À Vista", icon: Banknote },
    { href: `${basePath}/financing`, label: "Financiamento", icon: Building },
    { href: `${basePath}/rates`, label: "Taxas", icon: Percent },
    { href: `${basePath}/schedule`, label: "Cronograma", icon: CalendarDays },
    { href: `${basePath}/costs`, label: "Custos", icon: Receipt },
    { href: `${basePath}/documents`, label: "Documentos", icon: FileText },
    { href: `${basePath}/timeline`, label: "Timeline", icon: Clock },
    ...(hasProspectOrigin
      ? [{ href: `${basePath}/prospect`, label: "Prospecção", icon: Search }]
      : []),
  ];

  return (
    <nav className="flex gap-1 border-b border-border overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors",
              isActive
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
