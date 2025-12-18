import "server-only";

import { ApiErrorSchema } from "@widia/shared";

import { getServerAccessToken } from "@/lib/serverAuth";

const GO_API_BASE_URL = process.env.GO_API_BASE_URL ?? "http://localhost:8080";

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getServerAccessToken();

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");

  const res = await fetch(`${GO_API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (res.ok) {
    return (await res.json()) as T;
  }

  const text = await res.text();
  const parsed = ApiErrorSchema.safeParse(safeJsonParse(text));
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


