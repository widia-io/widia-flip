import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { buildPublicMetadata } from "@/lib/seo";
import { getPublishedPostsSource } from "@/lib/blog-source";

export const metadata: Metadata = buildPublicMetadata({
  title: "Blog Meu Flip | Estratégia, ROI e Viabilidade para House Flipping",
  description:
    "Conteúdo prático para investidores imobiliários: ROI, viabilidade, financiamento, custos de reforma e margem no house flipping.",
  path: "/blog",
});

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function BlogListPage() {
  const posts = await getPublishedPostsSource();

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Logo size="full" iconSize={32} />
          </Link>

          <nav className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/calculator">Calculadora</Link>
            </Button>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12">
        <section className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Blog Meu Flip</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl font-display">
            Estratégia para lucrar mais em cada flip
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Guias objetivos sobre viabilidade, custos, financiamento e execução para decisões mais seguras.
          </p>
        </section>

        <section className="mt-10 grid gap-5">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="rounded-2xl border border-border/70 bg-card/70 p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{formatDate(post.publishedAt)}</span>
                {post.readingTimeMinutes ? (
                  <>
                    <span>•</span>
                    <span>{post.readingTimeMinutes} min de leitura</span>
                  </>
                ) : null}
              </div>

              <h2 className="mt-3 text-2xl font-semibold tracking-tight font-display">
                <Link href={`/blog/${post.slug}`} className="hover:text-primary transition-colors">
                  {post.title}
                </Link>
              </h2>

              <p className="mt-3 text-muted-foreground">{post.description}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="mt-5">
                <Button asChild variant="outline">
                  <Link href={`/blog/${post.slug}`}>
                    Ler artigo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
