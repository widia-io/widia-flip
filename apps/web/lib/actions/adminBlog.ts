"use server";

import { revalidatePath } from "next/cache";
import type {
  AdminBlogPost,
  CreateBlogPostRequest,
  ListAdminBlogPostsResponse,
  UpdateBlogPostRequest,
} from "@widia/shared";

import { apiFetch } from "@/lib/apiFetch";

function revalidateBlogPaths(post?: AdminBlogPost): void {
  revalidatePath("/app/admin/blog");
  revalidatePath("/blog");
  revalidatePath("/");
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap.xml");

  if (post?.id) {
    revalidatePath(`/app/admin/blog/${post.id}`);
  }

  if (post?.slug) {
    revalidatePath(`/blog/${post.slug}`);
  }
}

export async function listAdminBlogPosts(params?: {
  status?: "draft" | "published" | "archived";
  q?: string;
  limit?: number;
  cursor?: string;
}): Promise<ListAdminBlogPostsResponse> {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.q) search.set("q", params.q);
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.cursor) search.set("cursor", params.cursor);

  const query = search.toString();
  const path = query
    ? `/api/v1/admin/blog/posts?${query}`
    : "/api/v1/admin/blog/posts";

  return apiFetch<ListAdminBlogPostsResponse>(path);
}

export async function getAdminBlogPost(id: string): Promise<AdminBlogPost> {
  return apiFetch<AdminBlogPost>(`/api/v1/admin/blog/posts/${id}`);
}

export async function createAdminBlogPost(
  payload: CreateBlogPostRequest,
): Promise<AdminBlogPost> {
  const post = await apiFetch<AdminBlogPost>("/api/v1/admin/blog/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  revalidateBlogPaths(post);
  return post;
}

export async function updateAdminBlogPost(
  id: string,
  payload: UpdateBlogPostRequest,
): Promise<AdminBlogPost> {
  const post = await apiFetch<AdminBlogPost>(`/api/v1/admin/blog/posts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  revalidateBlogPaths(post);
  return post;
}

export async function publishAdminBlogPost(id: string): Promise<AdminBlogPost> {
  const post = await apiFetch<AdminBlogPost>(
    `/api/v1/admin/blog/posts/${id}/publish`,
    {
      method: "POST",
    },
  );

  revalidateBlogPaths(post);
  return post;
}

export async function unpublishAdminBlogPost(id: string): Promise<AdminBlogPost> {
  const post = await apiFetch<AdminBlogPost>(
    `/api/v1/admin/blog/posts/${id}/unpublish`,
    {
      method: "POST",
    },
  );

  revalidateBlogPaths(post);
  return post;
}

export async function archiveAdminBlogPost(id: string): Promise<AdminBlogPost> {
  const post = await apiFetch<AdminBlogPost>(
    `/api/v1/admin/blog/posts/${id}/archive`,
    {
      method: "POST",
    },
  );

  revalidateBlogPaths(post);
  return post;
}
