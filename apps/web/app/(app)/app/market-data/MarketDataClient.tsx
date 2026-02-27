"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  MarketFiltersResponse,
  MarketPriceM2Response,
  MarketPropertyClass,
  MarketSeriesResponse,
} from "@widia/shared";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

type SeriesState = {
  regionName: string;
  data: MarketSeriesResponse;
} | null;

export function MarketDataClient() {
  const [filters, setFilters] = useState<MarketFiltersResponse | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [periodMonths, setPeriodMonths] = useState<number>(6);
  const [propertyClass, setPropertyClass] = useState<MarketPropertyClass>("geral");

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
        setSelectedMonth((current) => current || data.available_months[0]);
      }
      if (data.period_options.length > 0) {
        setPeriodMonths((current) =>
          data.period_options.includes(current as 1 | 3 | 6 | 12) ? current : data.period_options[0],
        );
      }
      if (data.property_classes.length > 0) {
        setPropertyClass((current) =>
          data.property_classes.includes(current) ? current : data.property_classes[0],
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar filtros");
    } finally {
      setLoadingFilters(false);
    }
  }, []);

  const loadPriceData = useCallback(async (asOfMonth: string, period: number, type: MarketPropertyClass) => {
    if (!asOfMonth) return;
    setLoadingPrice(true);
    setError(null);
    setSeries(null);

    try {
      const params = new URLSearchParams({
        city: "sp",
        as_of_month: asOfMonth,
        period_months: String(period),
        property_class: type,
      });
      const res = await fetch(`/api/market/price-m2?${params.toString()}`, { cache: "no-store" });
      const raw = await res.json();
      if (!res.ok) {
        throw new Error(raw?.error?.message ?? "Falha ao carregar preço por m²");
      }
      setPriceData(raw as MarketPriceM2Response);
    } catch (err) {
      setPriceData(null);
      setError(err instanceof Error ? err.message : "Erro ao carregar dados de preço");
    } finally {
      setLoadingPrice(false);
    }
  }, []);

  const loadSeries = useCallback(async (regionName: string) => {
    if (!regionName) return;

    setLoadingSeries(true);
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
  }, [periodMonths, propertyClass]);

  useEffect(() => {
    void loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    if (!selectedMonth) return;
    void loadPriceData(selectedMonth, periodMonths, propertyClass);
  }, [selectedMonth, periodMonths, propertyClass, loadPriceData]);

  const summary = useMemo(() => {
    const txCount = (priceData?.items ?? []).reduce((acc, item) => acc + item.tx_count, 0);
    return {
      neighborhoods: priceData?.items.length ?? 0,
      txCount,
      updatedAt: priceData?.updated_at ?? filters?.updated_at ?? null,
    };
  }, [priceData, filters]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Market Data</h1>
        <p className="text-sm text-muted-foreground">Mapa de preço do m² por transações reais (SP) em formato de tabela.</p>
      </div>

      <Card className="border-amber-400/40 bg-amber-50/40 dark:bg-amber-950/20">
        <CardContent className="pt-6 text-sm leading-relaxed text-amber-900 dark:text-amber-200">
          <p><strong>Fonte:</strong> ITBI (valor declarado pelo contribuinte).</p>
          <p className="mt-1">Valor declarado de ITBI não é equivalente ao preço de anúncio.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecione período e tipo para atualizar o ranking por bairro.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Mês de referência</p>
            <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={loadingFilters || !filters}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {(filters?.available_months ?? []).map((month) => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Janela</p>
            <Select
              value={String(periodMonths)}
              onValueChange={(value) => setPeriodMonths(Number(value))}
              disabled={loadingFilters}
            >
              <SelectTrigger>
                <SelectValue placeholder="Janela" />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((value) => (
                  <SelectItem key={value} value={String(value)}>{value} mês(es)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tipo</p>
            <Select
              value={propertyClass}
              onValueChange={(value) => setPropertyClass(value as MarketPropertyClass)}
              disabled={loadingFilters || !filters}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                {(filters?.property_classes ?? ["geral"]).map((value) => (
                  <SelectItem key={value} value={value}>{labelForPropertyClass(value)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Ranking por bairro</CardTitle>
            <CardDescription>
              {loadingPrice ? "Atualizando dados..." : `${summary.neighborhoods} bairros com ${summary.txCount.toLocaleString("pt-BR")} transações agregadas`}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Cidade: SP</Badge>
            <Badge variant="secondary">Atualizado: {formatDateTime(summary.updatedAt)}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Bairro</TableHead>
                  <TableHead className="text-right">Mediana R$/m²</TableHead>
                  <TableHead className="text-right">P25</TableHead>
                  <TableHead className="text-right">P75</TableHead>
                  <TableHead className="text-right">Amostra</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(priceData?.items ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      {loadingPrice ? "Carregando..." : "Nenhum dado agregado disponível para os filtros selecionados."}
                    </TableCell>
                  </TableRow>
                ) : (
                  (priceData?.items ?? []).map((item) => (
                    <TableRow key={item.region_id} className="cursor-pointer" onClick={() => void loadSeries(item.region_name)}>
                      <TableCell className="font-medium">{item.region_name}</TableCell>
                      <TableCell className="text-right">{formatCurrencyM2(item.median_m2)}</TableCell>
                      <TableCell className="text-right">{formatCurrencyM2(item.p25_m2)}</TableCell>
                      <TableCell className="text-right">{formatCurrencyM2(item.p75_m2)}</TableCell>
                      <TableCell className="text-right">{item.tx_count.toLocaleString("pt-BR")}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Série temporal (12 meses)</CardTitle>
          <CardDescription>
            {series ? `Bairro selecionado: ${series.regionName}` : "Clique em um bairro da tabela para carregar a série."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSeries ? (
            <p className="text-sm text-muted-foreground">Carregando série...</p>
          ) : series ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right">Mediana R$/m²</TableHead>
                    <TableHead className="text-right">P25</TableHead>
                    <TableHead className="text-right">P75</TableHead>
                    <TableHead className="text-right">Amostra</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {series.data.points.map((point) => (
                    <TableRow key={point.as_of_month}>
                      <TableCell>{point.as_of_month}</TableCell>
                      <TableCell className="text-right">{formatCurrencyM2(point.median_m2)}</TableCell>
                      <TableCell className="text-right">{formatCurrencyM2(point.p25_m2)}</TableCell>
                      <TableCell className="text-right">{formatCurrencyM2(point.p75_m2)}</TableCell>
                      <TableCell className="text-right">{point.tx_count.toLocaleString("pt-BR")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem série carregada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function labelForPropertyClass(value: string): string {
  switch (value) {
    case "geral":
      return "Geral";
    case "apartamento":
      return "Apartamento";
    case "casa":
      return "Casa";
    default:
      return "Outros";
  }
}

function formatCurrencyM2(value: number): string {
  return `R$ ${Math.round(value).toLocaleString("pt-BR")}`;
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
