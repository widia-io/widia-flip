import "server-only";

import type { NextRequest } from "next/server";

const GO_API_BASE_URL = process.env.GO_API_BASE_URL ?? "http://localhost:8080";
const SESSION_COOKIE_NAME = "widia_session_id";

type DeviceType = "mobile" | "desktop" | "tablet" | "unknown";

interface TrackServerEventOptions {
  event: string;
  properties?: Record<string, unknown>;
  token?: string | null;
  workspaceId?: string;
  source?: string;
  occurredAt?: string;
}

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

function detectDeviceType(userAgent: string): DeviceType {
  const ua = userAgent.toLowerCase();
  if (!ua) return "unknown";
  if (ua.includes("ipad") || ua.includes("tablet")) return "tablet";
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) return "mobile";
  return "desktop";
}

function getRequestPath(request: Request | NextRequest): string {
  const forwardedPath = request.headers.get("x-widia-path");
  if (forwardedPath) {
    return forwardedPath.startsWith("/") ? forwardedPath : `/${forwardedPath}`;
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const url = new URL(referer);
      return url.pathname || "/";
    } catch {
      // Fall through to request URL.
    }
  }

  try {
    const url = new URL(request.url);
    return url.pathname || "/";
  } catch {
    return "/";
  }
}

function detectSource(request: Request | NextRequest): string {
  const referer = request.headers.get("referer");
  if (!referer) return "direct";

  try {
    const ref = new URL(referer);
    const current = new URL(request.url);
    if (ref.host === current.host) return "internal";
    return ref.host.toLowerCase();
  } catch {
    return "direct";
  }
}

function resolveSessionId(request: Request | NextRequest): string | null {
  const forwarded = request.headers.get("x-widia-session-id");
  if (forwarded) return forwarded;

  const cookieHeader = request.headers.get("cookie") ?? "";
  return getCookieValue(cookieHeader, SESSION_COOKIE_NAME);
}

export function buildForwardedAnalyticsHeaders(
  request: Request | NextRequest,
  initHeaders?: HeadersInit,
): Headers {
  const headers = new Headers(initHeaders);
  const sessionId = resolveSessionId(request);
  const requestId = request.headers.get("x-request-id");

  if (sessionId && !headers.has("X-Widia-Session-ID")) {
    headers.set("X-Widia-Session-ID", sessionId);
  }
  if (!headers.has("X-Widia-Path")) {
    headers.set("X-Widia-Path", getRequestPath(request));
  }
  if (!headers.has("X-Widia-Device")) {
    headers.set("X-Widia-Device", detectDeviceType(request.headers.get("user-agent") ?? ""));
  }
  if (requestId && !headers.has("X-Request-ID")) {
    headers.set("X-Request-ID", requestId);
  }

  return headers;
}

export async function trackServerEvent(
  request: Request | NextRequest,
  options: TrackServerEventOptions,
): Promise<void> {
  const sessionId = resolveSessionId(request) ?? request.headers.get("x-request-id") ?? `srv_${Date.now()}`;
  const token = options.token ?? null;
  const endpoint = token ? "/api/v1/funnel-events" : "/api/v1/public/funnel-events";
  const headers = buildForwardedAnalyticsHeaders(request, {
    "Content-Type": "application/json",
  });

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const payload: Record<string, unknown> = {
    event: options.event,
    session_id: sessionId,
    source: options.source ?? detectSource(request),
    device: detectDeviceType(request.headers.get("user-agent") ?? ""),
    path: getRequestPath(request),
    request_id: request.headers.get("x-request-id") ?? undefined,
    occurred_at: options.occurredAt ?? new Date().toISOString(),
    properties: options.properties ?? {},
  };

  if (token && options.workspaceId) {
    payload.workspace_id = options.workspaceId;
  }

  try {
    await fetch(`${GO_API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (error) {
    console.error("[serverAnalytics] trackServerEvent error", error);
  }
}
