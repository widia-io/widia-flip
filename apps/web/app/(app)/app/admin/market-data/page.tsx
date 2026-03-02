import Link from "next/link";
import { ChevronLeft, Database } from "lucide-react";
import type { MarketIngestionRun, MarketRegionAlias } from "@widia/shared";

import { MarketDataAdminClient } from "./MarketDataAdminClient";
import { listMarketIngestionRuns, listMarketRegionAliases } from "@/lib/actions/market-data-admin";

export default async function AdminMarketDataPage() {
  let initialRuns: MarketIngestionRun[] = [];
  let initialAliases: MarketRegionAlias[] = [];
  let initialAliasTotal = 0;
  let initialCanonicalOptions: string[] = [];
  let initialError: string | null = null;

  try {
    const result = await listMarketIngestionRuns({ city: "sp", limit: 50, offset: 0 });
    initialRuns = result.data?.items ?? [];
    initialError = result.error;

    const aliasResult = await listMarketRegionAliases({
      city: "sp",
      status: "pending",
      limit: 10,
      offset: 0,
    });
    initialAliases = aliasResult.data?.items ?? [];
    initialAliasTotal = aliasResult.data?.total ?? 0;
    initialCanonicalOptions = aliasResult.data?.canonical_options ?? [];
    if (!initialError && aliasResult.error) {
      initialError = aliasResult.error;
    }
  } catch (error) {
    initialError = error instanceof Error ? error.message : "Erro ao carregar ingestoes";
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
          <Database className="h-6 w-6 text-cyan-600" />
          Market Data: Operação
        </h1>
        <p className="text-muted-foreground">
          Upload de planilha ITBI (SP), execução de ingestão e acompanhamento de runs em tempo real.
        </p>
      </div>

      {initialError ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {initialError}
        </div>
      ) : null}

      <MarketDataAdminClient
        initialRuns={initialRuns}
        initialAliases={initialAliases}
        initialAliasTotal={initialAliasTotal}
        initialCanonicalOptions={initialCanonicalOptions}
      />
    </div>
  );
}
