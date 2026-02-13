import type { Metadata } from "next";

const DEFAULT_SITE_URL = "https://meuflip.com";
const DEFAULT_OG_IMAGE_PATH = "/screenshots/dashboard-new.png";

function resolveSiteUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!rawUrl) {
    return DEFAULT_SITE_URL;
  }

  try {
    const parsedUrl = new URL(rawUrl);
    parsedUrl.pathname = "";
    parsedUrl.search = "";
    parsedUrl.hash = "";
    return parsedUrl.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_SITE_URL;
  }
}

function normalizePath(path: string) {
  if (!path) {
    return "/";
  }
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return path.startsWith("/") ? path : `/${path}`;
}

export const SITE_URL = resolveSiteUrl();

export function absoluteUrl(path: string) {
  const normalizedPath = normalizePath(path);
  if (normalizedPath.startsWith("http://") || normalizedPath.startsWith("https://")) {
    return normalizedPath;
  }
  return new URL(normalizedPath, `${SITE_URL}/`).toString();
}

type BuildPublicMetadataInput = {
  title: string;
  description: string;
  path: string;
  imagePath?: string;
};

export function buildPublicMetadata({
  title,
  description,
  path,
  imagePath,
}: BuildPublicMetadataInput): Metadata {
  const canonicalUrl = absoluteUrl(path);
  const ogImageUrl = absoluteUrl(imagePath ?? DEFAULT_OG_IMAGE_PATH);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Meu Flip",
      locale: "pt_BR",
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1920,
          height: 1080,
          alt: "Meu Flip - Plataforma de House Flipping",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}
