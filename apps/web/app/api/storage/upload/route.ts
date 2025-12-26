import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
  const uploadUrl = request.nextUrl.searchParams.get("url");

  if (!uploadUrl) {
    return NextResponse.json({ error: "Missing upload URL" }, { status: 400 });
  }

  console.log("Proxy upload URL:", uploadUrl);

  try {
    const contentType = request.headers.get("content-type") || "application/octet-stream";
    const body = await request.arrayBuffer();

    console.log("Proxy fetching with content-type:", contentType, "body size:", body.byteLength);

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      body: body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Storage upload error:", response.status, errorText);
      console.error("Failed URL was:", uploadUrl);
      return NextResponse.json(
        { error: `Upload failed: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Proxy upload error:", error);
    return NextResponse.json(
      { error: "Upload proxy failed" },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
