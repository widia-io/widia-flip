import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { BlogPostEditorForm } from "../BlogPostEditorForm";

export default function NewAdminBlogPostPage() {
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
        <h1 className="text-2xl font-bold">Novo post</h1>
        <p className="text-muted-foreground">
          Crie um rascunho em Markdown e publique sem deploy.
        </p>
      </div>

      <BlogPostEditorForm />
    </div>
  );
}
