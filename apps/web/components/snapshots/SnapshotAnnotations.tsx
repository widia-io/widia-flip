"use client";

import { useState, useEffect, useTransition } from "react";
import { MessageSquare, Plus, Pencil, Trash2, Loader2, X, Check } from "lucide-react";
import type { SnapshotAnnotation, SnapshotType } from "@widia/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  listAnnotationsAction,
  createAnnotationAction,
  updateAnnotationAction,
  deleteAnnotationAction,
} from "@/lib/actions/snapshots";
import { cn } from "@/lib/utils";

interface SnapshotAnnotationsProps {
  snapshotId: string;
  snapshotType: SnapshotType;
  initialCount?: number;
}

export function SnapshotAnnotations({
  snapshotId,
  snapshotType,
  initialCount = 0,
}: SnapshotAnnotationsProps) {
  const [annotations, setAnnotations] = useState<SnapshotAnnotation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const count = annotations.length || initialCount;

  useEffect(() => {
    if (isOpen && annotations.length === 0) {
      loadAnnotations();
    }
  }, [isOpen, snapshotId, snapshotType]);

  const loadAnnotations = async () => {
    setIsLoading(true);
    const result = await listAnnotationsAction(snapshotId, snapshotType);
    if (result.error) {
      console.error("Error loading annotations:", result.error);
    }
    if (result.data) {
      setAnnotations(result.data.items);
    }
    setIsLoading(false);
  };

  const handleCreate = () => {
    if (!newNote.trim()) return;
    startTransition(async () => {
      const result = await createAnnotationAction(snapshotId, snapshotType, newNote.trim());
      if (result.error) {
        console.error("Error creating annotation:", result.error);
        return;
      }
      if (result.data) {
        setAnnotations([result.data, ...annotations]);
        setNewNote("");
      }
    });
  };

  const handleUpdate = (id: string) => {
    if (!editingNote.trim()) return;
    startTransition(async () => {
      const result = await updateAnnotationAction(id, editingNote.trim());
      if (result.data) {
        setAnnotations(annotations.map(a => a.id === id ? result.data! : a));
        setEditingId(null);
        setEditingNote("");
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteAnnotationAction(id);
      if (result.success) {
        setAnnotations(annotations.filter(a => a.id !== id));
      }
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2",
            count > 0 && "text-primary border-primary/50"
          )}
        >
          <MessageSquare className="h-4 w-4" />
          {count > 0 ? `${count} ${count === 1 ? "nota" : "notas"}` : "Adicionar nota"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm">Anotações</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Adicione notas para lembrar o contexto desta análise
          </p>
        </div>

        {/* Add new annotation */}
        <div className="p-3 border-b bg-muted/30">
          <Textarea
            placeholder="Escreva uma nota..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-[60px] text-sm resize-none"
            maxLength={1000}
          />
          <div className="flex justify-end mt-2">
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!newNote.trim() || isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Annotations list */}
        <div className="max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : annotations.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhuma anotação ainda
            </div>
          ) : (
            <div className="divide-y">
              {annotations.map((annotation) => (
                <div key={annotation.id} className="p-3">
                  {editingId === annotation.id ? (
                    <div>
                      <Textarea
                        value={editingNote}
                        onChange={(e) => setEditingNote(e.target.value)}
                        className="min-h-[60px] text-sm resize-none"
                        maxLength={1000}
                        autoFocus
                      />
                      <div className="flex justify-end gap-1 mt-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingId(null);
                            setEditingNote("");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleUpdate(annotation.id)}
                          disabled={!editingNote.trim() || isPending}
                        >
                          {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm whitespace-pre-wrap">{annotation.note}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(annotation.created_at)}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => {
                              setEditingId(annotation.id);
                              setEditingNote(annotation.note);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(annotation.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
