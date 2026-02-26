import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getAdminBlogPost } from "@/lib/actions/adminBlog";
import { BlogPostEditorForm } from "../BlogPostEditorForm";

interface AdminBlogPostDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminBlogPostDetailPage({
  params,
}: AdminBlogPostDetailPageProps) {
  const { id } = await params;

  let post: Awaited<ReturnType<typeof getAdminBlogPost>>;
  try {
    post = await getAdminBlogPost(id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/app/admin/blog"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Blog CMS
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{post.title}</h1>
        <p className="text-muted-foreground">Edite conteúdo, SEO e status do artigo.</p>
      </div>

      <BlogPostEditorForm initialPost={post} />
    </div>
  );
}
