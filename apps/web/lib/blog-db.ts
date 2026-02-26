import "server-only";

import {
  ListPublicBlogPostsResponseSchema,
  PublicBlogPostDetailSchema,
  type PublicBlogPostDetail,
  type PublicBlogPostSummary,
} from "@widia/shared";

const GO_API_BASE_URL = process.env.GO_API_BASE_URL ?? "http://localhost:8080";
const DEFAULT_LIMIT = 100;
const MAX_PAGES = 20;

async function fetchBlogJson(path: string): Promise<unknown> {
  const response = await fetch(`${GO_API_BASE_URL}${path}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`BLOG_DB_FETCH_ERROR_${response.status}: ${text}`);
  }

  return response.json();
}

export async function getDbPublishedPostSummaries(): Promise<PublicBlogPostSummary[]> {
  const items: PublicBlogPostSummary[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const query = new URLSearchParams({ limit: String(DEFAULT_LIMIT) });
    if (cursor) query.set("cursor", cursor);

    const raw = await fetchBlogJson(`/api/v1/public/blog/posts?${query.toString()}`);
    const parsed = ListPublicBlogPostsResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error("BLOG_DB_PARSE_ERROR: invalid list response");
    }

    items.push(...parsed.data.items);
    cursor = parsed.data.next_cursor ?? null;

    if (!cursor) break;
  }

  return items;
}

export async function getDbPostBySlug(slug: string): Promise<PublicBlogPostDetail | null> {
  const response = await fetch(`${GO_API_BASE_URL}/api/v1/public/blog/posts/${slug}`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`BLOG_DB_FETCH_ERROR_${response.status}: ${text}`);
  }

  const raw = await response.json();
  const parsed = PublicBlogPostDetailSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("BLOG_DB_PARSE_ERROR: invalid detail response");
  }

  return parsed.data;
}
