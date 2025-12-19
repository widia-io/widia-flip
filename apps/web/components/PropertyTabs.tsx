"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface PropertyTabsProps {
  propertyId: string;
  hasProspectOrigin: boolean;
}

export function PropertyTabs({ propertyId, hasProspectOrigin }: PropertyTabsProps) {
  const pathname = usePathname();
  const basePath = `/app/properties/${propertyId}`;

  const tabs = [
    { href: `${basePath}/overview`, label: "Visão Geral" },
    { href: `${basePath}/viability`, label: "À Vista" },
    { href: `${basePath}/financing`, label: "Financiamento" },
    { href: `${basePath}/costs`, label: "Custos" },
    { href: `${basePath}/documents`, label: "Documentos" },
    { href: `${basePath}/timeline`, label: "Timeline" },
    ...(hasProspectOrigin
      ? [{ href: `${basePath}/prospect`, label: "Prospecção" }]
      : []),
  ];

  return (
    <nav className="flex gap-1 border-b border-border overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors",
              isActive
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
