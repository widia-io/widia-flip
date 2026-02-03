import { Sparkles } from "lucide-react";

import { OpportunityGrid } from "@/components/opportunities/OpportunityGrid";
import { OpportunityFilters } from "@/components/opportunities/OpportunityFilters";
import { listOpportunities } from "@/lib/actions/opportunities";

export default async function OpportunitiesPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = (await props.searchParams) ?? {};

  // Parse search params
  const minScore = searchParams.min_score
    ? parseInt(searchParams.min_score as string, 10)
    : 50;
  const sort = (searchParams.sort as string) || "score_desc";

  // Fetch opportunities
  const result = await listOpportunities({
    minScore,
    sort,
    limit: 50,
  });

  const opportunities = result.data?.data ?? [];
  const total = result.data?.total ?? 0;
  const error = result.error;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <Sparkles className="h-6 w-6 text-amber-500" />
            Oportunidades
          </h1>
          <p className="text-sm text-muted-foreground">
            {total} imóveis encontrados em Curitiba - Vila Izabel
          </p>
        </div>
      </div>

      {/* Error State */}
      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {/* Filters */}
      <OpportunityFilters minScore={minScore} sort={sort} />

      {/* Grid */}
      <OpportunityGrid opportunities={opportunities} />
    </div>
  );
}
