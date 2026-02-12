import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";
import type { OpportunityScraperPlaceholder } from "@widia/shared";

import { OpportunityScraperAdminClient } from "./OpportunityScraperAdminClient";
import { listOpportunityScraperPlaceholders } from "@/lib/actions/opportunity-scraper";

export default async function AdminOpportunityScraperPage() {
  let placeholders: OpportunityScraperPlaceholder[] = [];
  let errorMessage: string | null = null;

  try {
    placeholders = await listOpportunityScraperPlaceholders();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Erro ao carregar placeholders";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/app/admin"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Admin
        </Link>
      </div>

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Sparkles className="h-6 w-6 text-amber-500" />
          Oportunidades: Scraper
        </h1>
        <p className="text-muted-foreground">
          Execute o scraper com parametros de cidade e bairro e gerencie placeholders.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <OpportunityScraperAdminClient initialPlaceholders={placeholders} />
    </div>
  );
}
