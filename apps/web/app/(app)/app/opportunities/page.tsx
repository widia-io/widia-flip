import { ChevronRight, Sparkles } from "lucide-react";
import type { OpportunityStatus } from "@widia/shared";

import { Badge } from "@/components/ui/badge";
import { OpportunityGrid } from "@/components/opportunities/OpportunityGrid";
import { OpportunityFilters, type OpportunityFilterState } from "@/components/opportunities/OpportunityFilters";
import { listOpportunityFacetsAction, listOpportunities } from "@/lib/actions/opportunities";

function getParam(
  params: Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  const value = params[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function parseNumberParam(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

function parseIntegerList(value: string | undefined): number[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item >= 0);
}

function parseStatusList(value: string | undefined): OpportunityStatus[] {
  if (!value) return [];

  const allowed = new Set<OpportunityStatus>(["new", "viewed", "contacted", "discarded"]);
  const items = value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is OpportunityStatus => allowed.has(item as OpportunityStatus));

  return Array.from(new Set(items));
}

function formatMoneyPerM2(value: number): string {
  return `R$ ${Math.round(value).toLocaleString("pt-BR")}/m²`;
}

export default async function OpportunitiesPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = (await props.searchParams) ?? {};

  const state = getParam(searchParams, "state")?.toLowerCase();
  const city = getParam(searchParams, "city");
  const neighborhood = getParam(searchParams, "neighborhood");
  const minScore = parseNumberParam(getParam(searchParams, "min_score")) ?? 50;
  const minPrice = parseNumberParam(getParam(searchParams, "min_price"));
  const maxPrice = parseNumberParam(getParam(searchParams, "max_price"));
  const minArea = parseNumberParam(getParam(searchParams, "min_area"));
  const maxArea = parseNumberParam(getParam(searchParams, "max_area"));
  const bedrooms = parseIntegerList(getParam(searchParams, "bedrooms"));
  const status = parseStatusList(getParam(searchParams, "status"));
  const sort = getParam(searchParams, "sort") || "score_desc";

  const filterState: OpportunityFilterState = {
    state,
    city,
    neighborhood,
    minScore,
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    bedrooms,
    status,
    sort,
  };

  const queryParams = {
    state,
    city,
    neighborhood,
    minScore,
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    bedrooms,
    status,
    sort,
    limit: 50,
  };

  const [listResult, facetsResult] = await Promise.all([
    listOpportunities(queryParams),
    listOpportunityFacetsAction(queryParams),
  ]);

  const opportunities = listResult.data?.data ?? [];
  const total = listResult.data?.total ?? 0;
  const listError = listResult.error;
  const facets = facetsResult.data;
  const facetsError = facetsResult.error;

  const locationChain = [state?.toUpperCase(), city, neighborhood].filter(Boolean) as string[];
  const firstMedianM2 = opportunities.find((item) => item.market_median_m2 != null)?.market_median_m2;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
      <div className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
              <Sparkles className="h-6 w-6 text-amber-500" />
              Oportunidades
            </h1>
            <p className="text-sm text-muted-foreground">
              Mesa de triagem para decisão rápida por mercado.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border/80 bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Faixa de Mercado Ativo
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {locationChain.length > 0 ? (
              locationChain.map((item, index) => (
                <div key={`${item}-${index}`} className="flex items-center gap-1.5">
                  <Badge variant="secondary">{item}</Badge>
                  {index < locationChain.length - 1 ? (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  ) : null}
                </div>
              ))
            ) : (
              <Badge variant="secondary">Todos os mercados</Badge>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{total} imóveis encontrados</span>
            <span>
              Mediana local: {firstMedianM2 ? formatMoneyPerM2(firstMedianM2) : "sem referência"}
            </span>
          </div>
        </div>
      </div>

      {listError ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {listError}
        </div>
      ) : null}

      <OpportunityFilters
        filters={filterState}
        facets={facets}
        facetsError={facetsError}
      />

      <OpportunityGrid opportunities={opportunities} />
    </div>
  );
}
