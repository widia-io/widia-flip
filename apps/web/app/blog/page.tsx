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
  const [featuredPost, ...otherPosts] = posts;

  return (
    <div className="blog-editorial-page min-h-screen">
      <header className="border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Logo size="full" iconSize={32} />
          </Link>

          <nav className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/blog">Blog</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/calculator">Calculadora</Link>
            </Button>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
        <section className="blog-list-hero rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm sm:p-8">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-primary/90">Blog Meu Flip</p>
          <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.6rem] font-display">
            Estratégia editorial para proteger margem, prazo e decisão de compra
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
            Conteúdo direto para quem opera house flipping: viabilidade, risco, execução e saída de venda.
          </p>
        </section>

        {featuredPost ? (
          <section className="mt-10">
            <article className="rounded-3xl border border-border/70 bg-card/75 p-6 shadow-sm sm:p-8">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-primary/85">
                Artigo destaque
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{formatDate(featuredPost.publishedAt)}</span>
                {featuredPost.readingTimeMinutes ? (
                  <>
                    <span>•</span>
                    <span>{featuredPost.readingTimeMinutes} min de leitura</span>
                  </>
                ) : null}
              </div>

              {featuredPost.coverImage ? (
                <div className="mt-5 overflow-hidden rounded-2xl border border-border/70 bg-card/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={featuredPost.coverImage}
                    alt={featuredPost.title}
                    className="h-auto max-h-[420px] w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : null}

              <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl font-display">
                <Link href={`/blog/${featuredPost.slug}`} className="transition-colors hover:text-primary">
                  {featuredPost.title}
                </Link>
              </h2>
              <p className="mt-3 max-w-3xl text-muted-foreground">{featuredPost.description}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                {featuredPost.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border/90 bg-muted/45 px-3 py-1 text-xs text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="mt-6">
                <Button asChild>
                  <Link href={`/blog/${featuredPost.slug}`}>
                    Ler artigo destaque
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </article>
          </section>
        ) : null}

        {otherPosts.length > 0 ? (
          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherPosts.map((post) => (
              <article
                key={post.slug}
                className="rounded-xl border border-border/70 bg-card/60 p-4 transition-colors hover:bg-card/90"
              >
                {post.coverImage ? (
                  <div className="mb-3 overflow-hidden rounded-lg border border-border/60 bg-card/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="h-36 w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : null}
                <p className="text-xs text-muted-foreground">{formatDate(post.publishedAt)}</p>
                <h3 className="mt-2 text-lg font-semibold leading-snug font-display">
                  <Link href={`/blog/${post.slug}`} className="transition-colors hover:text-primary">
                    {post.title}
                  </Link>
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{post.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border/70 bg-muted/35 px-2.5 py-1 text-[0.7rem] text-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="mt-4">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/blog/${post.slug}`}>
                      Ler
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </main>
    </div>
  );
}
