import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { BlogViewTracker } from "@/components/blog/BlogViewTracker";
import { BlogPostToc } from "@/components/blog/BlogPostToc";
import {
  absoluteUrl,
  buildBlogArticleMetadata,
  buildPublicMetadata,
} from "@/lib/seo";
import {
  type BlogCtaTarget,
  getPostBySlugSource,
  getRelatedPostsSource,
} from "@/lib/blog-source";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function createBlogCtaUrl(slug: string, to: BlogCtaTarget, ctaPosition: string): string {
  const params = new URLSearchParams({
    to,
    post: slug,
    cta: ctaPosition,
  });

  return `/r/blog-cta?${params.toString()}`;
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlugSource(slug);

  if (!post) {
    return buildPublicMetadata({
      title: "Artigo não encontrado | Blog Meu Flip",
      description: "O artigo solicitado não foi encontrado.",
      path: "/blog",
    });
  }

  return buildBlogArticleMetadata({
    title: post.title,
    description: post.description,
    path: post.canonicalPath ?? `/blog/${post.slug}`,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    author: post.author,
    tags: post.tags,
    imagePath: post.coverImage,
  });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlugSource(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = await getRelatedPostsSource(post.slug, post.tags, 3);

  const articleStructuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "Meu Flip",
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/logos/meuflip-arrow-icon-dark.svg"),
      },
    },
    mainEntityOfPage: absoluteUrl(post.canonicalPath ?? `/blog/${post.slug}`),
  };

  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Início",
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: absoluteUrl("/blog"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: absoluteUrl(post.canonicalPath ?? `/blog/${post.slug}`),
      },
    ],
  };

  return (
    <div className="min-h-screen">
      <BlogViewTracker slug={post.slug} tags={post.tags} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleStructuredData).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbStructuredData).replace(/</g, "\\u003c"),
        }}
      />

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

      <main className="blog-editorial-page mx-auto max-w-6xl px-4 py-10 sm:py-12">
        <article>
          <header className="blog-article-hero rounded-3xl border border-border/60 bg-card/70 p-6 shadow-sm sm:p-8">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-primary/85">
              Caderno de Viabilidade
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{formatDate(post.publishedAt)}</span>
              {post.readingTimeMinutes ? (
                <>
                  <span>•</span>
                  <span>{post.readingTimeMinutes} min de leitura</span>
                </>
              ) : null}
              <span>•</span>
              <span>por {post.author}</span>
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.6rem] font-display">
              {post.title}
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-muted-foreground">{post.description}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border/90 bg-muted/45 px-3 py-1 text-xs text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </header>

          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12">
            <BlogPostToc items={post.toc} />

            <div className="min-w-0 lg:col-start-1 lg:row-start-1">
              {post.coverImage ? (
                <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="h-auto max-h-[560px] w-full object-cover"
                    loading="eager"
                  />
                </div>
              ) : null}

              <div className="blog-inline-cta mt-6 flex flex-col gap-3 rounded-xl border border-border/70 bg-card/65 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Simule esta tese com seus números e veja margem, ROI e risco antes da proposta.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link href={createBlogCtaUrl(post.slug, "calculator", "hero")}>
                      Abrir calculadora
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={createBlogCtaUrl(post.slug, "signup", "hero")}>Criar conta</Link>
                  </Button>
                </div>
              </div>

              <div
                className="blog-content mt-8"
                dangerouslySetInnerHTML={{ __html: post.htmlContent }}
              />

              <div className="blog-inline-cta mt-10 flex flex-col gap-3 border-l-2 border-primary/55 pl-4 sm:flex-row sm:items-center sm:justify-between sm:pl-5">
                <p className="text-sm text-muted-foreground">
                  Próximo passo: validar o imóvel com premissas reais antes de entrar em due diligence.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link href={createBlogCtaUrl(post.slug, "calculator", "footer")}>
                      Calcular viabilidade
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={createBlogCtaUrl(post.slug, "signup", "footer")}>Testar o app</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </article>

        {relatedPosts.length > 0 ? (
          <section className="mt-16 border-t border-border/70 pt-10">
            <h2 className="text-2xl font-semibold tracking-tight font-display">Continue na trilha</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((related) => (
                <article
                  key={related.slug}
                  className="rounded-xl border border-border/70 bg-card/65 p-4 transition-colors hover:bg-card/90"
                >
                  <p className="text-xs text-muted-foreground">{formatDate(related.publishedAt)}</p>
                  <h3 className="mt-2 font-semibold leading-snug">
                    <Link href={`/blog/${related.slug}`} className="transition-colors hover:text-primary">
                      {related.title}
                    </Link>
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{related.description}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
