"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    { href: `${basePath}/timeline`, label: "Timeline" },
    ...(hasProspectOrigin
      ? [{ href: `${basePath}/prospect`, label: "Prospecção" }]
      : []),
  ];

  return (
    <nav className="flex gap-1 border-b border-neutral-800">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              isActive
                ? "border-b-2 border-blue-500 text-blue-400"
                : "text-neutral-400 hover:text-neutral-100"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
