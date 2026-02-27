const IMAGE_URL_REGEX =
  /^https?:\/\/[^\s<>]+?\.(?:png|jpe?g|gif|webp|avif|svg)(?:[^\s<>]*)?$/i;

const STANDALONE_URL_LINE_REGEX = /^<?(https?:\/\/[^\s<>]+)>?$/i;
const SELF_LINKED_URL_LINE_REGEX = /^\[(https?:\/\/[^\s\]]+)\]\(\1\)$/i;

function toStandaloneUrlFromLine(trimmedLine: string): string | null {
  const directMatch = trimmedLine.match(STANDALONE_URL_LINE_REGEX);
  if (directMatch) {
    return directMatch[1];
  }

  const selfLinkedMatch = trimmedLine.match(SELF_LINKED_URL_LINE_REGEX);
  if (selfLinkedMatch) {
    return selfLinkedMatch[1];
  }

  return null;
}

/**
 * Converts standalone image URLs into Markdown image syntax so users can paste
 * an URL directly and still get an <img> render in preview/public pages.
 */
export function normalizeMarkdownImageUrls(markdown: string): string {
  if (!markdown) {
    return "";
  }

  return markdown
    .split(/\r?\n/g)
    .map((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        return line;
      }

      const url = toStandaloneUrlFromLine(trimmedLine);
      if (!url || !IMAGE_URL_REGEX.test(url)) {
        return line;
      }

      const leadingWhitespaceMatch = line.match(/^\s*/);
      const leadingWhitespace = leadingWhitespaceMatch ? leadingWhitespaceMatch[0] : "";
      return `${leadingWhitespace}![](${url})`;
    })
    .join("\n");
}
