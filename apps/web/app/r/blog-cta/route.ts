import { NextRequest, NextResponse } from "next/server";

import { EVENTS } from "@/lib/analytics";
import type { BlogCtaTarget } from "@/lib/blog-source";
import { trackServerEvent } from "@/lib/serverAnalytics";

const VALID_TARGETS: ReadonlySet<BlogCtaTarget> = new Set(["calculator", "signup"]);
const VALID_CTA_POSITIONS: ReadonlySet<string> = new Set(["hero", "mid", "footer"]);

function sanitizeSlug(rawValue: string | null): string {
  if (!rawValue) return "unknown";
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(rawValue) ? rawValue : "unknown";
}

function sanitizeCtaPosition(rawValue: string | null): string {
  if (!rawValue) return "unknown";
  return VALID_CTA_POSITIONS.has(rawValue) ? rawValue : "unknown";
}

function resolveTarget(rawValue: string | null): BlogCtaTarget | null {
  if (!rawValue) return null;
  return VALID_TARGETS.has(rawValue as BlogCtaTarget)
    ? (rawValue as BlogCtaTarget)
    : null;
}

export async function GET(request: NextRequest) {
  const target = resolveTarget(request.nextUrl.searchParams.get("to"));
  const postSlug = sanitizeSlug(request.nextUrl.searchParams.get("post"));
  const ctaPosition = sanitizeCtaPosition(request.nextUrl.searchParams.get("cta"));

  if (!target) {
    return NextResponse.redirect(new URL("/blog", request.url));
  }

  const destinationUrl =
    target === "calculator"
      ? new URL("/calculator", request.url)
      : new URL("/login", request.url);

  if (target === "signup") {
    destinationUrl.searchParams.set("tab", "signup");
  }

  destinationUrl.searchParams.set("src", "blog");
  destinationUrl.searchParams.set("post", postSlug);
  destinationUrl.searchParams.set("cta", ctaPosition);

  await trackServerEvent(request, {
    event: EVENTS.BLOG_CTA_CLICK,
    source: "blog",
    properties: {
      post_slug: postSlug,
      cta_position: ctaPosition,
      to: target,
    },
  });

  return NextResponse.redirect(destinationUrl);
}
