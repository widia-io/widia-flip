#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
const BLOG_IMPORT_USER_ID = process.env.BLOG_IMPORT_USER_ID;
const CONTENT_DIR = path.join(process.cwd(), "apps", "web", "content", "blog");
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

if (!DATABASE_URL) {
  console.error("Missing required env: DATABASE_URL");
  process.exit(1);
}

if (!BLOG_IMPORT_USER_ID) {
  console.error("Missing required env: BLOG_IMPORT_USER_ID");
  process.exit(1);
}

function stripQuotes(value) {
  const raw = value.trim();
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1).trim();
  }
  return raw;
}

function parseScalar(raw) {
  const value = raw.trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((item) => stripQuotes(item));
  }
  return stripQuotes(value);
}

function parseFrontmatter(rawFile, sourcePath) {
  const normalized = rawFile.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error(`Invalid frontmatter in ${sourcePath}`);
  }

  const lines = match[1].split("\n");
  const markdown = match[2].trim();
  const frontmatter = {};

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const keyMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!keyMatch) {
      throw new Error(`Invalid frontmatter line in ${sourcePath}: ${line}`);
    }

    const key = keyMatch[1];
    const rawValue = keyMatch[2];
    if (rawValue === "") {
      const items = [];
      while (index + 1 < lines.length && /^\s*-\s+/.test(lines[index + 1])) {
        const itemLine = lines[index + 1];
        const itemMatch = itemLine.match(/^\s*-\s+(.+)$/);
        if (!itemMatch) break;
        items.push(stripQuotes(itemMatch[1]));
        index += 1;
      }
      frontmatter[key] = items;
      continue;
    }

    frontmatter[key] = parseScalar(rawValue);
  }

  return { frontmatter, markdown };
}

function normalizeDate(value, fieldName, sourcePath) {
  if (typeof value !== "string" || !DATE_ONLY_REGEX.test(value)) {
    throw new Error(`Invalid ${fieldName} in ${sourcePath}: expected YYYY-MM-DD`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName} in ${sourcePath}: ${value}`);
  }
  return date.toISOString();
}

function normalizePost(sourcePath, frontmatter, markdown) {
  const slug = String(frontmatter.slug ?? "").trim();
  const title = String(frontmatter.title ?? "").trim();
  const description = String(frontmatter.description ?? "").trim();
  const authorName = String(frontmatter.author ?? "").trim();
  const published = Boolean(frontmatter.published);
  const tags = Array.isArray(frontmatter.tags)
    ? frontmatter.tags.map((item) => String(item).trim()).filter(Boolean)
    : [];

  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`Invalid slug in ${sourcePath}`);
  }
  if (!title) throw new Error(`Missing title in ${sourcePath}`);
  if (!description) throw new Error(`Missing description in ${sourcePath}`);
  if (!markdown.trim()) throw new Error(`Missing markdown body in ${sourcePath}`);
  if (!authorName) throw new Error(`Missing author in ${sourcePath}`);

  const publishedAt = normalizeDate(frontmatter.publishedAt, "publishedAt", sourcePath);
  const updatedAt = frontmatter.updatedAt
    ? normalizeDate(frontmatter.updatedAt, "updatedAt", sourcePath)
    : publishedAt;

  return {
    slug,
    title,
    description,
    contentMd: markdown,
    excerpt: typeof frontmatter.excerpt === "string" ? frontmatter.excerpt.trim() || null : null,
    authorName,
    tags,
    coverImageUrl:
      typeof frontmatter.coverImage === "string" ? frontmatter.coverImage.trim() || null : null,
    canonicalPath:
      typeof frontmatter.canonicalPath === "string"
        ? frontmatter.canonicalPath.trim() || null
        : `/blog/${slug}`,
    seoTitle: null,
    seoDescription: null,
    status: published ? "published" : "draft",
    publishedAt: published ? publishedAt : null,
    createdAt: publishedAt,
    updatedAt,
  };
}

async function main() {
  if (!fs.existsSync(CONTENT_DIR)) {
    throw new Error(`Content directory not found: ${CONTENT_DIR}`);
  }

  const entries = fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "_template.md")
    .map((entry) => path.join(CONTENT_DIR, entry.name))
    .sort();

  if (entries.length === 0) {
    throw new Error("No markdown posts found to import");
  }

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  let inserted = 0;
  let updated = 0;

  try {
    await client.query("BEGIN");

    for (const sourcePath of entries) {
      const raw = fs.readFileSync(sourcePath, "utf8");
      const { frontmatter, markdown } = parseFrontmatter(raw, sourcePath);
      const post = normalizePost(sourcePath, frontmatter, markdown);

      const result = await client.query(
        `
          INSERT INTO flip.blog_posts (
            slug, title, description, content_md, excerpt, author_name, tags,
            cover_image_url, canonical_path, seo_title, seo_description,
            status, published_at, created_by_user_id, updated_by_user_id, created_at, updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11,
            $12, $13, $14, $15, $16, $17
          )
          ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            content_md = EXCLUDED.content_md,
            excerpt = EXCLUDED.excerpt,
            author_name = EXCLUDED.author_name,
            tags = EXCLUDED.tags,
            cover_image_url = EXCLUDED.cover_image_url,
            canonical_path = EXCLUDED.canonical_path,
            seo_title = EXCLUDED.seo_title,
            seo_description = EXCLUDED.seo_description,
            status = EXCLUDED.status,
            published_at = EXCLUDED.published_at,
            updated_by_user_id = EXCLUDED.updated_by_user_id
          RETURNING (xmax = 0) AS inserted
        `,
        [
          post.slug,
          post.title,
          post.description,
          post.contentMd,
          post.excerpt,
          post.authorName,
          post.tags,
          post.coverImageUrl,
          post.canonicalPath,
          post.seoTitle,
          post.seoDescription,
          post.status,
          post.publishedAt,
          BLOG_IMPORT_USER_ID,
          BLOG_IMPORT_USER_ID,
          post.createdAt,
          post.updatedAt,
        ],
      );

      if (result.rows[0]?.inserted) {
        inserted += 1;
      } else {
        updated += 1;
      }
    }

    await client.query("COMMIT");

    const countResult = await client.query(
      "SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'published')::int AS published FROM flip.blog_posts",
    );
    const total = countResult.rows[0]?.total ?? 0;
    const published = countResult.rows[0]?.published ?? 0;

    console.log("Blog import completed");
    console.log(`- files processed: ${entries.length}`);
    console.log(`- inserted: ${inserted}`);
    console.log(`- updated: ${updated}`);
    console.log(`- db total posts: ${total}`);
    console.log(`- db published posts: ${published}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Blog import failed:", error.message);
  process.exit(1);
});
