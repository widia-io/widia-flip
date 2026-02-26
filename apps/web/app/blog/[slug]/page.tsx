import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { BlogViewTracker } from "@/components/blog/BlogViewTracker";
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

      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Logo size="full" iconSize={32} />
          </Link>

          <nav className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/blog">Blog</Link>
            </Button>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12">
        <article>
          <p className="text-sm text-muted-foreground">{formatDate(post.publishedAt)}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl font-display">
            {post.title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{post.description}</p>

          {post.coverImage ? (
            <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.coverImage}
                alt={post.title}
                className="h-auto max-h-[520px] w-full object-cover"
                loading="eager"
              />
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold font-display">Simule este cenário com seus números</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Rode sua análise em 30 segundos com cálculo completo de margem e ROI.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button asChild>
                <Link href={createBlogCtaUrl(post.slug, "calculator", "hero")}>
                  Abrir calculadora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={createBlogCtaUrl(post.slug, "signup", "hero")}>Criar conta grátis</Link>
              </Button>
            </div>
          </div>

          <div
            className="blog-content mt-10"
            dangerouslySetInnerHTML={{ __html: post.htmlContent }}
          />

          <div className="mt-10 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold font-display">Próximo passo</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Valide o imóvel com premissas reais antes de avançar para proposta.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button asChild>
                <Link href={createBlogCtaUrl(post.slug, "calculator", "footer")}>
                  Calcular viabilidade agora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={createBlogCtaUrl(post.slug, "signup", "footer")}>
                  Testar o app
                </Link>
              </Button>
            </div>
          </div>
        </article>

        {relatedPosts.length > 0 ? (
          <section className="mt-16 border-t border-border pt-10">
            <h2 className="text-2xl font-semibold tracking-tight font-display">Artigos relacionados</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {relatedPosts.map((related) => (
                <article
                  key={related.slug}
                  className="rounded-xl border border-border bg-card/70 p-4"
                >
                  <p className="text-xs text-muted-foreground">{formatDate(related.publishedAt)}</p>
                  <h3 className="mt-2 font-semibold leading-snug">
                    <Link href={`/blog/${related.slug}`} className="hover:text-primary transition-colors">
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
