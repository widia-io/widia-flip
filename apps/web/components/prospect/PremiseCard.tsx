"use client";

import { LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PremiseCardProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export function PremiseCard({
  title,
  icon: Icon,
  children,
  className,
}: PremiseCardProps) {
  return (
    <Card className={cn("h-fit", className)}>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">{children}</CardContent>
    </Card>
  );
}
