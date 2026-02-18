import { NextResponse } from "next/server";

import { SaveCalculatorRequestSchema } from "@widia/shared";
import { getServerSession, getServerAccessToken } from "@/lib/serverAuth";
import { logEvent } from "@/lib/analytics";

const GO_API_BASE_URL = process.env.GO_API_BASE_URL ?? "http://localhost:8080";

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

async function apiFetchWithToken<T>(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");

  const res = await fetch(`${GO_API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return (await res.json()) as T;
}

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Login required to save analysis",
          },
        },
        { status: 401 },
      );
    }

    const token = await getServerAccessToken();
    if (!token) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid session",
          },
        },
        { status: 401 },
      );
    }

    const body = await request.json();

    // Validate request
    const parsed = SaveCalculatorRequestSchema.safeParse(body);
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

    // Log event
    logEvent("save_clicked", { is_logged_in: true });

    const cookieHeader = request.headers.get("cookie") ?? "";
    const sessionId = getCookieValue(cookieHeader, "widia_session_id");
    const analyticsHeaders = new Headers();
    if (sessionId) {
      analyticsHeaders.set("X-Widia-Session-ID", sessionId);
    }
    analyticsHeaders.set("X-Widia-Path", "/calculator");
    analyticsHeaders.set(
      "X-Widia-Device",
      detectDeviceType(request.headers.get("user-agent") ?? ""),
    );

    // Step 1: Get user's workspace
    const workspacesRes = await apiFetchWithToken<{ items: { id: string }[] }>(
      token,
      "/api/v1/workspaces",
      {
        headers: analyticsHeaders,
      },
    );

    if (!workspacesRes.items || workspacesRes.items.length === 0) {
      // Create a workspace for the user
      const newWorkspace = await apiFetchWithToken<{ id: string }>(
        token,
        "/api/v1/workspaces",
        {
          method: "POST",
          headers: analyticsHeaders,
          body: JSON.stringify({ name: "Meu Workspace" }),
        },
      );
      workspacesRes.items = [newWorkspace];
    }

    const workspaceId = workspacesRes.items[0].id;

    // Step 2: Create property
    const property = await apiFetchWithToken<{ id: string }>(
      token,
      "/api/v1/properties",
      {
        method: "POST",
        headers: analyticsHeaders,
        body: JSON.stringify({
          workspace_id: workspaceId,
          neighborhood: parsed.data.neighborhood,
          address: parsed.data.address,
          status_pipeline: "analyzing",
        }),
      },
    );

    // Step 3: Save cash analysis inputs
    const analysisInputs: Record<string, number> = {};
    if (parsed.data.purchase_price !== undefined) {
      analysisInputs.purchase_price = parsed.data.purchase_price;
    }
    if (parsed.data.renovation_cost !== undefined) {
      analysisInputs.renovation_cost = parsed.data.renovation_cost;
    }
    if (parsed.data.other_costs !== undefined) {
      analysisInputs.other_costs = parsed.data.other_costs;
    }
    if (parsed.data.sale_price !== undefined) {
      analysisInputs.sale_price = parsed.data.sale_price;
    }

    await apiFetchWithToken(
      token,
      `/api/v1/properties/${property.id}/analysis/cash`,
      {
        method: "PUT",
        headers: analyticsHeaders,
        body: JSON.stringify(analysisInputs),
      },
    );

    // Step 4: Create snapshot
    const snapshot = await apiFetchWithToken<{ snapshot_id: string }>(
      token,
      `/api/v1/properties/${property.id}/analysis/cash/snapshot`,
      {
        method: "POST",
        headers: analyticsHeaders,
      },
    );

    // Log success
    logEvent("property_saved", {
      property_id: property.id,
      snapshot_id: snapshot.snapshot_id,
    });

    return NextResponse.json({
      property_id: property.id,
      snapshot_id: snapshot.snapshot_id,
    });
  } catch (error) {
    console.error("[calculator/save] Error:", error);
    return NextResponse.json(
      {
        error: {
          code: "SAVE_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to save analysis",
        },
      },
      { status: 500 },
    );
  }
}
