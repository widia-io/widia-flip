import { getPublishedPosts } from "@/lib/blog";
import { absoluteUrl } from "@/lib/seo";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function GET() {
  const posts = getPublishedPosts();

  const items = posts
    .map((post) => {
      const link = absoluteUrl(post.canonicalPath ?? `/blog/${post.slug}`);
      const pubDate = new Date(`${post.publishedAt}T00:00:00.000Z`).toUTCString();
      const updatedDate = new Date(
        `${(post.updatedAt ?? post.publishedAt)}T00:00:00.000Z`,
      ).toUTCString();

      return [
        "<item>",
        `<title>${escapeXml(post.title)}</title>`,
        `<link>${escapeXml(link)}</link>`,
        `<guid>${escapeXml(link)}</guid>`,
        `<description>${escapeXml(post.description)}</description>`,
        `<author>${escapeXml(post.author)}</author>`,
        `<pubDate>${pubDate}</pubDate>`,
        `<lastBuildDate>${updatedDate}</lastBuildDate>`,
        "</item>",
      ].join("");
    })
    .join("");

  const rss = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "<channel>",
    "<title>Meu Flip Blog</title>",
    "<description>Conteúdo prático sobre viabilidade, ROI e execução de house flipping no Brasil.</description>",
    `<link>${escapeXml(absoluteUrl("/blog"))}</link>`,
    `<language>pt-BR</language>`,
    `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    items,
    "</channel>",
    "</rss>",
  ].join("");

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
