import "server-only";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireServerSession() {
  const session = await getServerSession();
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}

export async function getServerAccessToken() {
  const { token } = await auth.api.getToken({ headers: await headers() });
  return token;
}


