import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";
import { getPublishedPosts } from "@/lib/blog";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const blogItems: MetadataRoute.Sitemap = getPublishedPosts().map((post) => ({
    url: absoluteUrl(post.canonicalPath ?? `/blog/${post.slug}`),
    lastModified: new Date(
      `${(post.updatedAt ?? post.publishedAt)}T00:00:00.000Z`,
    ),
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
