import { NextResponse } from "next/server";

const GO_API_BASE_URL = process.env.GO_API_BASE_URL ?? "http://localhost:8080";

export async function POST(request: Request) {
  try {
    const body = await request.text();

    const res = await fetch(`${GO_API_BASE_URL}/api/v1/webhooks/resend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "svix-id": request.headers.get("svix-id") ?? "",
        "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
        "svix-signature": request.headers.get("svix-signature") ?? "",
      },
      body,
    });

    const data = await res.json().catch(() => ({}));

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[resend/webhook] Error proxying webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
