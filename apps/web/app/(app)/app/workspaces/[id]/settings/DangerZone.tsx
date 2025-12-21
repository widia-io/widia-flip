"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteWorkspaceAction } from "@/lib/actions/workspaces";

interface DangerZoneProps {
  workspaceId: string;
  workspaceName: string;
}

export function DangerZone({ workspaceId, workspaceName }: DangerZoneProps) {
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [isPending, startTransition] = useTransition();

  const canDelete = confirmName === workspaceName;

  const handleDelete = () => {
    if (!canDelete) return;
    startTransition(async () => {
      await deleteWorkspaceAction(workspaceId);
    });
  };

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5">
      <div className="border-b border-destructive/20 px-6 py-4">
        <h2 className="flex items-center gap-2 font-semibold text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Zona de Perigo
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ações irreversíveis que afetam permanentemente seu projeto.
        </p>
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-medium">Excluir este projeto</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Ao excluir o projeto, todos os dados serão permanentemente removidos. 
              Isso inclui todos os imóveis, prospects, análises e documentos associados.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir Projeto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Excluir Projeto
                </DialogTitle>
                <DialogDescription>
                  Esta ação é <strong>irreversível</strong>. Todos os dados do projeto 
                  serão permanentemente excluídos.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="rounded-lg bg-destructive/10 p-4 text-sm">
                  <p className="font-medium text-destructive">
                    O que será excluído:
                  </p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                    <li>Todos os imóveis do projeto</li>
                    <li>Todos os prospects (oportunidades)</li>
                    <li>Todas as análises de viabilidade</li>
                    <li>Todos os documentos enviados</li>
                    <li>Todo o histórico e configurações</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmName">
                    Digite <span className="font-mono font-semibold">{workspaceName}</span> para confirmar:
                  </Label>
                  <Input
                    id="confirmName"
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    placeholder={workspaceName}
                    disabled={isPending}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={!canDelete || isPending}
                >
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Excluir Permanentemente
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

