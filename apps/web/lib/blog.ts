import fs from "fs";
import path from "path";

import { marked } from "marked";
import { normalizeMarkdownImageUrls } from "@/lib/markdown";

export type BlogCtaTarget = "calculator" | "signup";

export interface BlogPostFrontmatter {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  author: string;
  tags: string[];
  published: boolean;
  coverImage?: string;
  excerpt?: string;
  canonicalPath?: string;
}

export interface BlogPost extends BlogPostFrontmatter {
  htmlContent: string;
  markdownContent: string;
  readingTimeMinutes: number;
  sourcePath: string;
}

const DATE_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const CANDIDATE_CONTENT_DIRS = [
  path.join(process.cwd(), "content", "blog"),
  path.join(process.cwd(), "apps", "web", "content", "blog"),
];

marked.setOptions({
  gfm: true,
  breaks: false,
});

let cachedPosts: BlogPost[] | null = null;

function resolveContentDir() {
  for (const candidate of CANDIDATE_CONTENT_DIRS) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `[blog] conteúdo não encontrado. Esperado em: ${CANDIDATE_CONTENT_DIRS.join(", ")}`,
  );
}

function parseScalar(rawValue: string): string | boolean | string[] {
  const value = rawValue.trim();

  if (value === "true") return true;
  if (value === "false") return false;

  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((entry) => stripQuotes(entry.trim()));
  }

  return stripQuotes(value);
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).trim();
  }
  return value;
}

function parseFrontmatter(rawFile: string, sourcePath: string): {
  frontmatter: Record<string, unknown>;
  markdownContent: string;
} {
  const normalized = rawFile.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) {
    throw new Error(`[blog] frontmatter inválido em ${sourcePath}`);
  }

  const frontmatterRaw = match[1];
  const markdownContent = match[2].trim();
  const lines = frontmatterRaw.split("\n");
  const parsed: Record<string, unknown> = {};

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trim().startsWith("#")) {
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!keyMatch) {
      throw new Error(`[blog] linha inválida no frontmatter (${sourcePath}): ${line}`);
    }

    const key = keyMatch[1];
    const rawValue = keyMatch[2];

    if (rawValue === "") {
      const listValues: string[] = [];
      while (index + 1 < lines.length && /^\s*-\s+/.test(lines[index + 1])) {
        const listLine = lines[index + 1];
        const itemMatch = listLine.match(/^\s*-\s+(.+)$/);
        if (!itemMatch) break;

        listValues.push(stripQuotes(itemMatch[1].trim()));
        index += 1;
      }

      parsed[key] = listValues;
      continue;
    }

    parsed[key] = parseScalar(rawValue);
  }

  return { frontmatter: parsed, markdownContent };
}

function isValidDate(value: string): boolean {
  if (!DATE_ISO_REGEX.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return false;

  return date.toISOString().startsWith(value);
}

function assertString(value: unknown, field: keyof BlogPostFrontmatter, sourcePath: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`[blog] campo obrigatório inválido \"${field}\" em ${sourcePath}`);
  }
  return value.trim();
}

function assertOptionalString(
  value: unknown,
  field: keyof BlogPostFrontmatter,
  sourcePath: string,
): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new Error(`[blog] campo opcional inválido \"${field}\" em ${sourcePath}`);
  }
  return value.trim();
}

function assertTags(value: unknown, sourcePath: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`[blog] campo obrigatório inválido \"tags\" em ${sourcePath}`);
  }

  const tags = value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);

  if (tags.length === 0) {
    throw new Error(`[blog] \"tags\" deve ter ao menos 1 item em ${sourcePath}`);
  }

  return Array.from(new Set(tags));
}

function assertBoolean(value: unknown, sourcePath: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`[blog] campo obrigatório inválido \"published\" em ${sourcePath}`);
  }
  return value;
}

function toReadingTimeMinutes(markdownContent: string): number {
  const wordCount = markdownContent
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.round(wordCount / 200));
}

function extractExcerpt(markdownContent: string): string {
  const lines = markdownContent
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#") && !line.startsWith(">") && !line.startsWith("!["));

  const firstLine = lines[0] ?? "";
  const cleaned = firstLine
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .trim();

  return cleaned.slice(0, 180);
}

function normalizeFrontmatter(
  frontmatter: Record<string, unknown>,
  sourcePath: string,
): BlogPostFrontmatter {
  const slug = assertString(frontmatter.slug, "slug", sourcePath);
  const title = assertString(frontmatter.title, "title", sourcePath);
  const description = assertString(frontmatter.description, "description", sourcePath);
  const publishedAt = assertString(frontmatter.publishedAt, "publishedAt", sourcePath);
  const author = assertString(frontmatter.author, "author", sourcePath);
  const tags = assertTags(frontmatter.tags, sourcePath);
  const published = assertBoolean(frontmatter.published, sourcePath);

  const updatedAt = assertOptionalString(frontmatter.updatedAt, "updatedAt", sourcePath);
  const coverImage = assertOptionalString(frontmatter.coverImage, "coverImage", sourcePath);
  const excerpt = assertOptionalString(frontmatter.excerpt, "excerpt", sourcePath);
  const canonicalPath = assertOptionalString(frontmatter.canonicalPath, "canonicalPath", sourcePath);

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`[blog] slug inválido em ${sourcePath}: ${slug}`);
  }

  if (!isValidDate(publishedAt)) {
    throw new Error(`[blog] publishedAt inválido em ${sourcePath}: ${publishedAt}`);
  }

  if (updatedAt && !isValidDate(updatedAt)) {
    throw new Error(`[blog] updatedAt inválido em ${sourcePath}: ${updatedAt}`);
  }

  if (coverImage && !coverImage.startsWith("/")) {
    throw new Error(`[blog] coverImage deve começar com \"/\" em ${sourcePath}`);
  }

  if (canonicalPath && !canonicalPath.startsWith("/")) {
    throw new Error(`[blog] canonicalPath deve começar com \"/\" em ${sourcePath}`);
  }

  return {
    slug,
    title,
    description,
    publishedAt,
    updatedAt,
    author,
    tags,
    published,
    coverImage,
    excerpt,
    canonicalPath,
  };
}

function loadPosts(): BlogPost[] {
  if (cachedPosts) {
    return cachedPosts;
  }

  const contentDir = resolveContentDir();
  const entries = fs
    .readdirSync(contentDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"));

  const seenSlugs = new Set<string>();

  const posts = entries.map((entry) => {
    const sourcePath = path.join(contentDir, entry.name);
    const rawFile = fs.readFileSync(sourcePath, "utf8");
    const { frontmatter, markdownContent } = parseFrontmatter(rawFile, sourcePath);
    const normalized = normalizeFrontmatter(frontmatter, sourcePath);

    if (seenSlugs.has(normalized.slug)) {
      throw new Error(`[blog] slug duplicado detectado: ${normalized.slug}`);
    }
    seenSlugs.add(normalized.slug);

    return {
      ...normalized,
      excerpt: normalized.excerpt ?? extractExcerpt(markdownContent),
      markdownContent,
      htmlContent: marked.parse(normalizeMarkdownImageUrls(markdownContent)) as string,
      readingTimeMinutes: toReadingTimeMinutes(markdownContent),
      sourcePath,
    } satisfies BlogPost;
  });

  posts.sort((a, b) => {
    return (
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  });

  cachedPosts = posts;
  return posts;
}

export function getPublishedPosts(): BlogPost[] {
  return loadPosts().filter((post) => post.published);
}

export function getAllPublishedSlugs(): string[] {
  return getPublishedPosts().map((post) => post.slug);
}

export function getPostBySlug(slug: string): BlogPost | null {
  const post = loadPosts().find((entry) => entry.slug === slug);
  if (!post || !post.published) {
    return null;
  }
  return post;
}

export function getRelatedPosts(
  slug: string,
  tags: string[],
  limit = 3,
): BlogPost[] {
  const tagSet = new Set(tags);

  return getPublishedPosts()
    .filter((post) => post.slug !== slug)
    .map((post) => {
      const overlap = post.tags.reduce((count, tag) => {
        return tagSet.has(tag) ? count + 1 : count;
      }, 0);

      return { post, overlap };
    })
    .sort((a, b) => {
      if (b.overlap !== a.overlap) {
        return b.overlap - a.overlap;
      }

      return (
        new Date(b.post.publishedAt).getTime() -
        new Date(a.post.publishedAt).getTime()
      );
    })
    .slice(0, limit)
    .map((entry) => entry.post);
}

export function getLatestPosts(limit = 3): BlogPost[] {
  return getPublishedPosts().slice(0, Math.max(1, limit));
}
