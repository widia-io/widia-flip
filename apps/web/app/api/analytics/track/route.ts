import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { TrackFunnelEventRequestSchema } from "@widia/shared";
import { getServerAccessToken } from "@/lib/serverAuth";

const GO_API_BASE_URL = process.env.GO_API_BASE_URL ?? "http://localhost:8080";
const WORKSPACE_COOKIE_NAME = "widia_active_workspace";

function normalizeDevice(input: unknown, userAgent: string): "mobile" | "desktop" | "tablet" | "unknown" {
  if (input === "mobile" || input === "desktop" || input === "tablet" || input === "unknown") {
    return input;
  }

  const ua = userAgent.toLowerCase();
  if (ua.includes("ipad") || ua.includes("tablet")) return "tablet";
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) return "mobile";
  if (!ua) return "unknown";
  return "desktop";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = TrackFunnelEventRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.errors[0]?.message ?? "Invalid request",
          },
        },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const workspaceId = cookieStore.get(WORKSPACE_COOKIE_NAME)?.value;
    const requestId = request.headers.get("x-request-id") || parsed.data.request_id;
    const userAgent = request.headers.get("user-agent") || "";

    const payload = {
      event: parsed.data.event,
      session_id: parsed.data.session_id,
      variant: parsed.data.variant || "control",
      source: parsed.data.source || "direct",
      device: normalizeDevice(parsed.data.device, userAgent),
      path: parsed.data.path || "/",
      request_id: requestId || undefined,
      workspace_id: parsed.data.workspace_id || workspaceId || undefined,
      occurred_at: parsed.data.occurred_at || new Date().toISOString(),
      properties: parsed.data.properties || {},
    };

    let token: string | null = null;
    try {
      token = await getServerAccessToken();
    } catch {
      token = null;
    }

    const endpoint = token ? "/api/v1/funnel-events" : "/api/v1/public/funnel-events";
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (requestId) {
      headers["X-Request-ID"] = requestId;
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      delete payload.workspace_id;
    }

    const res = await fetch(`${GO_API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[analytics/track] Go API error:", text);
      return NextResponse.json({ status: "accepted" }, { status: 202 });
    }

    return NextResponse.json({ status: "accepted" }, { status: 202 });
  } catch (error) {
    console.error("[analytics/track] Error:", error);
    return NextResponse.json({ status: "accepted" }, { status: 202 });
  }
}
