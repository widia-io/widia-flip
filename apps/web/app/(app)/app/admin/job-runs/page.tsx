import { CheckCircle, XCircle, Clock, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listJobRuns } from "@/lib/actions/opportunities";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(started: string | null, finished: string | null): string {
  if (!started || !finished) return "-";
  const ms = new Date(finished).getTime() - new Date(started).getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return (
        <Badge variant="outline" className="border-green-500 text-green-600">
          <CheckCircle className="mr-1 h-3 w-3" />
          Sucesso
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="outline" className="border-red-500 text-red-600">
          <XCircle className="mr-1 h-3 w-3" />
          Falha
        </Badge>
      );
    case "running":
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-600">
          <Clock className="mr-1 h-3 w-3" />
          Executando
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          <Clock className="mr-1 h-3 w-3" />
          {status}
        </Badge>
      );
  }
}

export default async function AdminJobRunsPage() {
  const result = await listJobRuns(50);
  const jobRuns = result.data ?? [];
  const error = result.error;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/app/admin">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Sparkles className="h-6 w-6 text-amber-500" />
              Job Runs - Oportunidades
            </h1>
            <p className="text-sm text-muted-foreground">
              Histórico de execuções do scraper
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Execuções Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {jobRuns.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma execução registrada
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Data</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Trigger</th>
                    <th className="pb-2 font-medium">Duração</th>
                    <th className="pb-2 font-medium">Novos</th>
                    <th className="pb-2 font-medium">Atualizados</th>
                    <th className="pb-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {jobRuns.map((run) => (
                    <tr key={run.id} className="border-b last:border-0">
                      <td className="py-3">{formatDate(run.started_at)}</td>
                      <td className="py-3">{getStatusBadge(run.status)}</td>
                      <td className="py-3">
                        <Badge variant="secondary">{run.trigger_type}</Badge>
                      </td>
                      <td className="py-3">
                        {formatDuration(run.started_at, run.finished_at)}
                      </td>
                      <td className="py-3 font-medium text-green-600">
                        {run.stats?.new_listings ?? "-"}
                      </td>
                      <td className="py-3">
                        {run.stats?.updated ?? "-"}
                      </td>
                      <td className="py-3">
                        {run.stats?.total_received ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
