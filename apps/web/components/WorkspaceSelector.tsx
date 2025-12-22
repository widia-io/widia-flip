"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, Settings } from "lucide-react";
import Link from "next/link";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setActiveWorkspaceId } from "@/lib/workspace";

interface Workspace {
  id: string;
  name: string;
}

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
}

export function WorkspaceSelector({
  workspaces,
  activeWorkspaceId,
}: WorkspaceSelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const activeWorkspace = workspaces.find((ws) => ws.id === activeWorkspaceId);

  const handleValueChange = (value: string) => {
    if (value === "manage") {
      router.push("/app/workspaces");
      return;
    }

    startTransition(async () => {
      await setActiveWorkspaceId(value);
      router.refresh();
    });
  };

  if (workspaces.length === 0) {
    return (
      <Link
        href="/app/workspaces"
        className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <FolderKanban className="h-4 w-4" />
        <span>Criar projeto</span>
      </Link>
    );
  }

  return (
    <Select
      value={activeWorkspaceId ?? undefined}
      onValueChange={handleValueChange}
      disabled={isPending}
    >
      <SelectTrigger className="h-9 w-[180px] border-border bg-background">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Selecione um projeto">
            {activeWorkspace?.name ?? "Selecione"}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {workspaces.map((ws) => (
          <SelectItem key={ws.id} value={ws.id}>
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
              <span>{ws.name}</span>
            </div>
          </SelectItem>
        ))}
        <SelectSeparator />
        <div
          className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
          onClick={() => router.push("/app/workspaces")}
        >
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span>Gerenciar projetos</span>
          </div>
        </div>
      </SelectContent>
    </Select>
  );
}


