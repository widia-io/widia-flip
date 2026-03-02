import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "@/lib/serverAuth";

const REQUIRED_SIGNED_QUERY_PARAMS = [
  "X-Amz-Algorithm",
  "X-Amz-Credential",
  "X-Amz-Signature",
  "X-Amz-SignedHeaders",
] as const;

function errorResponse(status: number, code: string, message: string, details?: string[]) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
      },
    },
    { status },
  );
}

function endpointHost(rawURL: string): string | null {
  const value = rawURL.trim();
  if (!value) return null;
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

function parseAllowedHosts(value: string | undefined): Set<string> {
  const hosts = new Set<string>();
  if (!value) return hosts;
  for (const chunk of value.split(",")) {
    const host = chunk.trim().toLowerCase();
    if (host) {
      hosts.add(host);
    }
  }
  return hosts;
}

function buildAllowedHosts(): Set<string> {
  const explicit = parseAllowedHosts(process.env.UPLOAD_PROXY_ALLOWED_HOSTS);
  const hosts = new Set<string>(explicit);
  const s3Endpoint = endpointHost(process.env.S3_ENDPOINT ?? "");
  const s3PublicEndpoint = endpointHost(process.env.S3_PUBLIC_ENDPOINT ?? "");
  if (s3Endpoint) hosts.add(s3Endpoint);
  if (s3PublicEndpoint) hosts.add(s3PublicEndpoint);
  return hosts;
}

function hasValidSignedParams(uploadURL: URL): boolean {
  return REQUIRED_SIGNED_QUERY_PARAMS.every((key) => {
    const value = uploadURL.searchParams.get(key);
    return typeof value === "string" && value.trim() !== "";
  });
}

function isAllowedProtocol(protocol: string): boolean {
  return protocol === "http:" || protocol === "https:";
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return errorResponse(401, "UNAUTHORIZED", "Login required");
  }

  const rawUploadURL = request.nextUrl.searchParams.get("url");
  if (!rawUploadURL) {
    return errorResponse(400, "VALIDATION_ERROR", "Missing upload URL");
  }

  let uploadURL: URL;
  try {
    uploadURL = new URL(rawUploadURL);
  } catch {
    return errorResponse(400, "VALIDATION_ERROR", "Invalid upload URL");
  }

  if (!isAllowedProtocol(uploadURL.protocol)) {
    return errorResponse(403, "FORBIDDEN", "Upload URL protocol is not allowed");
  }

  const allowedHosts = buildAllowedHosts();
  if (allowedHosts.size === 0) {
    return errorResponse(
      500,
      "SERVER_CONFIG_ERROR",
      "Upload proxy host allowlist is not configured",
      ["Set UPLOAD_PROXY_ALLOWED_HOSTS or S3_ENDPOINT/S3_PUBLIC_ENDPOINT"],
    );
  }

  const uploadHost = uploadURL.host.toLowerCase();
  if (!allowedHosts.has(uploadHost)) {
    return errorResponse(403, "FORBIDDEN", "Upload URL host is not allowed");
  }

  if (!hasValidSignedParams(uploadURL)) {
    return errorResponse(403, "FORBIDDEN", "Upload URL is missing required signed query params");
  }

  const bucket = (process.env.S3_BUCKET ?? "").trim();
  if (bucket) {
    const directPrefix = `/${bucket}/`;
    const supabasePrefix = `/storage/v1/s3/${bucket}/`;
    if (!uploadURL.pathname.startsWith(directPrefix) && !uploadURL.pathname.startsWith(supabasePrefix)) {
      return errorResponse(403, "FORBIDDEN", "Upload URL path does not match configured bucket");
    }
  }

  try {
    const contentType = request.headers.get("content-type") || "application/octet-stream";
    const body = await request.arrayBuffer();

    const response = await fetch(uploadURL.toString(), {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "x-upload-host": uploadURL.host,
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Storage upload error:", response.status, errorText);
      return errorResponse(response.status, "UPLOAD_FAILED", "Upload failed", [errorText]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Proxy upload error:", error);
    return errorResponse(
      500,
      "UPLOAD_PROXY_ERROR",
      "Upload proxy failed",
      [error instanceof Error ? error.message : "unknown_error"],
    );
  }
}
