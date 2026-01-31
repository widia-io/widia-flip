"use client";

import DOMPurify from "dompurify";

interface CampaignPreviewProps {
  html: string;
}

export function CampaignPreview({ html }: CampaignPreviewProps) {
  // Sanitize HTML to prevent XSS - this is admin-only content but still good practice
  const sanitizedHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "b", "i", "u", "a", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "span", "div", "table", "tr", "td", "th", "thead", "tbody", "img"],
    ALLOWED_ATTR: ["href", "target", "style", "class", "src", "alt", "width", "height"],
  });

  return (
    <div
      className="prose prose-sm max-w-none rounded-lg border bg-muted/30 p-4"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
