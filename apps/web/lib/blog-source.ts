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

export interface BlogPost extends BlogPostSummary {
  markdownContent: string;
  htmlContent: string;
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

function toReadingTimeMinutes(markdownContent: string): number {
  const words = markdownContent
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.round(words / 200));
}

function mapFilePost(post: FileBlogPost): BlogPost {
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
    readingTimeMinutes: post.readingTimeMinutes,
    markdownContent: post.markdownContent,
    htmlContent: sanitizeHtml(post.htmlContent),
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
  return getDbSummaries();
}

export async function getLatestPostsSource(limit = 3): Promise<BlogPostSummary[]> {
  const safeLimit = Math.max(1, limit);
  if (BLOG_SOURCE === "file") {
    return getFileLatestPosts(safeLimit).map(mapFileSummary);
  }

  const items = await getDbSummaries();
  return items.slice(0, safeLimit);
}

export async function getPostBySlugSource(slug: string): Promise<BlogPost | null> {
  if (BLOG_SOURCE === "file") {
    const post = getFilePostBySlug(slug);
    return post ? mapFilePost(post) : null;
  }

  const row = await getDbPostBySlug(slug);
  if (!row) return null;

  const markdownContent = row.contentMd;
  const markdownForRender = normalizeMarkdownImageUrls(markdownContent);
  const htmlContent = sanitizeHtml(marked.parse(markdownForRender) as string);

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
    htmlContent,
  };
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
}

export function getBlogSourceMode(): BlogSource {
  return BLOG_SOURCE;
}

export function toBlogSummary(post: BlogPost): BlogPostSummary {
  return summarize(post);
}
