import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";

import { listAdminBlogPosts } from "@/lib/actions/adminBlog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BlogPostsTable } from "./BlogPostsTable";

export default async function AdminBlogPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const status =
    typeof searchParams.status === "string" ? searchParams.status : "";
  const q = typeof searchParams.q === "string" ? searchParams.q : "";

  const statusFilter =
    status === "draft" || status === "published" || status === "archived"
      ? status
      : undefined;

  const data = await listAdminBlogPosts({
    status: statusFilter,
    q: q || undefined,
    limit: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/app/admin"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Admin
        </Link>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Blog CMS</h1>
          <p className="text-muted-foreground">
            Gerencie rascunhos, publicação e SEO dos artigos públicos.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/admin/blog/new">
            <Plus className="mr-2 h-4 w-4" />
            Novo post
          </Link>
        </Button>
      </div>

      <form className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[220px_1fr_auto]">
        <select
          name="status"
          defaultValue={status}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos os status</option>
          <option value="draft">Rascunho</option>
          <option value="published">Publicado</option>
          <option value="archived">Arquivado</option>
        </select>

        <Input
          name="q"
          defaultValue={q}
          placeholder="Buscar por título ou slug"
        />

        <div className="flex items-center gap-2">
          <Button type="submit" variant="outline">
            Filtrar
          </Button>
          <Button asChild type="button" variant="ghost">
            <Link href="/app/admin/blog">Limpar</Link>
          </Button>
        </div>
      </form>

      <BlogPostsTable initialPosts={data.items} />
    </div>
  );
}
