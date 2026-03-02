"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  MarketFiltersResponse,
  MarketPriceM2Item,
  MarketPriceM2Response,
  MarketPropertyClass,
  MarketSeriesResponse,
} from "@widia/shared";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PERIOD_OPTIONS = [1, 3, 6, 12] as const;
const MIN_SAMPLE_OPTIONS = [10, 15, 20, 30, 50, 80] as const;
const PAGE_SIZE = 25;

type SeriesState = {
  regionName: string;
  data: MarketSeriesResponse;
} | null;

type OpportunitySignal = {
  regionName: string;
  medianM2: number;
  txCount: number;
  confidence: string;
  score: number;
  discountVsCityPct: number;
};

export function MarketDataClient() {
  const [filters, setFilters] = useState<MarketFiltersResponse | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [periodMonths, setPeriodMonths] = useState<number>(6);
  const [propertyClass, setPropertyClass] = useState<MarketPropertyClass>("geral");
  const [minTxCount, setMinTxCount] = useState<number>(20);
  const [page, setPage] = useState<number>(1);

  const [priceData, setPriceData] = useState<MarketPriceM2Response | null>(null);
  const [series, setSeries] = useState<SeriesState>(null);

  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFilters = useCallback(async () => {
    setLoadingFilters(true);
    setError(null);

    try {
      const res = await fetch("/api/market/filters?city=sp", { cache: "no-store" });
      const raw = await res.json();
      if (!res.ok) {
        throw new Error(raw?.error?.message ?? "Falha ao carregar filtros de mercado");
      }

      const data = raw as MarketFiltersResponse;
      setFilters(data);
      if (data.available_months.length > 0) {
        setSelectedMonth((prev) => prev || data.available_months[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar filtros");
    } finally {
      setLoadingFilters(false);
    }
  }, []);

  const loadPriceData = useCallback(
    async (month: string, period: number, type: MarketPropertyClass, minSample: number) => {
      if (!month) return;

      setLoadingPrice(true);
      setError(null);
      setSeries(null);

      try {
        const params = new URLSearchParams({
          city: "sp",
          as_of_month: month,
          period_months: String(period),
          property_class: type,
          min_tx_count: String(minSample),
        });
        const res = await fetch(`/api/market/price-m2?${params.toString()}`, { cache: "no-store" });
        const raw = await res.json();

        if (!res.ok) {
          throw new Error(raw?.error?.message ?? "Falha ao carregar dados consolidados");
        }

        setPriceData(raw as MarketPriceM2Response);
      } catch (err) {
        setPriceData(null);
        setError(err instanceof Error ? err.message : "Erro ao carregar dados de mercado");
      } finally {
        setLoadingPrice(false);
      }
    },
    [],
  );

  const loadSeries = useCallback(
    async (regionName: string) => {
      setLoadingSeries(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          city: "sp",
          region_name: regionName,
          period_months: String(periodMonths),
          property_class: propertyClass,
          months: "12",
        });
        const res = await fetch(`/api/market/series?${params.toString()}`, { cache: "no-store" });
        const raw = await res.json();

        if (!res.ok) {
          throw new Error(raw?.error?.message ?? "Falha ao carregar série temporal");
        }

        setSeries({ regionName, data: raw as MarketSeriesResponse });
      } catch (err) {
        setSeries(null);
        setError(err instanceof Error ? err.message : "Erro ao carregar série temporal");
      } finally {
        setLoadingSeries(false);
      }
    },
    [periodMonths, propertyClass],
  );

  useEffect(() => {
    void loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    if (!selectedMonth) return;
    void loadPriceData(selectedMonth, periodMonths, propertyClass, minTxCount);
  }, [selectedMonth, periodMonths, propertyClass, minTxCount, loadPriceData]);

  useEffect(() => {
    setPage(1);
  }, [selectedMonth, periodMonths, propertyClass, minTxCount]);

  const derived = useMemo(() => {
    const items = priceData?.items ?? [];
    const summary = priceData?.summary;
    const cityMedianM2 = summary?.city_median_m2 ?? 0;

    const opportunities: OpportunitySignal[] = items
      .filter((item) => item.confidence !== "baixa" && item.tx_count >= minTxCount)
      .map((item) => {
        const discountVsCityPct = cityMedianM2 > 0
          ? ((cityMedianM2 - item.median_m2) / cityMedianM2) * 100
          : 0;
        const spreadPct = item.median_m2 > 0
          ? ((item.p75_m2 - item.p25_m2) / item.median_m2) * 100
          : 0;
        const confidenceBoost = item.confidence === "alta" ? 12 : 6;
        const score = discountVsCityPct + confidenceBoost - spreadPct * 0.4;

        return {
          regionName: item.region_name,
          medianM2: item.median_m2,
          txCount: item.tx_count,
          confidence: item.confidence,
          score,
          discountVsCityPct,
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    const premium = items.filter((item) => item.band === "premium").slice(0, 5);
    const belowMarket = items
      .filter((item) => item.band === "abaixo_media" && item.confidence !== "baixa")
      .slice(0, 5);
    const stable = [...items]
      .filter((item) => item.tx_count >= 30)
      .sort((a, b) => (a.p75_m2 - a.p25_m2) - (b.p75_m2 - b.p25_m2))
      .slice(0, 5);

    const highConfidenceRatio = summary && summary.regions_count > 0
      ? (summary.high_confidence_regions / summary.regions_count) * 100
      : 0;

    const lowConfidenceRatio = summary && summary.regions_count > 0
      ? (summary.low_confidence_regions / summary.regions_count) * 100
      : 0;

    return {
      items,
      opportunities,
      premium,
      belowMarket,
      stable,
      cityMedianM2,
      highConfidenceRatio,
      lowConfidenceRatio,
    };
  }, [priceData, minTxCount]);

  const totalItems = derived.items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return derived.items.slice(start, start + PAGE_SIZE);
  }, [derived.items, currentPage]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pageStart = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, totalItems);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-8 pt-4 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[radial-gradient(96rem_32rem_at_95%_-5%,rgba(14,116,144,0.3),transparent),radial-gradient(70rem_30rem_at_-10%_120%,rgba(16,185,129,0.18),transparent),linear-gradient(145deg,#020617,#0f172a_50%,#111827)] p-6 text-slate-100 shadow-[0_24px_70px_-32px_rgba(8,145,178,0.65)] sm:p-8">
        <div className="absolute -left-20 top-16 h-40 w-40 rounded-full border border-cyan-200/10" />
        <div className="absolute -right-12 bottom-6 h-36 w-36 rounded-full border border-emerald-200/10" />

        <div className="relative grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-end">
          <div className="space-y-3">
            <Badge className="w-fit border border-cyan-200/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/10">
              Market Signal Console · SP
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Dados consolidados para decidir preço real por bairro
            </h1>
            <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
              O módulo prioriza relevância sobre volume bruto: normaliza variações de bairro, filtra baixa amostra e destaca sinais acionáveis.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <KpiTile label="Bairros válidos" value={formatInt(priceData?.summary.regions_count ?? 0)} />
            <KpiTile label="Amostra total" value={formatInt(priceData?.summary.total_tx_count ?? 0)} />
            <KpiTile label="Mediana SP" value={formatCurrency(priceData?.summary.city_median_m2 ?? 0)} />
            <KpiTile label="Spread SP" value={formatCurrency(priceData?.summary.spread_m2 ?? 0)} />
          </div>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Consolidação de leitura</CardTitle>
          <CardDescription>
            Ajuste os filtros para equilibrar cobertura e confiança estatística. A API já retorna dados pré-agrupados e limpos.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4 lg:grid-cols-5">
          <FilterSelect
            label="Cidade"
            value="sp"
            onValueChange={() => {}}
            disabled
            options={[{ value: "sp", label: "São Paulo" }]}
          />

          <FilterSelect
            label="Mês de referência"
            value={selectedMonth}
            onValueChange={setSelectedMonth}
            disabled={loadingFilters || !filters}
            options={(filters?.available_months ?? []).map((value) => ({ value, label: value }))}
          />

          <FilterSelect
            label="Janela"
            value={String(periodMonths)}
            onValueChange={(value) => setPeriodMonths(Number(value))}
            disabled={loadingFilters}
            options={PERIOD_OPTIONS.map((value) => ({ value: String(value), label: `${value} mês(es)` }))}
          />

          <FilterSelect
            label="Classe"
            value={propertyClass}
            onValueChange={(value) => setPropertyClass(value as MarketPropertyClass)}
            disabled={loadingFilters || !filters}
            options={(filters?.property_classes ?? ["geral"]).map((value) => ({
              value,
              label: labelForPropertyClass(value),
            }))}
          />

          <FilterSelect
            label="Amostra mínima"
            value={String(minTxCount)}
            onValueChange={(value) => setMinTxCount(Number(value))}
            disabled={loadingFilters}
            options={MIN_SAMPLE_OPTIONS.map((value) => ({ value: String(value), label: `${value}+ transações` }))}
          />
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 xl:items-start xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Ranking consolidado por bairro</CardTitle>
              <CardDescription>
                {loadingPrice
                  ? "Atualizando leitura consolidada..."
                  : `${priceData?.summary.regions_count ?? 0} bairros com limpeza ativa e mínimo de ${minTxCount} transações`}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="w-fit">
              Atualizado: {formatDateTime(priceData?.updated_at ?? filters?.updated_at ?? null)}
            </Badge>
          </CardHeader>

          <CardContent>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>
                      <HeaderHint
                        label="Bairro"
                        hint="Nome consolidado do bairro apos normalizacao dos dados brutos."
                      />
                    </TableHead>
                    <TableHead className="text-right">
                      <HeaderHint
                        label="Mediana"
                        hint="Valor central do R$/m² no bairro. Quanto maior, mais caro em termos relativos."
                        align="right"
                      />
                    </TableHead>
                    <TableHead className="text-right">
                      <HeaderHint
                        label="Gap vs SP"
                        hint="Diferenca percentual da mediana do bairro em relacao a mediana da cidade de SP."
                        align="right"
                      />
                    </TableHead>
                    <TableHead className="text-right">
                      <HeaderHint
                        label="P25-P75"
                        hint="Faixa entre os percentis 25 e 75. Menor faixa indica menor dispersao e maior estabilidade."
                        align="right"
                      />
                    </TableHead>
                    <TableHead className="text-right">
                      <HeaderHint
                        label="Amostra"
                        hint="Numero de transacoes usadas no calculo. Amostras maiores aumentam a confianca."
                        align="right"
                      />
                    </TableHead>
                    <TableHead className="text-right">
                      <HeaderHint
                        label="Sinal"
                        hint="Combina duas tags: Confianca (baixa/media/alta) e Faixa (premium/acima/media/abaixo da media)."
                        align="right"
                      />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {derived.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                        {loadingPrice ? "Carregando dados consolidados..." : "Sem dados para os filtros selecionados."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedItems.map((item) => (
                      <TableRow
                        key={item.region_id}
                        className="cursor-pointer"
                        onClick={() => void loadSeries(item.region_name)}
                      >
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{item.region_name}</span>
                            <span className="text-xs text-muted-foreground">{confidenceLabel(item.confidence)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(item.median_m2)}</TableCell>
                        <TableCell className="text-right">{formatSignedPercent(gapVsCity(item, derived.cityMedianM2))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.p75_m2 - item.p25_m2)}</TableCell>
                        <TableCell className="text-right">{formatInt(item.tx_count)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-start justify-end gap-3">
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                Confiança
                              </span>
                              <Badge variant="secondary" className={confidenceClass(item.confidence)}>
                                {item.confidence}
                              </Badge>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                Faixa
                              </span>
                              <Badge variant="secondary" className={bandClass(item.band)}>
                                {bandLabel(item.band)}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {derived.items.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                <p className="text-muted-foreground">
                  Mostrando {formatInt(pageStart)}-{formatInt(pageEnd)} de {formatInt(totalItems)} bairros
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-md border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    Anterior
                  </button>
                  <span className="text-muted-foreground">
                    Página {formatInt(currentPage)} de {formatInt(totalPages)}
                  </span>
                  <button
                    type="button"
                    className="rounded-md border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid content-start gap-6">
          <SignalCard
            title="Top oportunidades consolidadas"
            subtitle="Desconto vs mediana SP com boa confiança"
            items={derived.opportunities}
          />

          <InsightCard
            title="Pressão de preço"
            subtitle="Bairros no quartil superior"
            items={derived.premium.map((item) => ({
              label: item.region_name,
              value: formatCurrency(item.median_m2),
              meta: `${formatInt(item.tx_count)} tx`,
            }))}
          />

          <InsightCard
            title="Faixa estável"
            subtitle="Menor dispersão P75-P25"
            items={derived.stable.map((item) => ({
              label: item.region_name,
              value: formatCurrency(item.p75_m2 - item.p25_m2),
              meta: `${formatInt(item.tx_count)} tx`,
            }))}
          />

          <Card className="border-slate-300/70 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/40">
            <CardHeader>
              <CardTitle>Qualidade da leitura</CardTitle>
              <CardDescription>Concentração de regiões com sinal estatístico.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <QualityBar label="Alta confiança" value={derived.highConfidenceRatio} tone="high" />
              <QualityBar label="Baixa confiança" value={derived.lowConfidenceRatio} tone="low" />

              <div className="rounded-lg border border-slate-300/70 bg-white/70 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/60">
                <p className="font-medium">Sinal abaixo da média com confiança</p>
                <p className="mt-1 text-muted-foreground">
                  {derived.belowMarket.length > 0
                    ? `${derived.belowMarket.length} bairros com desconto e ruído controlado.`
                    : "Nenhum bairro com desconto confiável para os filtros atuais."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Série temporal</CardTitle>
              <CardDescription>
                {series ? `Bairro selecionado: ${series.regionName}` : "Clique no ranking para abrir 12 meses."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSeries ? (
                <p className="text-sm text-muted-foreground">Carregando série...</p>
              ) : series ? (
                <div className="space-y-2">
                  {series.data.points.slice(0, 8).map((point, index, list) => {
                    const prev = list[index + 1];
                    const delta = prev && prev.median_m2 > 0
                      ? ((point.median_m2 - prev.median_m2) / prev.median_m2) * 100
                      : null;
                    return (
                      <div
                        key={point.as_of_month}
                        className="flex items-center justify-between rounded-lg border px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium">{point.as_of_month}</p>
                          <p className="text-xs text-muted-foreground">{formatInt(point.tx_count)} transações</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatCurrency(point.median_m2)}</p>
                          <p className="text-xs text-muted-foreground">
                            {delta === null ? "-" : formatSignedPercent(delta)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem bairro selecionado.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="border-slate-300/70 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/40">
        <CardContent className="pt-5 text-sm text-slate-600 dark:text-slate-300">
          <p>
            Fonte: ITBI (valor declarado). Este painel prioriza dados consolidados por bairro e elimina parte do ruído via normalização e amostra mínima.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function HeaderHint({
  label,
  hint,
  align = "left",
}: {
  label: string;
  hint: string;
  align?: "left" | "right";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}
    >
      <span>{label}</span>
      <span className="group relative inline-flex">
        <span
          tabIndex={0}
          aria-label={hint}
          className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold text-muted-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          ?
        </span>
        <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 rounded-md border bg-popover px-2 py-1.5 text-[11px] font-normal leading-snug text-popover-foreground opacity-0 shadow-md transition group-hover:opacity-100 group-focus-within:opacity-100">
          {hint}
        </span>
      </span>
    </span>
  );
}

function FilterSelect(props: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled: boolean;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{props.label}</p>
      <Select value={props.value} onValueChange={props.onValueChange} disabled={props.disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          {props.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-cyan-200/20 bg-white/5 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.08em] text-cyan-100/80">{label}</p>
      <p className="text-base font-semibold text-cyan-50">{value}</p>
    </div>
  );
}

function SignalCard(props: {
  title: string;
  subtitle: string;
  items: OpportunitySignal[];
}) {
  return (
    <Card className="border-cyan-200/60 bg-cyan-50/60 dark:border-cyan-900/40 dark:bg-cyan-950/10">
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
        <CardDescription>{props.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {props.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem oportunidade robusta para os filtros atuais.</p>
        ) : (
          <div className="space-y-2">
            {props.items.map((item) => (
              <div
                key={item.regionName}
                className="flex items-center justify-between rounded-lg border border-cyan-300/40 bg-white/70 px-3 py-2 dark:border-cyan-900/40 dark:bg-cyan-900/20"
              >
                <div>
                  <p className="text-sm font-medium">{item.regionName}</p>
                  <p className="text-xs text-muted-foreground">
                    Score {Math.round(item.score)} · {formatInt(item.txCount)} tx · {item.confidence}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency(item.medianM2)}</p>
                  <p className="text-xs text-muted-foreground">{formatSignedPercent(item.discountVsCityPct)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InsightCard(props: {
  title: string;
  subtitle: string;
  items: Array<{ label: string; value: string; meta: string }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
        <CardDescription>{props.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {props.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem sinal suficiente com os filtros atuais.</p>
        ) : (
          <div className="space-y-2">
            {props.items.map((item) => (
              <div key={`${item.label}-${item.value}`} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.meta}</p>
                </div>
                <p className="text-sm font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QualityBar(props: { label: string; value: number; tone: "high" | "low" }) {
  const width = Math.max(0, Math.min(100, props.value));
  const barClass = props.tone === "high"
    ? "bg-emerald-500/80"
    : "bg-amber-500/80";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>{props.label}</span>
        <span className="font-medium">{formatSignedPercent(width, false)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function bandLabel(band: string): string {
  switch (band) {
    case "premium":
      return "Premium";
    case "acima_media":
      return "Acima";
    case "media":
      return "Média";
    default:
      return "Abaixo";
  }
}

function bandClass(band: string): string {
  switch (band) {
    case "premium":
      return "border-emerald-300/60 bg-emerald-100/70 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200";
    case "acima_media":
      return "border-sky-300/60 bg-sky-100/70 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200";
    case "media":
      return "border-amber-300/60 bg-amber-100/70 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200";
    default:
      return "border-slate-300/60 bg-slate-100/70 text-slate-700 dark:bg-slate-800/70 dark:text-slate-200";
  }
}

function confidenceClass(confidence: string): string {
  switch (confidence) {
    case "alta":
      return "border-emerald-300/60 bg-emerald-100/70 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200";
    case "media":
      return "border-amber-300/60 bg-amber-100/70 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200";
    default:
      return "border-slate-300/60 bg-slate-100/70 text-slate-700 dark:bg-slate-800/70 dark:text-slate-200";
  }
}

function confidenceLabel(confidence: string): string {
  switch (confidence) {
    case "alta":
      return "Confiança alta";
    case "media":
      return "Confiança média";
    default:
      return "Confiança baixa";
  }
}

function labelForPropertyClass(value: string): string {
  switch (value) {
    case "apartamento":
      return "Apartamento";
    case "casa":
      return "Casa";
    case "outros":
      return "Outros";
    default:
      return "Geral";
  }
}

function gapVsCity(item: MarketPriceM2Item, cityMedianM2: number): number {
  if (cityMedianM2 <= 0) return 0;
  return ((item.median_m2 - cityMedianM2) / cityMedianM2) * 100;
}

function formatCurrency(value: number): string {
  return `R$ ${Math.round(value).toLocaleString("pt-BR")}`;
}

function formatInt(value: number): string {
  return value.toLocaleString("pt-BR");
}

function formatDateTime(value: string | null): string {
  if (!value) return "n/d";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSignedPercent(value: number, withSign = true): string {
  const rounded = Math.round(value * 10) / 10;
  if (!withSign) {
    return `${Math.max(0, rounded).toLocaleString("pt-BR")} %`;
  }
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString("pt-BR")} %`;
}
