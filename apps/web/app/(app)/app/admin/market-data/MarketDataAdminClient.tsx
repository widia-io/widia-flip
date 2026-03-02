"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Eye, Loader2, Play, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";
import type { MarketIngestionRun, MarketRegionAlias, RunMarketIngestionResponse } from "@widia/shared";

import {
  approveMarketRegionAlias,
  getMarketIngestionRun,
  getMarketIngestionUploadUrl,
  listMarketIngestionRuns,
  listMarketRegionAliases,
  rejectMarketRegionAlias,
  runMarketIngestion,
} from "@/lib/actions/market-data-admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const ALIAS_PAGE_SIZE = 10;

interface MarketDataAdminClientProps {
  initialRuns: MarketIngestionRun[];
  initialAliases: MarketRegionAlias[];
  initialAliasTotal: number;
  initialCanonicalOptions: string[];
}

interface DryRunPreviewRow {
  month: string;
  region_name: string;
  property_class: string;
  transaction_date: string | null;
  transaction_value: number;
  area_m2: number;
  price_m2: number;
  sql_registration: string;
}

function monthNow(): string {
  return new Date().toISOString().slice(0, 7);
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
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

function formatDuration(startedAt: string | null, finishedAt: string | null): string {
  if (!startedAt || !finishedAt) return "-";
  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return "-";
  const seconds = Math.floor((end - start) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

function formatInt(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString("pt-BR");
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDecimal(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(part: number, total: number): string {
  if (total <= 0) return "0,0%";
  const value = (part / total) * 100;
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
}

function formatMonthReference(value: string): string {
  if (!/^\d{4}-\d{2}$/.test(value)) return value;
  return `${value.slice(5, 7)}/${value.slice(0, 4)}`;
}

function formatConfidence(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return "-";
  }
  return `${(value * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function runStatusText(status: string): string {
  if (status === "running") return "Executando";
  if (status === "success") return "Sucesso";
  return "Falha";
}

function statusBadge(status: string) {
  if (status === "running") {
    return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Executando</Badge>;
  }
  if (status === "success") {
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Sucesso</Badge>;
  }
  return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Falha</Badge>;
}

async function uploadThroughProxy(uploadURL: string, file: File, onProgress: (value: number) => void): Promise<void> {
  const proxyUrl = `/api/storage/upload?url=${encodeURIComponent(uploadURL)}`;
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("Upload failed")));
    xhr.open("PUT", proxyUrl);
    xhr.setRequestHeader("Content-Type", file.type || XLSX_MIME);
    xhr.send(file);
  });
}

function mergeRunById(runs: MarketIngestionRun[], nextRun: MarketIngestionRun): MarketIngestionRun[] {
  const idx = runs.findIndex((item) => item.id === nextRun.id);
  if (idx === -1) {
    return [nextRun, ...runs];
  }
  const copy = [...runs];
  copy[idx] = nextRun;
  return copy;
}

export function MarketDataAdminClient({
  initialRuns,
  initialAliases,
  initialAliasTotal,
  initialCanonicalOptions,
}: MarketDataAdminClientProps) {
  const [runs, setRuns] = useState<MarketIngestionRun[]>(initialRuns);
  const [selectedRunID, setSelectedRunID] = useState<string | null>(initialRuns[0]?.id ?? null);
  const [aliases, setAliases] = useState<MarketRegionAlias[]>(initialAliases);
  const [aliasTotal, setAliasTotal] = useState(initialAliasTotal);
  const [aliasStatus, setAliasStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [aliasOffset, setAliasOffset] = useState(0);
  const [canonicalOptions, setCanonicalOptions] = useState<string[]>(initialCanonicalOptions);
  const [aliasCanonicalDraft, setAliasCanonicalDraft] = useState<Record<string, string>>({});
  const [aliasBusyID, setAliasBusyID] = useState<string | null>(null);

  const [asOfMonth, setAsOfMonth] = useState(monthNow());
  const [dryRun, setDryRun] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const [pollRunID, setPollRunID] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  const selectedRun = useMemo(() => {
    if (!selectedRunID) return null;
    return runs.find((run) => run.id === selectedRunID) ?? null;
  }, [runs, selectedRunID]);

  const previewRows = useMemo<DryRunPreviewRow[]>(() => {
    const rawRows = selectedRun?.stats?.preview_rows;
    if (!Array.isArray(rawRows)) return [];

    const rows: DryRunPreviewRow[] = [];
    for (const raw of rawRows) {
      if (!raw || typeof raw !== "object") continue;
      const row = raw as Record<string, unknown>;
      rows.push({
        month: asString(row.month),
        region_name: asString(row.region_name),
        property_class: asString(row.property_class),
        transaction_date: typeof row.transaction_date === "string" ? row.transaction_date : null,
        transaction_value: asNumber(row.transaction_value),
        area_m2: asNumber(row.area_m2),
        price_m2: asNumber(row.price_m2),
        sql_registration: asString(row.sql_registration),
      });
      if (rows.length >= 10) break;
    }
    return rows;
  }, [selectedRun]);

  const touchedMonthsLabel = useMemo(() => {
    const raw = selectedRun?.stats?.touched_months;
    if (!Array.isArray(raw)) return "-";
    const months = raw.filter((item): item is string => typeof item === "string");
    if (months.length === 0) return "-";
    if (months.length <= 4) {
      return months.map(formatMonthReference).join(", ");
    }
    return `${formatMonthReference(months[0])} ... ${formatMonthReference(months[months.length - 1])} (${months.length} meses)`;
  }, [selectedRun]);

  const qualityRate = useMemo(() => {
    if (!selectedRun) return "0,0%";
    return formatPercent(selectedRun.valid_rows ?? 0, selectedRun.input_rows ?? 0);
  }, [selectedRun]);

  const aliasPage = Math.floor(aliasOffset / ALIAS_PAGE_SIZE) + 1;
  const aliasPageCount = Math.max(1, Math.ceil(aliasTotal / ALIAS_PAGE_SIZE));

  const refreshRuns = () => {
    startTransition(async () => {
      const result = await listMarketIngestionRuns({ city: "sp", limit: 50, offset: 0 });
      if (result.error) {
        toast.error("Falha ao atualizar runs", { description: result.error });
        return;
      }
      setRuns(result.data?.items ?? []);
    });
  };

  const refreshAliases = (
    nextStatus: "pending" | "approved" | "rejected" = aliasStatus,
    nextOffset: number = aliasOffset
  ) => {
    startTransition(async () => {
      const result = await listMarketRegionAliases({
        city: "sp",
        status: nextStatus,
        limit: ALIAS_PAGE_SIZE,
        offset: nextOffset,
      });

      if (result.error) {
        toast.error("Falha ao atualizar aliases", { description: result.error });
        return;
      }

      setAliases(result.data?.items ?? []);
      setAliasTotal(result.data?.total ?? 0);
      setCanonicalOptions(result.data?.canonical_options ?? []);
      setAliasStatus(nextStatus);
      setAliasOffset(nextOffset);
    });
  };

  const getAliasDraftCanonical = (alias: MarketRegionAlias): string => {
    const draft = aliasCanonicalDraft[alias.id];
    if (typeof draft === "string" && draft.trim() !== "") {
      return draft;
    }
    return alias.suggested_canonical ?? alias.canonical_name ?? "";
  };

  const handleApproveAlias = (alias: MarketRegionAlias) => {
    const canonicalName = getAliasDraftCanonical(alias).trim();
    if (!canonicalName) {
      toast.error("Informe um bairro canônico para aprovar");
      return;
    }

    setAliasBusyID(alias.id);
    startTransition(async () => {
      try {
        await approveMarketRegionAlias(alias.id, canonicalName);
        toast.success("Alias aprovado");
        refreshAliases(aliasStatus, aliasOffset);
      } catch (error) {
        toast.error("Falha ao aprovar alias", {
          description: error instanceof Error ? error.message : "Erro desconhecido",
        });
      } finally {
        setAliasBusyID(null);
      }
    });
  };

  const handleRejectAlias = (alias: MarketRegionAlias) => {
    setAliasBusyID(alias.id);
    startTransition(async () => {
      try {
        await rejectMarketRegionAlias(alias.id);
        toast.success("Alias rejeitado");
        refreshAliases(aliasStatus, aliasOffset);
      } catch (error) {
        toast.error("Falha ao rejeitar alias", {
          description: error instanceof Error ? error.message : "Erro desconhecido",
        });
      } finally {
        setAliasBusyID(null);
      }
    });
  };

  const startRunPolling = (run: RunMarketIngestionResponse) => {
    setPollRunID(run.run_id);
    setSelectedRunID(run.run_id);
  };

  const handleViewDetails = (runID: string) => {
    setSelectedRunID(runID);
    window.setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleUploadAndRun = () => {
    if (!file) {
      toast.error("Selecione um arquivo XLSX");
      return;
    }
    if (!asOfMonth) {
      toast.error("Selecione o mês de referência");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máximo 100MB)");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    startTransition(async () => {
      try {
        const uploadInfo = await getMarketIngestionUploadUrl({
          city: "sp",
          filename: file.name,
          content_type: XLSX_MIME,
          size_bytes: file.size,
        });

        await uploadThroughProxy(uploadInfo.upload_url, file, setUploadProgress);

        const run = await runMarketIngestion({
          city: "sp",
          as_of_month: asOfMonth,
          storage_key: uploadInfo.storage_key,
          source: "itbi_sp_guias_pagas",
          dry_run: dryRun,
        });

        toast.success(dryRun ? "Dry-run iniciado" : "Ingestão iniciada", {
          description: `Run ${run.run_id}`,
        });

        setFile(null);
        if (fileRef.current) {
          fileRef.current.value = "";
        }

        startRunPolling(run);
        const refreshed = await listMarketIngestionRuns({ city: "sp", limit: 50, offset: 0 });
        if (refreshed.data?.items) {
          setRuns(refreshed.data.items);
        }
      } catch (error) {
        toast.error("Falha no upload/execução", {
          description: error instanceof Error ? error.message : "Erro desconhecido",
        });
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    });
  };

  const handleRerun = (run: MarketIngestionRun) => {
    if (!run.storage_key) {
      toast.error("Este run não possui storage_key para reexecução");
      return;
    }

    startTransition(async () => {
      try {
        const next = await runMarketIngestion({
          city: "sp",
          as_of_month: run.as_of_month,
          storage_key: run.storage_key,
          source: run.source,
          dry_run: run.dry_run,
        });

        toast.success("Reexecução iniciada", { description: `Run ${next.run_id}` });
        startRunPolling(next);
      } catch (error) {
        toast.error("Falha ao reexecutar", {
          description: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    });
  };

  useEffect(() => {
    if (!pollRunID) return;

    let mounted = true;
    const poll = async () => {
      try {
        const run = await getMarketIngestionRun(pollRunID);
        if (!mounted || !run) return;

        setRuns((prev) => mergeRunById(prev, run));
        if (run.status !== "running") {
          setPollRunID(null);
          if (run.status === "success") {
            toast.success("Ingestão concluída com sucesso");
          } else {
            toast.error("Ingestão finalizada com falha", {
              description: run.error_message ?? "Veja os detalhes do run",
            });
          }
        }
      } catch (error) {
        if (!mounted) return;
        toast.error("Erro ao consultar status da ingestão", {
          description: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    };

    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 3000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [pollRunID]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload e execução</CardTitle>
          <CardDescription>
            Envie a planilha ITBI de SP e dispare a ingestão assíncrona. O processamento roda no backend e você acompanha o status por polling.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" value="sp" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="month">Mês de referência</Label>
              <Input id="month" type="month" value={asOfMonth} onChange={(e) => setAsOfMonth(e.target.value)} disabled={uploading || isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">Arquivo XLSX</Label>
              <Input
                ref={fileRef}
                id="file"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                disabled={uploading || isPending}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="dry-run" checked={dryRun} onCheckedChange={(v) => setDryRun(v === true)} />
            <Label htmlFor="dry-run" className="text-sm text-muted-foreground">
              Dry-run (parse/normalização sem gravar transações/agregados)
            </Label>
          </div>

          {(uploading || isPending) && <Progress value={uploadProgress} className="h-2" />}

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleUploadAndRun} disabled={!file || uploading || isPending}>
              {uploading || isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Upload + Executar
            </Button>
            <Button variant="outline" onClick={refreshRuns} disabled={uploading || isPending}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar lista
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dicionário de aliases</CardTitle>
          <CardDescription>
            Revisão operacional dos bairros não reconhecidos automaticamente. Aprovar adiciona ao dicionário permanente para as próximas ingestões.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center rounded-lg border p-1">
              {(["pending", "approved", "rejected"] as const).map((statusOption) => (
                <Button
                  key={statusOption}
                  size="sm"
                  variant={aliasStatus === statusOption ? "default" : "ghost"}
                  className="h-8 rounded-md px-3 text-xs"
                  disabled={uploading || isPending}
                  onClick={() => refreshAliases(statusOption, 0)}
                >
                  {statusOption === "pending"
                    ? "Pendentes"
                    : statusOption === "approved"
                      ? "Aprovados"
                      : "Rejeitados"}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {aliasTotal.toLocaleString("pt-BR")} aliases no status atual
            </p>
          </div>

          {aliases.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Sem aliases neste status.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alias capturado</TableHead>
                    <TableHead>Sugestão LLM</TableHead>
                    <TableHead className="text-right">Ocorrências</TableHead>
                    <TableHead>Bairro canônico</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aliases.map((alias) => (
                    <TableRow key={alias.id}>
                      <TableCell>
                        <p className="font-medium">{alias.alias_raw ?? alias.alias_normalized}</p>
                        <p className="text-xs text-muted-foreground">{alias.alias_normalized}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{alias.suggested_canonical ?? "-"}</p>
                        <p className="text-xs text-muted-foreground">
                          confiança {formatConfidence(alias.suggested_confidence)}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">{formatInt(alias.occurrences)}</TableCell>
                      <TableCell className="min-w-[250px]">
                        <Input
                          list={`alias-canonical-options-${alias.id}`}
                          className="h-8 text-xs"
                          value={getAliasDraftCanonical(alias)}
                          disabled={aliasBusyID === alias.id || uploading || isPending}
                          onChange={(event) =>
                            setAliasCanonicalDraft((prev) => ({
                              ...prev,
                              [alias.id]: event.target.value,
                            }))
                          }
                        />
                        <datalist id={`alias-canonical-options-${alias.id}`}>
                          {canonicalOptions.map((option) => (
                            <option key={option} value={option} />
                          ))}
                        </datalist>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            disabled={aliasBusyID === alias.id || uploading || isPending}
                            onClick={() => handleApproveAlias(alias)}
                          >
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            disabled={aliasBusyID === alias.id || uploading || isPending}
                            onClick={() => handleRejectAlias(alias)}
                          >
                            Rejeitar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Página {aliasPage} de {aliasPageCount}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                disabled={aliasOffset <= 0 || uploading || isPending}
                onClick={() => refreshAliases(aliasStatus, Math.max(0, aliasOffset - ALIAS_PAGE_SIZE))}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                disabled={aliasOffset+ALIAS_PAGE_SIZE >= aliasTotal || uploading || isPending}
                onClick={() => refreshAliases(aliasStatus, aliasOffset + ALIAS_PAGE_SIZE)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Runs recentes</CardTitle>
          <CardDescription>
            {pollRunID ? "Acompanhando run em execução..." : "Histórico operacional de ingestões"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum run registrado.</p>
          ) : (
            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Mês</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead className="text-right">Input</TableHead>
                    <TableHead className="text-right">Válidos</TableHead>
                    <TableHead className="text-right">Grupos</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => (
                    <TableRow key={run.id} className={selectedRunID === run.id ? "bg-muted/40" : undefined}>
                      <TableCell>{statusBadge(run.status)}</TableCell>
                      <TableCell>{run.as_of_month}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs">{run.original_filename ?? "-"}</TableCell>
                      <TableCell className="text-right">{formatInt(run.input_rows)}</TableCell>
                      <TableCell className="text-right">{formatInt(run.valid_rows)}</TableCell>
                      <TableCell className="text-right">{formatInt(run.output_groups)}</TableCell>
                      <TableCell>{formatDuration(run.started_at, run.finished_at)}</TableCell>
                      <TableCell>{formatDateTime(run.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleViewDetails(run.id)}>
                            <Eye className="mr-1 h-3 w-3" />
                            Ver detalhes
                          </Button>
                          <Button size="sm" onClick={() => handleRerun(run)} disabled={!run.storage_key || run.status === "running"}>
                            <Play className="mr-1 h-3 w-3" />
                            Reexecutar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedRun ? (
        <Card ref={detailsRef}>
          <CardHeader>
            <CardTitle>Detalhes do run</CardTitle>
            <CardDescription>ID: {selectedRun.id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="mt-1 text-sm font-semibold">{runStatusText(selectedRun.status)}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Mês referência</p>
                <p className="mt-1 text-sm font-semibold">{formatMonthReference(selectedRun.as_of_month)}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Qualidade</p>
                <p className="mt-1 text-sm font-semibold">{qualityRate}</p>
                <p className="text-xs text-muted-foreground">
                  {formatInt(selectedRun.valid_rows)} de {formatInt(selectedRun.input_rows)} válidos
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Duração</p>
                <p className="mt-1 text-sm font-semibold">{formatDuration(selectedRun.started_at, selectedRun.finished_at)}</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border p-3">
                <p className="font-medium">Diagnóstico</p>
                <div className="mt-2">{statusBadge(selectedRun.status)}</div>
                <p className="mt-2 text-muted-foreground">
                  {selectedRun.error_message ?? "Execução finalizada sem erros."}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="font-medium">Arquivo e origem</p>
                <p className="mt-2 text-muted-foreground">
                  <span className="font-medium text-foreground">Arquivo:</span> {selectedRun.original_filename ?? "-"}
                </p>
                <p className="mt-1 text-muted-foreground">
                  <span className="font-medium text-foreground">Fonte:</span> {selectedRun.source}
                </p>
                <p className="mt-1 text-muted-foreground">
                  <span className="font-medium text-foreground">Dry-run:</span> {selectedRun.dry_run ? "Sim" : "Não"}
                </p>
                <p className="mt-1 break-all text-muted-foreground">
                  <span className="font-medium text-foreground">Storage key:</span> {selectedRun.storage_key ?? "-"}
                </p>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <p className="font-medium">Resumo operacional</p>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Transações de entrada:</span> {formatInt(selectedRun.input_rows)}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Transações válidas:</span> {formatInt(selectedRun.valid_rows)}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Grupos agregados:</span> {formatInt(selectedRun.output_groups)}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Janela processada:</span> {touchedMonthsLabel}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Criado em:</span> {formatDateTime(selectedRun.created_at)}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Trigger:</span> {selectedRun.trigger_type}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Aliases pendentes detectados:</span>{" "}
                  {formatInt(asNumber(selectedRun.stats?.alias_candidates))}
                </p>
              </div>
            </div>

            {selectedRun.dry_run ? (
              <div className="rounded-md border p-3">
                <p className="font-medium">Preview (10 primeiros registros válidos)</p>
                {previewRows.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">Sem preview disponível neste dry-run.</p>
                ) : (
                  <div className="mt-2 overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mês</TableHead>
                          <TableHead>Bairro</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-right">Área m²</TableHead>
                          <TableHead className="text-right">R$/m²</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewRows.map((row, idx) => (
                          <TableRow key={`${row.month}-${row.region_name}-${idx}`}>
                            <TableCell>{row.month || "-"}</TableCell>
                            <TableCell>{row.region_name || "-"}</TableCell>
                            <TableCell>{row.property_class || "-"}</TableCell>
                            <TableCell>{row.transaction_date || "-"}</TableCell>
                            <TableCell className="text-right">{formatCurrency(row.transaction_value)}</TableCell>
                            <TableCell className="text-right">{formatDecimal(row.area_m2)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(row.price_m2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            ) : null}

            <details className="rounded-md border p-3">
              <summary className="cursor-pointer select-none text-sm font-medium">JSON técnico (stats/params)</summary>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="font-medium">Stats JSON</p>
                  <pre className="mt-2 overflow-x-auto text-xs text-muted-foreground">{JSON.stringify(selectedRun.stats ?? {}, null, 2)}</pre>
                </div>
                <div>
                  <p className="font-medium">Params JSON</p>
                  <pre className="mt-2 overflow-x-auto text-xs text-muted-foreground">{JSON.stringify(selectedRun.params ?? {}, null, 2)}</pre>
                </div>
              </div>
            </details>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
