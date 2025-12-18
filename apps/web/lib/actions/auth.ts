"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export async function signInEmailAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  try {
    await auth.api.signInEmail({
      headers: await headers(),
      body: {
        email,
        password,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sign-in failed";
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  redirect("/app");
}

export async function signUpEmailAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  try {
    await auth.api.signUpEmail({
      headers: await headers(),
      body: {
        name,
        email,
        password,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sign-up failed";
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  // Depending on config, sign-up may or may not sign-in automatically.
  redirect("/login?success=account_created");
}

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}


