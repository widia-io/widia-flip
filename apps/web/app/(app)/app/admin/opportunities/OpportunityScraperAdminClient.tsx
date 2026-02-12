"use client";

import { useMemo, useState, useTransition } from "react";
import { ExternalLink, Loader2, Pencil, Play, Save, X } from "lucide-react";
import { toast } from "sonner";
import type { OpportunityScraperPlaceholder, RunOpportunityScraperResponse } from "@widia/shared";

import {
  createOpportunityScraperPlaceholder,
  runOpportunityScraper,
  updateOpportunityScraperPlaceholder,
} from "@/lib/actions/opportunity-scraper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OpportunityScraperAdminClientProps {
  initialPlaceholders: OpportunityScraperPlaceholder[];
}

const defaultCity = "Curitiba";
const defaultNeighborhood = "Vila Izabel";
const defaultState = "pr";

function formatDateTime(value: string | null): string {
  if (!value) return "-";

  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function normalizeInput(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeStateInput(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z]/g, "").slice(0, 2);
}

export function OpportunityScraperAdminClient({ initialPlaceholders }: OpportunityScraperAdminClientProps) {
  const [isPending, startTransition] = useTransition();
  const [placeholders, setPlaceholders] = useState(initialPlaceholders);

  const [manualState, setManualState] = useState(defaultState);
  const [manualCity, setManualCity] = useState(defaultCity);
  const [manualNeighborhood, setManualNeighborhood] = useState(defaultNeighborhood);

  const [formState, setFormState] = useState(defaultState);
  const [formCity, setFormCity] = useState(defaultCity);
  const [formNeighborhood, setFormNeighborhood] = useState(defaultNeighborhood);
  const [editingPlaceholderId, setEditingPlaceholderId] = useState<string | null>(null);

  const [runningPlaceholderId, setRunningPlaceholderId] = useState<string | null>(null);
  const [isDryRun, setIsDryRun] = useState(true);

  const [lastRunResult, setLastRunResult] = useState<RunOpportunityScraperResponse | null>(null);
  const [lastRunLabel, setLastRunLabel] = useState<string | null>(null);

  const saveButtonLabel = useMemo(
    () => (editingPlaceholderId ? "Atualizar placeholder" : "Salvar placeholder"),
    [editingPlaceholderId]
  );

  const handleManualRun = () => {
    const state = normalizeStateInput(manualState);
    const city = normalizeInput(manualCity);
    const neighborhood = normalizeInput(manualNeighborhood);

    if (!state || state.length !== 2 || !city || !neighborhood) {
      toast.error("Informe estado (2 letras), cidade e bairro para executar");
      return;
    }

    startTransition(async () => {
      try {
        const result = await runOpportunityScraper({
          state,
          city,
          neighborhood,
          dry_run: isDryRun,
        });

        setLastRunResult(result);
        setLastRunLabel(`${city} - ${neighborhood} (${state})`);

        const modeLabel = result.dry_run ? "Dry-run" : "Execucao real";
        toast.success(`${modeLabel} concluido`, {
          description: `${result.stats.total_received} anuncios retornados.`,
        });
      } catch (err) {
        toast.error("Falha ao executar scraper", {
          description: err instanceof Error ? err.message : "Erro inesperado",
        });
      }
    });
  };

  const handleSavePlaceholder = () => {
    const state = normalizeStateInput(formState);
    const city = normalizeInput(formCity);
    const neighborhood = normalizeInput(formNeighborhood);

    if (!state || state.length !== 2 || !city || !neighborhood) {
      toast.error("Estado (2 letras), cidade e bairro sao obrigatorios");
      return;
    }

    startTransition(async () => {
      try {
        if (editingPlaceholderId) {
          const updated = await updateOpportunityScraperPlaceholder(editingPlaceholderId, {
            state,
            city,
            neighborhood,
          });
          setPlaceholders((prev) =>
            prev.map((placeholder) =>
              placeholder.id === editingPlaceholderId ? updated : placeholder
            )
          );
          toast.success("Placeholder atualizado");
        } else {
          const created = await createOpportunityScraperPlaceholder({ state, city, neighborhood });
          setPlaceholders((prev) => [created, ...prev]);
          toast.success("Placeholder salvo");
        }

        setFormState(defaultState);
        setFormCity(defaultCity);
        setFormNeighborhood(defaultNeighborhood);
        setEditingPlaceholderId(null);
      } catch (err) {
        toast.error("Falha ao salvar placeholder", {
          description: err instanceof Error ? err.message : "Erro inesperado",
        });
      }
    });
  };

  const handleEditPlaceholder = (placeholder: OpportunityScraperPlaceholder) => {
    setEditingPlaceholderId(placeholder.id);
    setFormState(placeholder.state);
    setFormCity(placeholder.city);
    setFormNeighborhood(placeholder.neighborhood);
  };

  const handleCancelEdit = () => {
    setEditingPlaceholderId(null);
    setFormState(defaultState);
    setFormCity(defaultCity);
    setFormNeighborhood(defaultNeighborhood);
  };

  const handleRunPlaceholder = (placeholder: OpportunityScraperPlaceholder) => {
    setRunningPlaceholderId(placeholder.id);

    startTransition(async () => {
      try {
        const result = await runOpportunityScraper({
          state: placeholder.state,
          placeholder_id: placeholder.id,
          city: placeholder.city,
          neighborhood: placeholder.neighborhood,
          dry_run: isDryRun,
        });

        if (result.placeholder) {
          setPlaceholders((prev) =>
            prev.map((item) => (item.id === result.placeholder?.id ? result.placeholder : item))
          );
        }

        setLastRunResult(result);
        setLastRunLabel(`${placeholder.city} - ${placeholder.neighborhood} (${placeholder.state})`);

        const modeLabel = result.dry_run ? "Dry-run" : "Execucao real";
        toast.success(`${modeLabel} concluido`, {
          description: `${result.stats.total_received} anuncios retornados.`,
        });
      } catch (err) {
        toast.error("Falha ao executar placeholder", {
          description: err instanceof Error ? err.message : "Erro inesperado",
        });
      } finally {
        setRunningPlaceholderId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Executar scraper agora</CardTitle>
          <CardDescription>
            Dispare uma busca parametrizada informando cidade e bairro.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="manual-state">Estado (UF)</Label>
              <Input
                id="manual-state"
                value={manualState}
                onChange={(event) => setManualState(normalizeStateInput(event.target.value))}
                placeholder="Ex: pr"
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-city">Cidade</Label>
              <Input
                id="manual-city"
                value={manualCity}
                onChange={(event) => setManualCity(event.target.value)}
                placeholder="Ex: Curitiba"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-neighborhood">Bairro</Label>
              <Input
                id="manual-neighborhood"
                value={manualNeighborhood}
                onChange={(event) => setManualNeighborhood(event.target.value)}
                placeholder="Ex: Vila Izabel"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="dry-run-toggle"
              checked={isDryRun}
              onCheckedChange={(value) => setIsDryRun(value === true)}
            />
            <Label htmlFor="dry-run-toggle" className="text-sm text-muted-foreground">
              Dry-run (executa sem salvar no banco)
            </Label>
          </div>

          <Button onClick={handleManualRun} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            {isDryRun ? "Executar dry-run" : "Executar busca"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Placeholders (buscas salvas)</CardTitle>
          <CardDescription>
            Salve buscas frequentes para reexecucao rapida.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="placeholder-state">Estado (UF)</Label>
              <Input
                id="placeholder-state"
                value={formState}
                onChange={(event) => setFormState(normalizeStateInput(event.target.value))}
                placeholder="Ex: pr"
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="placeholder-city">Cidade</Label>
              <Input
                id="placeholder-city"
                value={formCity}
                onChange={(event) => setFormCity(event.target.value)}
                placeholder="Ex: Curitiba"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="placeholder-neighborhood">Bairro</Label>
              <Input
                id="placeholder-neighborhood"
                value={formNeighborhood}
                onChange={(event) => setFormNeighborhood(event.target.value)}
                placeholder="Ex: Vila Izabel"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSavePlaceholder} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {saveButtonLabel}
            </Button>

            {editingPlaceholderId ? (
              <Button variant="outline" onClick={handleCancelEdit} disabled={isPending}>
                <X className="mr-2 h-4 w-4" />
                Cancelar edicao
              </Button>
            ) : null}
          </div>

          {placeholders.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhum placeholder salvo ainda.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>UF</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Bairro</TableHead>
                  <TableHead>Ultima execucao</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {placeholders.map((placeholder) => {
                  const isRowRunning = runningPlaceholderId === placeholder.id;

                  return (
                    <TableRow key={placeholder.id}>
                      <TableCell className="uppercase">{placeholder.state}</TableCell>
                      <TableCell className="font-medium">{placeholder.city}</TableCell>
                      <TableCell>{placeholder.neighborhood}</TableCell>
                      <TableCell>{formatDateTime(placeholder.last_run_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditPlaceholder(placeholder)}
                            disabled={isPending}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleRunPlaceholder(placeholder)}
                            disabled={isPending || isRowRunning}
                          >
                            {isRowRunning ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="mr-2 h-4 w-4" />
                            )}
                            {isDryRun ? "Dry-run" : "Executar"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {lastRunResult ? (
        <Card>
          <CardHeader>
            <CardTitle>Resultado da ultima execucao</CardTitle>
            <CardDescription>
              {lastRunLabel ? `Busca: ${lastRunLabel}` : "Retorno bruto do scraper"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={lastRunResult.dry_run ? "secondary" : "default"}>
                {lastRunResult.dry_run ? "Dry-run" : "Persistido"}
              </Badge>
              <span>Total: {lastRunResult.stats.total_received}</span>
              {!lastRunResult.dry_run ? (
                <>
                  <span>Novos: {lastRunResult.stats.new_listings}</span>
                  <span>Atualizados: {lastRunResult.stats.updated}</span>
                </>
              ) : null}
              <span>Mediana m2: R$ {lastRunResult.stats.median_price_m2.toFixed(0)}</span>
            </div>

            {lastRunResult.listings.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nenhum imovel retornado para os parametros informados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Score</TableHead>
                      <TableHead>Titulo</TableHead>
                      <TableHead>UF</TableHead>
                      <TableHead>Bairro</TableHead>
                      <TableHead>Preco</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead>Desconto</TableHead>
                      <TableHead className="text-right">Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lastRunResult.listings.map((listing) => (
                      <TableRow key={listing.source_listing_id}>
                        <TableCell className="font-semibold">{listing.score}</TableCell>
                        <TableCell className="max-w-[340px] truncate">{listing.title || "Sem titulo"}</TableCell>
                        <TableCell className="uppercase">{listing.state || "-"}</TableCell>
                        <TableCell>{listing.neighborhood || "-"}</TableCell>
                        <TableCell>{formatPrice(listing.price_cents)}</TableCell>
                        <TableCell>{listing.area_m2 ? `${listing.area_m2.toFixed(0)} m2` : "-"}</TableCell>
                        <TableCell>{`${(listing.discount_pct * 100).toFixed(1)}%`}</TableCell>
                        <TableCell className="text-right">
                          <a
                            href={listing.canonical_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            Abrir
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
