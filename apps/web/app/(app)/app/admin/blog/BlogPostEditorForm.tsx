"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { marked } from "marked";
import DOMPurify from "dompurify";
import type { AdminBlogPost } from "@widia/shared";

import {
  archiveAdminBlogPost,
  createAdminBlogPost,
  publishAdminBlogPost,
  unpublishAdminBlogPost,
  updateAdminBlogPost,
} from "@/lib/actions/adminBlog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FormValues = {
  slug: string;
  title: string;
  description: string;
  contentMd: string;
  excerpt: string;
  authorName: string;
  tags: string;
  coverImageUrl: string;
  canonicalPath: string;
  seoTitle: string;
  seoDescription: string;
};

function toFormValues(post?: AdminBlogPost): FormValues {
  if (!post) {
    return {
      slug: "",
      title: "",
      description: "",
      contentMd: "",
      excerpt: "",
      authorName: "Equipe Meu Flip",
      tags: "",
      coverImageUrl: "",
      canonicalPath: "",
      seoTitle: "",
      seoDescription: "",
    };
  }

  return {
    slug: post.slug,
    title: post.title,
    description: post.description,
    contentMd: post.contentMd,
    excerpt: post.excerpt ?? "",
    authorName: post.authorName,
    tags: post.tags.join(", "),
    coverImageUrl: post.coverImageUrl ?? "",
    canonicalPath: post.canonicalPath ?? "",
    seoTitle: post.seoTitle ?? "",
    seoDescription: post.seoDescription ?? "",
  };
}

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

interface BlogPostEditorFormProps {
  initialPost?: AdminBlogPost;
}

export function BlogPostEditorForm({ initialPost }: BlogPostEditorFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormValues>(() => toFormValues(initialPost));
  const [post, setPost] = useState<AdminBlogPost | undefined>(initialPost);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const previewHtml = useMemo(() => {
    const rawHtml = marked.parse(form.contentMd || "") as string;
    return DOMPurify.sanitize(rawHtml);
  }, [form.contentMd]);

  function updateField<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function buildPayload() {
    const payload = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      contentMd: form.contentMd.trim(),
      excerpt: form.excerpt.trim() || null,
      authorName: form.authorName.trim(),
      tags: parseTags(form.tags),
      coverImageUrl: form.coverImageUrl.trim() || null,
      canonicalPath: form.canonicalPath.trim() || null,
      seoTitle: form.seoTitle.trim() || null,
      seoDescription: form.seoDescription.trim() || null,
    };
    return payload;
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        const payload = buildPayload();
        const nextPost = post
          ? await updateAdminBlogPost(post.id, payload)
          : await createAdminBlogPost(payload);

        setPost(nextPost);
        if (!post) {
          router.push(`/app/admin/blog/${nextPost.id}`);
          return;
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao salvar post");
      }
    });
  }

  function handleAction(action: "publish" | "unpublish" | "archive") {
    if (!post) return;
    setError(null);

    startTransition(async () => {
      try {
        const nextPost =
          action === "publish"
            ? await publishAdminBlogPost(post.id)
            : action === "unpublish"
              ? await unpublishAdminBlogPost(post.id)
              : await archiveAdminBlogPost(post.id);

        setPost(nextPost);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao atualizar status");
      }
    });
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-md border border-destructive/60 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={form.slug}
            onChange={(e) => updateField("slug", e.target.value)}
            placeholder="como-calcular-roi-flip-brasil-impostos"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="authorName">Autor</Label>
          <Input
            id="authorName"
            value={form.authorName}
            onChange={(e) => updateField("authorName", e.target.value)}
            placeholder="Equipe Meu Flip"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          value={form.title}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder="Título principal do artigo"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => updateField("description", e.target.value)}
          placeholder="Meta description do artigo"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="excerpt">Excerpt (opcional)</Label>
        <Textarea
          id="excerpt"
          value={form.excerpt}
          onChange={(e) => updateField("excerpt", e.target.value)}
          rows={2}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
          <Input
            id="tags"
            value={form.tags}
            onChange={(e) => updateField("tags", e.target.value)}
            placeholder="roi, viabilidade, impostos"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="canonicalPath">Canonical Path (opcional)</Label>
          <Input
            id="canonicalPath"
            value={form.canonicalPath}
            onChange={(e) => updateField("canonicalPath", e.target.value)}
            placeholder="/blog/slug-do-artigo"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="coverImageUrl">Cover Image URL (opcional)</Label>
          <Input
            id="coverImageUrl"
            value={form.coverImageUrl}
            onChange={(e) => updateField("coverImageUrl", e.target.value)}
            placeholder="https://cdn.exemplo.com/imagens/post.jpg"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="seoTitle">SEO Title (opcional)</Label>
          <Input
            id="seoTitle"
            value={form.seoTitle}
            onChange={(e) => updateField("seoTitle", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="seoDescription">SEO Description (opcional)</Label>
        <Textarea
          id="seoDescription"
          value={form.seoDescription}
          onChange={(e) => updateField("seoDescription", e.target.value)}
          rows={2}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contentMd">Conteúdo (Markdown)</Label>
          <Textarea
            id="contentMd"
            value={form.contentMd}
            onChange={(e) => updateField("contentMd", e.target.value)}
            rows={22}
            className="font-mono text-xs"
            placeholder="# Título&#10;&#10;Seu conteúdo em markdown..."
          />
        </div>
        <div className="space-y-2">
          <Label>Preview</Label>
          <div
            className="prose prose-sm max-w-none rounded-md border bg-card p-4 min-h-[420px]"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleSave} disabled={isPending}>
          {post ? "Salvar alterações" : "Criar draft"}
        </Button>

        {post ? (
          <>
            {post.status === "published" ? (
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => handleAction("unpublish")}
              >
                Despublicar
              </Button>
            ) : (
              <Button disabled={isPending} onClick={() => handleAction("publish")}>
                Publicar
              </Button>
            )}

            {post.status !== "archived" ? (
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => handleAction("archive")}
              >
                Arquivar
              </Button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
