"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const WORKSPACE_COOKIE_NAME = "widia_active_workspace";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Get the active workspace ID from cookies.
 * Returns null if no workspace is selected.
 */
export async function getActiveWorkspaceId(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(WORKSPACE_COOKIE_NAME)?.value;
  return value ?? null;
}

/**
 * Set the active workspace ID in a cookie.
 * This is a server action that can be called from client components.
 */
export async function setActiveWorkspaceId(workspaceId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE_NAME, workspaceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  
  // Revalidate all app pages to reflect the new workspace
  revalidatePath("/app", "layout");
}

/**
 * Get the active workspace ID, falling back to the first workspace if none selected.
 * This is useful for pages that need a workspace ID.
 */
export async function getActiveWorkspaceIdOrFirst(
  workspaceIds: string[],
): Promise<string | null> {
  const activeId = await getActiveWorkspaceId();
  
  // If we have an active workspace and it exists in the list, use it
  if (activeId && workspaceIds.includes(activeId)) {
    return activeId;
  }
  
  // Otherwise, use the first workspace and set it as active
  if (workspaceIds.length > 0) {
    await setActiveWorkspaceId(workspaceIds[0]);
    return workspaceIds[0];
  }
  
  return null;
}


