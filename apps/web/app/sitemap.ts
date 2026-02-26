import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";
import { getPublishedPostsSource } from "@/lib/blog-source";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const posts = await getPublishedPostsSource();
  const blogItems: MetadataRoute.Sitemap = posts.map((post) => ({
    url: absoluteUrl(post.canonicalPath ?? `/blog/${post.slug}`),
    lastModified: new Date(post.updatedAt ?? post.publishedAt),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    {
      url: absoluteUrl("/"),
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/calculator"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/ebook/acabamento-que-vende"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/terms"),
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: absoluteUrl("/privacy"),
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    ...blogItems,
  ];
}
