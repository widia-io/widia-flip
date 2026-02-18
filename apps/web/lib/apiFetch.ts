import "server-only";

import { headers as nextHeaders } from "next/headers";

import {
  ApiErrorSchema,
  EnforcementErrorResponseSchema,
  type EnforcementErrorResponse,
} from "@widia/shared";

import { getServerAccessToken } from "@/lib/serverAuth";

const GO_API_BASE_URL = process.env.GO_API_BASE_URL ?? "http://localhost:8080";
const ANALYTICS_SESSION_COOKIE = "widia_session_id";

function getCookieValue(cookieHeader: string, key: string): string | null {
  const parts = cookieHeader.split(";").map((part) => part.trim());
  for (const part of parts) {
    const [cookieKey, ...rest] = part.split("=");
    if (cookieKey === key) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

function detectDeviceType(userAgent: string): "mobile" | "desktop" | "tablet" | "unknown" {
  const ua = userAgent.toLowerCase();
  if (!ua) return "unknown";
  if (ua.includes("ipad") || ua.includes("tablet")) return "tablet";
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) return "mobile";
  return "desktop";
}

function getRequestPath(nextUrl: string | null, referer: string | null): string {
  if (nextUrl) {
    return nextUrl.startsWith("/") ? nextUrl : `/${nextUrl}`;
  }

  if (referer) {
    try {
      const url = new URL(referer);
      return url.pathname || "/";
    } catch {
      return "/";
    }
  }

  return "/";
}

// Custom error class for enforcement errors (M12 - Paywall)
export class EnforcementBlockedError extends Error {
  public readonly response: EnforcementErrorResponse;
  public readonly code: string;

  constructor(response: EnforcementErrorResponse) {
    super(`${response.error.code}: ${response.error.message}`);
    this.name = "EnforcementBlockedError";
    this.response = response;
    this.code = response.error.code;
  }
}

// Helper to serialize enforcement error for client
export function serializeEnforcementError(
  err: EnforcementBlockedError
): { enforcement: EnforcementErrorResponse } {
  return { enforcement: err.response };
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getServerAccessToken();

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");

  try {
    const requestHeaders = await nextHeaders();
    const cookieHeader = requestHeaders.get("cookie") ?? "";
    const sessionID =
      requestHeaders.get("x-widia-session-id") ??
      getCookieValue(cookieHeader, ANALYTICS_SESSION_COOKIE);

    if (sessionID) {
      headers.set("X-Widia-Session-ID", sessionID);
    }

    if (!headers.has("X-Widia-Path")) {
      headers.set(
        "X-Widia-Path",
        getRequestPath(requestHeaders.get("next-url"), requestHeaders.get("referer")),
      );
    }

    if (!headers.has("X-Widia-Device")) {
      headers.set(
        "X-Widia-Device",
        detectDeviceType(requestHeaders.get("user-agent") ?? ""),
      );
    }
  } catch {
    // Ignore missing request context (e.g., background jobs).
  }

  const res = await fetch(`${GO_API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (res.ok) {
    // Handle 204 No Content (e.g., DELETE responses)
    if (res.status === 204) {
      return undefined as T;
    }
    return (await res.json()) as T;
  }

  const text = await res.text();
  const json = safeJsonParse(text);

  // M12 - Check for enforcement errors (402 Payment Required)
  if (res.status === 402) {
    const enforcementParsed = EnforcementErrorResponseSchema.safeParse(json);
    if (enforcementParsed.success) {
      throw new EnforcementBlockedError(enforcementParsed.data);
    }
  }

  const parsed = ApiErrorSchema.safeParse(json);
  if (parsed.success) {
    throw new Error(`${parsed.data.error.code}: ${parsed.data.error.message}`);
  }

  throw new Error(`API_ERROR_${res.status}: ${text}`);
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

