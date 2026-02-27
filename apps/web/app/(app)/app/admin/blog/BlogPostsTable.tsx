"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Loader2, Pencil, Archive, Upload, Download } from "lucide-react";
import type { AdminBlogPost } from "@widia/shared";

import {
  archiveAdminBlogPost,
  publishAdminBlogPost,
  unpublishAdminBlogPost,
} from "@/lib/actions/adminBlog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BlogPostsTableProps {
  initialPosts: AdminBlogPost[];
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: string): string {
  if (status === "published") return "Publicado";
  if (status === "archived") return "Arquivado";
  return "Rascunho";
}

function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "published") return "default";
  if (status === "archived") return "outline";
  return "secondary";
}

export function BlogPostsTable({ initialPosts }: BlogPostsTableProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function runAction(
    postId: string,
    action: "publish" | "unpublish" | "archive",
  ) {
    setError(null);

    startTransition(async () => {
      try {
        const updated =
          action === "publish"
            ? await publishAdminBlogPost(postId)
            : action === "unpublish"
              ? await unpublishAdminBlogPost(postId)
              : await archiveAdminBlogPost(postId);

        setPosts((current) =>
          current.map((post) => (post.id === updated.id ? updated : post)),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao atualizar post");
      }
    });
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Nenhum post encontrado para os filtros atuais.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Atualizado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post) => (
              <TableRow key={post.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/app/admin/blog/${post.id}`}
                    className="hover:text-primary transition-colors"
                  >
                    {post.title}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{post.slug}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(post.status)}>{statusLabel(post.status)}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(post.updatedAt)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/app/admin/blog/${post.id}`}>
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Link>
                    </Button>

                    {post.status === "published" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => runAction(post.id, "unpublish")}
                      >
                        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                        Despublicar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => runAction(post.id, "publish")}
                      >
                        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        Publicar
                      </Button>
                    )}

                    {post.status !== "archived" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => runAction(post.id, "archive")}
                      >
                        <Archive className="h-3.5 w-3.5" />
                        Arquivar
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
