-- M15: Blog CMS Admin
-- Source of truth for public blog posts (replaces file-based runtime source)

CREATE TABLE IF NOT EXISTS flip.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content_md TEXT NOT NULL,
  excerpt TEXT,
  author_name TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  cover_image_url TEXT,
  canonical_path TEXT,
  seo_title TEXT,
  seo_description TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_by_user_id TEXT NOT NULL,
  updated_by_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (status = 'published' AND published_at IS NOT NULL) OR
    (status <> 'published')
  )
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published_at
  ON flip.blog_posts (status, published_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_blog_posts_updated_at
  ON flip.blog_posts (updated_at DESC, id DESC);

DROP TRIGGER IF EXISTS blog_posts_updated_at ON flip.blog_posts;
CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON flip.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION flip.update_updated_at_column();
