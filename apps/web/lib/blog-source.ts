import "server-only";

import { marked } from "marked";

import {
  getLatestPosts as getFileLatestPosts,
  getPostBySlug as getFilePostBySlug,
  getPublishedPosts as getFilePublishedPosts,
  getRelatedPosts as getFileRelatedPosts,
  type BlogPost as FileBlogPost,
} from "@/lib/blog";
import { getDbPostBySlug, getDbPublishedPostSummaries } from "@/lib/blog-db";
import { normalizeMarkdownImageUrls } from "@/lib/markdown";

export type BlogCtaTarget = "calculator" | "signup";

export interface BlogPostSummary {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  author: string;
  tags: string[];
  coverImage?: string;
  excerpt?: string;
  canonicalPath?: string;
  readingTimeMinutes?: number;
}

export interface BlogTableOfContentsItem {
  id: string;
  title: string;
  depth: 2 | 3;
}

export interface BlogPost extends BlogPostSummary {
  markdownContent: string;
  htmlContent: string;
  toc: BlogTableOfContentsItem[];
}

type BlogSource = "file" | "db";

const DEFAULT_BLOG_SOURCE: BlogSource = "db";
const sourceEnv = process.env.BLOG_SOURCE?.trim().toLowerCase();
const BLOG_SOURCE: BlogSource =
  sourceEnv === "file" || sourceEnv === "db" ? sourceEnv : DEFAULT_BLOG_SOURCE;

marked.setOptions({
  gfm: true,
  breaks: false,
});

const TOC_DEPTHS = new Set<number>([2, 3]);
const ANCHORABLE_DEPTHS = new Set<number>([2, 3, 4]);

function normalizeDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T00:00:00.000Z`;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function sanitizeHtml(rawHtml: string): string {
  return rawHtml
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ");
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function slugifyHeading(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "secao";
}

function createStableHeadingId(base: string, usedIds: Map<string, number>): string {
  const safeBase = base || "secao";
  const current = usedIds.get(safeBase) ?? 0;
  const next = current + 1;
  usedIds.set(safeBase, next);
  return next === 1 ? safeBase : `${safeBase}-${next}`;
}

function renderMarkdown(markdownContent: string): {
  htmlContent: string;
  toc: BlogTableOfContentsItem[];
} {
  const toc: BlogTableOfContentsItem[] = [];
  const headingIdMap = new Map<string, number>();
  const renderer = new marked.Renderer();

  renderer.heading = ({ depth, text }) => {
    const inlineHtml = marked.parseInline(text) as string;
    const headingText = stripHtml(inlineHtml).replace(/\s+/g, " ").trim() || text.trim();
    const headingId = createStableHeadingId(slugifyHeading(headingText), headingIdMap);

    if (TOC_DEPTHS.has(depth)) {
      toc.push({
        id: headingId,
        title: headingText,
        depth: depth as 2 | 3,
      });
    }

    const anchorLink = ANCHORABLE_DEPTHS.has(depth)
      ? `<a class="blog-heading-anchor" href="#${headingId}" aria-label="Link para ${escapeHtmlAttribute(headingText)}">#</a>`
      : "";

    return `<h${depth} id="${headingId}">${inlineHtml}${anchorLink}</h${depth}>`;
  };

  const markdownForRender = normalizeMarkdownImageUrls(markdownContent);
  const rawHtml = marked.parse(markdownForRender, { renderer }) as string;

  return {
    htmlContent: sanitizeHtml(rawHtml),
    toc,
  };
}

function toReadingTimeMinutes(markdownContent: string): number {
  const words = markdownContent
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.round(words / 200));
}

function logDbFallback(operation: string, error: unknown): void {
  console.error(`[blog-source] ${operation} failed using DB source, falling back to file source`, error);
}

function mapFilePost(post: FileBlogPost): BlogPost {
  const rendered = renderMarkdown(post.markdownContent);
  const readingTimeMinutes = post.readingTimeMinutes ?? toReadingTimeMinutes(post.markdownContent);

  return {
    slug: post.slug,
    title: post.title,
    description: post.description,
    publishedAt: normalizeDate(post.publishedAt),
    updatedAt: post.updatedAt ? normalizeDate(post.updatedAt) : undefined,
    author: post.author,
    tags: post.tags,
    coverImage: post.coverImage,
    excerpt: post.excerpt,
    canonicalPath: post.canonicalPath,
    readingTimeMinutes,
    markdownContent: post.markdownContent,
    htmlContent: rendered.htmlContent,
    toc: rendered.toc,
  };
}

function mapFileSummary(post: FileBlogPost): BlogPostSummary {
  const mapped = mapFilePost(post);
  return {
    slug: mapped.slug,
    title: mapped.title,
    description: mapped.description,
    publishedAt: mapped.publishedAt,
    updatedAt: mapped.updatedAt,
    author: mapped.author,
    tags: mapped.tags,
    coverImage: mapped.coverImage,
    excerpt: mapped.excerpt,
    canonicalPath: mapped.canonicalPath,
    readingTimeMinutes: mapped.readingTimeMinutes,
  };
}

async function getDbSummaries(): Promise<BlogPostSummary[]> {
  const rows = await getDbPublishedPostSummaries();
  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    description: row.description,
    publishedAt: normalizeDate(row.publishedAt),
    updatedAt: row.updatedAt ? normalizeDate(row.updatedAt) : undefined,
    author: row.authorName,
    tags: row.tags,
    coverImage: row.coverImageUrl ?? undefined,
    excerpt: row.excerpt ?? undefined,
    canonicalPath: row.canonicalPath ?? undefined,
  }));
}

function summarize(post: BlogPost): BlogPostSummary {
  return {
    slug: post.slug,
    title: post.title,
    description: post.description,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    author: post.author,
    tags: post.tags,
    coverImage: post.coverImage,
    excerpt: post.excerpt,
    canonicalPath: post.canonicalPath,
    readingTimeMinutes: post.readingTimeMinutes,
  };
}

export async function getPublishedPostsSource(): Promise<BlogPostSummary[]> {
  if (BLOG_SOURCE === "file") {
    return getFilePublishedPosts().map(mapFileSummary);
  }

  try {
    return await getDbSummaries();
  } catch (error) {
    logDbFallback("getPublishedPostsSource", error);
    return getFilePublishedPosts().map(mapFileSummary);
  }
}

export async function getLatestPostsSource(limit = 3): Promise<BlogPostSummary[]> {
  const safeLimit = Math.max(1, limit);
  if (BLOG_SOURCE === "file") {
    return getFileLatestPosts(safeLimit).map(mapFileSummary);
  }

  try {
    const items = await getDbSummaries();
    return items.slice(0, safeLimit);
  } catch (error) {
    logDbFallback("getLatestPostsSource", error);
    return getFileLatestPosts(safeLimit).map(mapFileSummary);
  }
}

export async function getPostBySlugSource(slug: string): Promise<BlogPost | null> {
  if (BLOG_SOURCE === "file") {
    const post = getFilePostBySlug(slug);
    return post ? mapFilePost(post) : null;
  }

  try {
    const row = await getDbPostBySlug(slug);
    if (!row) return null;

    const markdownContent = row.contentMd;
    const rendered = renderMarkdown(markdownContent);

    return {
      slug: row.slug,
      title: row.title,
      description: row.description,
      publishedAt: normalizeDate(row.publishedAt),
      updatedAt: row.updatedAt ? normalizeDate(row.updatedAt) : undefined,
      author: row.authorName,
      tags: row.tags,
      coverImage: row.coverImageUrl ?? undefined,
      excerpt: row.excerpt ?? undefined,
      canonicalPath: row.canonicalPath ?? undefined,
      readingTimeMinutes: toReadingTimeMinutes(markdownContent),
      markdownContent,
      htmlContent: rendered.htmlContent,
      toc: rendered.toc,
    };
  } catch (error) {
    logDbFallback("getPostBySlugSource", error);
    const post = getFilePostBySlug(slug);
    return post ? mapFilePost(post) : null;
  }
}

export async function getRelatedPostsSource(
  slug: string,
  tags: string[],
  limit = 3,
): Promise<BlogPostSummary[]> {
  const safeLimit = Math.max(1, limit);
  if (BLOG_SOURCE === "file") {
    return getFileRelatedPosts(slug, tags, safeLimit).map(mapFileSummary);
  }

  try {
    const list = await getDbSummaries();
    const tagSet = new Set(tags);

    return list
      .filter((post) => post.slug !== slug)
      .map((post) => ({
        post,
        overlap: post.tags.reduce((sum, tag) => (tagSet.has(tag) ? sum + 1 : sum), 0),
      }))
      .sort((a, b) => {
        if (b.overlap !== a.overlap) return b.overlap - a.overlap;
        return new Date(b.post.publishedAt).getTime() - new Date(a.post.publishedAt).getTime();
      })
      .slice(0, safeLimit)
      .map((entry) => entry.post);
  } catch (error) {
    logDbFallback("getRelatedPostsSource", error);
    return getFileRelatedPosts(slug, tags, safeLimit).map(mapFileSummary);
  }
}

export function getBlogSourceMode(): BlogSource {
  return BLOG_SOURCE;
}

export function toBlogSummary(post: BlogPost): BlogPostSummary {
  return summarize(post);
}
