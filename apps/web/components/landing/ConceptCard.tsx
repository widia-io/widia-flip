import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";

interface ConceptCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  highlight?: string;
}

export function ConceptCard({
  icon: Icon,
  title,
  description,
  highlight,
}: ConceptCardProps) {
  return (
    <Card className="group rounded-2xl border border-border/60 bg-background/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <CardHeader className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 group-hover:bg-primary/20 transition-colors">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-lg font-display">{title}</CardTitle>
        </div>
        <CardDescription className="text-sm leading-relaxed">
          {highlight && (
            <span className="font-medium text-foreground">{highlight} </span>
          )}
          {description}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
